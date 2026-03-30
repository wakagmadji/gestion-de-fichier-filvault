from fastapi import FastAPI, Depends, HTTPException, UploadFile, File as FastAPIFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil
from dotenv import load_dotenv

from database import engine, get_db, Base
import models, schemas
from auth import hash_password, verify_password, create_access_token, decode_token

load_dotenv()
Base.metadata.create_all(bind=engine)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="NadjCloud API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ── Auth dependency ───────────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expiré ou invalide")
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return current_user


# ── Helper: créer une notification ───────────────────────────────────────────
def create_notification(db: Session, user_id: str, type: str, message: str, extra: str = None):
    notif = models.Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=type,
        message=message,
        extra=extra,
    )
    db.add(notif)
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# AUTH
# ════════════════════════════════════════════════════════════════════════════
@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    token = create_access_token({"sub": user.id, "username": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ════════════════════════════════════════════════════════════════════════════
@app.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(50).all()

@app.get("/notifications/unread-count")
def get_unread_count(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    return {"count": count}

@app.put("/notifications/read-all", status_code=200)
def mark_all_read(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "Toutes les notifications marquées comme lues"}

@app.put("/notifications/{notif_id}/read", status_code=200)
def mark_one_read(notif_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    notif.is_read = True
    db.commit()
    return {"message": "Notification lue"}

@app.delete("/notifications/clear", status_code=204)
def clear_notifications(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).delete()
    db.commit()
    return None


# ════════════════════════════════════════════════════════════════════════════
# USERS
# ════════════════════════════════════════════════════════════════════════════
@app.get("/users", response_model=List[schemas.UserResponse])
def get_users(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.created_at).all()

@app.post("/users", response_model=schemas.UserResponse, status_code=201)
def create_user(data: schemas.UserCreate, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Nom d'utilisateur déjà pris")
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    new_user = models.User(
        id=str(uuid.uuid4()), username=data.username, email=data.email,
        hashed_password=hash_password(data.password), is_admin=data.is_admin
    )
    db.add(new_user); db.commit(); db.refresh(new_user)
    # 🔔 Notification pour l'admin
    create_notification(db, admin.id, "user_created",
        f"Nouvel utilisateur créé : {data.username}", data.email)
    return new_user

@app.put("/users/{user_id}/toggle", response_model=schemas.UserResponse)
def toggle_user(user_id: str, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == admin.id: raise HTTPException(status_code=400, detail="Impossible de désactiver votre compte")
    user.is_active = not user.is_active
    db.commit(); db.refresh(user)
    return user

@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == admin.id: raise HTTPException(status_code=400, detail="Impossible de supprimer votre compte")
    db.delete(user); db.commit()
    return None


# ════════════════════════════════════════════════════════════════════════════
# FOLDERS
# ════════════════════════════════════════════════════════════════════════════
@app.get("/folders", response_model=List[schemas.FolderResponse])
def get_folders(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Folder).filter(
        models.Folder.owner_id == current_user.id
    ).order_by(models.Folder.created_at).all()

@app.post("/folders", response_model=schemas.FolderResponse, status_code=201)
def create_folder(folder: schemas.FolderCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_folder = models.Folder(
        id=str(uuid.uuid4()), name=folder.name,
        parent_id=folder.parent_id, owner_id=current_user.id
    )
    db.add(new_folder); db.commit(); db.refresh(new_folder)
    # 🔔 Notification
    create_notification(db, current_user.id, "folder_created",
        f"Dossier « {folder.name} » créé avec succès", folder.name)
    return new_folder

@app.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(models.Folder).filter(
        models.Folder.id == folder_id,
        models.Folder.owner_id == current_user.id
    ).first()
    if not folder: raise HTTPException(status_code=404, detail="Dossier introuvable")
    folder_name = folder.name
    def delete_recursive(fid: str):
        for f in db.query(models.File).filter(models.File.folder_id == fid).all():
            path = os.path.join(UPLOAD_DIR, f.storage_path)
            if os.path.exists(path): os.remove(path)
            db.delete(f)
        for sf in db.query(models.Folder).filter(models.Folder.parent_id == fid).all():
            delete_recursive(sf.id); db.delete(sf)
    delete_recursive(folder_id)
    db.query(models.Share).filter(models.Share.item_id == folder_id).delete()
    db.delete(folder); db.commit()
    return None


# ════════════════════════════════════════════════════════════════════════════
# FILES
# ════════════════════════════════════════════════════════════════════════════
@app.get("/files", response_model=List[schemas.FileResponse])
def get_files(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.File).filter(
        models.File.owner_id == current_user.id
    ).order_by(models.File.created_at.desc()).all()

@app.post("/files/upload", response_model=schemas.FileResponse, status_code=201)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    folder_id: str = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = file.filename.split(".")[-1] if "." in file.filename else "txt"
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    size = os.path.getsize(file_path)
    new_file = models.File(
        id=str(uuid.uuid4()), name=file.filename, ext=ext,
        size=size, storage_path=unique_name,
        folder_id=folder_id if folder_id else None,
        owner_id=current_user.id
    )
    db.add(new_file); db.commit(); db.refresh(new_file)
    # 🔔 Notification
    size_str = f"{size/1024/1024:.1f} MB" if size > 1024*1024 else f"{size/1024:.1f} KB"
    create_notification(db, current_user.id, "file_uploaded",
        f"Fichier « {file.filename} » téléversé ({size_str})", file.filename)
    return new_file

@app.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    file = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.owner_id == current_user.id
    ).first()
    if not file: raise HTTPException(status_code=404, detail="Fichier introuvable")
    file_name = file.name
    path = os.path.join(UPLOAD_DIR, file.storage_path)
    if os.path.exists(path): os.remove(path)
    db.query(models.Share).filter(models.Share.item_id == file_id).delete()
    db.delete(file); db.commit()
    # 🔔 Notification
    create_notification(db, current_user.id, "file_deleted",
        f"Fichier « {file_name} » supprimé", file_name)
    return None


# ════════════════════════════════════════════════════════════════════════════
# SHARES
# ════════════════════════════════════════════════════════════════════════════
@app.get("/shares/with-me", response_model=List[schemas.ShareResponse])
def get_shared_with_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    shares = db.query(models.Share).filter(
        models.Share.shared_with_id == current_user.id
    ).order_by(models.Share.created_at.desc()).all()
    result = []
    for s in shares:
        owner = db.query(models.User).filter(models.User.id == s.owner_id).first()
        item_name = None
        if s.item_type == "file":
            item = db.query(models.File).filter(models.File.id == s.item_id).first()
            if item: item_name = item.name
        else:
            item = db.query(models.Folder).filter(models.Folder.id == s.item_id).first()
            if item: item_name = item.name
        result.append(schemas.ShareResponse(
            id=s.id, item_type=s.item_type, item_id=s.item_id,
            owner_id=s.owner_id, shared_with_id=s.shared_with_id,
            created_at=s.created_at, item_name=item_name,
            owner_username=owner.username if owner else None,
        ))
    return result

@app.get("/shares/by-me", response_model=List[schemas.ShareResponse])
def get_shared_by_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    shares = db.query(models.Share).filter(
        models.Share.owner_id == current_user.id
    ).order_by(models.Share.created_at.desc()).all()
    result = []
    for s in shares:
        shared_with = db.query(models.User).filter(models.User.id == s.shared_with_id).first()
        item_name = None
        if s.item_type == "file":
            item = db.query(models.File).filter(models.File.id == s.item_id).first()
            if item: item_name = item.name
        else:
            item = db.query(models.Folder).filter(models.Folder.id == s.item_id).first()
            if item: item_name = item.name
        result.append(schemas.ShareResponse(
            id=s.id, item_type=s.item_type, item_id=s.item_id,
            owner_id=s.owner_id, shared_with_id=s.shared_with_id,
            created_at=s.created_at, item_name=item_name,
            shared_with_username=shared_with.username if shared_with else None,
        ))
    return result

@app.post("/shares", response_model=schemas.ShareResponse, status_code=201)
def create_share(data: schemas.ShareCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.item_type == "file":
        item = db.query(models.File).filter(models.File.id == data.item_id, models.File.owner_id == current_user.id).first()
    else:
        item = db.query(models.Folder).filter(models.Folder.id == data.item_id, models.Folder.owner_id == current_user.id).first()
    if not item: raise HTTPException(status_code=404, detail="Élément introuvable ou non autorisé")
    target = db.query(models.User).filter(models.User.id == data.shared_with_id).first()
    if not target: raise HTTPException(status_code=404, detail="Utilisateur cible introuvable")
    if data.shared_with_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas partager avec vous-même")
    existing = db.query(models.Share).filter(
        models.Share.item_id == data.item_id,
        models.Share.shared_with_id == data.shared_with_id,
    ).first()
    if existing: raise HTTPException(status_code=400, detail="Déjà partagé avec cet utilisateur")

    share = models.Share(
        id=str(uuid.uuid4()), item_type=data.item_type,
        item_id=data.item_id, owner_id=current_user.id,
        shared_with_id=data.shared_with_id
    )
    db.add(share); db.commit(); db.refresh(share)

    # 🔔 Notification pour le destinataire
    type_label = "fichier" if data.item_type == "file" else "dossier"
    create_notification(db, data.shared_with_id, "file_shared",
        f"{current_user.username} a partagé un {type_label} avec vous : « {item.name} »",
        f"{current_user.username}|{item.name}")

    return schemas.ShareResponse(
        id=share.id, item_type=share.item_type, item_id=share.item_id,
        owner_id=share.owner_id, shared_with_id=share.shared_with_id,
        created_at=share.created_at, item_name=item.name,
        shared_with_username=target.username,
    )

@app.delete("/shares/{share_id}", status_code=204)
def delete_share(share_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    share = db.query(models.Share).filter(
        models.Share.id == share_id,
        models.Share.owner_id == current_user.id
    ).first()
    if not share: raise HTTPException(status_code=404, detail="Partage introuvable")
    db.delete(share); db.commit()
    return None


# ── Télécharger un fichier partagé ───────────────────────────────────────────
@app.get("/shared-file/{file_id}")
def get_shared_file(file_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    file = db.query(models.File).filter(models.File.id == file_id).first()
    if not file: raise HTTPException(status_code=404, detail="Fichier introuvable")
    direct = db.query(models.Share).filter(
        models.Share.item_id == file_id,
        models.Share.shared_with_id == current_user.id,
        models.Share.item_type == "file",
    ).first()
    if direct: return {"storage_path": file.storage_path, "name": file.name}
    def is_in_shared_folder(folder_id: str) -> bool:
        if not folder_id: return False
        shared = db.query(models.Share).filter(
            models.Share.item_id == folder_id,
            models.Share.shared_with_id == current_user.id,
            models.Share.item_type == "folder",
        ).first()
        if shared: return True
        parent = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
        if parent and parent.parent_id: return is_in_shared_folder(parent.parent_id)
        return False
    if file.folder_id and is_in_shared_folder(file.folder_id):
        return {"storage_path": file.storage_path, "name": file.name}
    raise HTTPException(status_code=403, detail="Accès non autorisé")

@app.get("/shared-folder/{folder_id}/contents")
def get_shared_folder_contents(folder_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    def has_access(fid: str) -> bool:
        direct = db.query(models.Share).filter(
            models.Share.item_id == fid,
            models.Share.shared_with_id == current_user.id,
            models.Share.item_type == "folder",
        ).first()
        if direct: return True
        parent = db.query(models.Folder).filter(models.Folder.id == fid).first()
        if parent and parent.parent_id: return has_access(parent.parent_id)
        return False
    if not has_access(folder_id): raise HTTPException(status_code=403, detail="Accès non autorisé")
    subfolders = db.query(models.Folder).filter(models.Folder.parent_id == folder_id).all()
    files = db.query(models.File).filter(models.File.folder_id == folder_id).all()
    return {
        "folders": [{"id":f.id,"name":f.name,"parent_id":f.parent_id,"owner_id":f.owner_id,"created_at":f.created_at} for f in subfolders],
        "files": [{"id":f.id,"name":f.name,"ext":f.ext,"size":f.size,"storage_path":f.storage_path,"folder_id":f.folder_id,"owner_id":f.owner_id,"created_at":f.created_at} for f in files],
    }

@app.get("/shared-folder/{folder_id}")
def get_shared_folder(folder_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    def has_access(fid: str) -> bool:
        direct = db.query(models.Share).filter(
            models.Share.item_id == fid,
            models.Share.shared_with_id == current_user.id,
            models.Share.item_type == "folder",
        ).first()
        if direct: return True
        parent = db.query(models.Folder).filter(models.Folder.id == fid).first()
        if parent and parent.parent_id: return has_access(parent.parent_id)
        return False
    if not has_access(folder_id): raise HTTPException(status_code=403, detail="Accès non autorisé")
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Dossier introuvable")
    owner = db.query(models.User).filter(models.User.id == folder.owner_id).first()
    return {"id":folder.id,"name":folder.name,"parent_id":folder.parent_id,"owner_id":folder.owner_id,"owner_username":owner.username if owner else None,"created_at":folder.created_at}


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "NadjCloud API v3.0 🚀"}
