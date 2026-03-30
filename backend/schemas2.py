from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

# ── User ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    is_admin: bool = False

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ── Folder ────────────────────────────────────────────────────────────────────
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None

class FolderResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str]
    owner_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# ── File ──────────────────────────────────────────────────────────────────────
class FileResponse(BaseModel):
    id: str
    name: str
    ext: Optional[str]
    size: int
    storage_path: str
    folder_id: Optional[str]
    owner_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# ── Share ─────────────────────────────────────────────────────────────────────
class ShareCreate(BaseModel):
    item_type: Literal["file", "folder"]
    item_id: str
    shared_with_id: str

class ShareResponse(BaseModel):
    id: str
    item_type: str
    item_id: str
    owner_id: str
    shared_with_id: str
    created_at: datetime
    item_name: Optional[str] = None
    owner_username: Optional[str] = None
    shared_with_username: Optional[str] = None
    class Config:
        from_attributes = True

# ── Notification ──────────────────────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    message: str
    extra: Optional[str]
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True
