/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard, FolderOpen, Folder, FileText, Trash2, Settings, User, Users,
  Upload, Plus, Download, Search, ChevronRight, ChevronDown, Menu, X,
  File, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet,
  HardDrive, Database, Server, CheckCircle, AlertCircle, Home, LogOut,
  Eye, EyeOff, Shield, UserPlus, ToggleLeft, ToggleRight, Lock,
  Share2, UserCheck, Link2, Unlink
} from "lucide-react";

const API = "http://192.168.43.183:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
type FileItem = { id:string; name:string; type:"file"; ext:string; size:string; storage_path:string; modified:string; parentId:string|null; owner_id:string; };
type FolderItem = { id:string; name:string; type:"folder"; parentId:string|null; isOpen:boolean; owner_id:string; };
type Item = FileItem | FolderItem;
type UserType = { id:string; username:string; email:string; is_admin:boolean; is_active:boolean; created_at:string; };
type ShareItem = { id:string; item_type:"file"|"folder"; item_id:string; owner_id:string; shared_with_id:string; created_at:string; item_name?:string; owner_username?:string; shared_with_username?:string; };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFileIcon = (ext?: string, size=16) => {
  const e = ext?.toLowerCase() ?? "";
  if (["png","jpg","jpeg","gif","webp"].includes(e)) return <FileImage size={size} style={{color:"#a78bfa"}}/>;
  if (["mp4","mov","avi","mkv"].includes(e)) return <FileVideo size={size} style={{color:"#f87171"}}/>;
  if (["mp3","wav","ogg"].includes(e)) return <FileAudio size={size} style={{color:"#34d399"}}/>;
  if (["zip","rar","tar","gz"].includes(e)) return <FileArchive size={size} style={{color:"#fb923c"}}/>;
  if (["js","ts","jsx","tsx","py","json","html","css"].includes(e)) return <FileCode size={size} style={{color:"#5b9cf6"}}/>;
  if (["xls","xlsx","csv"].includes(e)) return <FileSpreadsheet size={size} style={{color:"#34d399"}}/>;
  if (["pdf","doc","docx","txt"].includes(e)) return <FileText size={size} style={{color:"#fbbf24"}}/>;
  return <File size={size} style={{color:"var(--muted)"}}/>;
};

const formatSize = (b:number) => b<1024?`${b} B`:b<1024*1024?`${(b/1024).toFixed(1)} KB`:`${(b/1024/1024).toFixed(1)} MB`;
const formatDate = (iso:string) => new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
const getToken = () => localStorage.getItem("nadjcloud_token");
const setToken = (t:string) => localStorage.setItem("nadjcloud_token",t);
const removeToken = () => localStorage.removeItem("nadjcloud_token");

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({title,onClose,onConfirm,confirmLabel="Confirmer",confirmDanger=false,children}:{
  title:string;onClose:()=>void;onConfirm:()=>void;confirmLabel?:string;confirmDanger?:boolean;children:React.ReactNode;
}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(10,10,20,0.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:"16px"}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"24px",width:"100%",maxWidth:460,boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h3 style={{fontSize:17,color:"var(--text)",fontFamily:"var(--font-display)",fontWeight:700}}>{title}</h3>
        <button className="icon-btn" onClick={onClose}><X size={16}/></button>
      </div>
      {children}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24}}>
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
        <button className={confirmDanger?"btn-danger":"btn-primary"} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

const StatCard = ({icon,label,value,color}:{icon:React.ReactNode;label:string;value:string|number;color:string}) => (
  <div className="stat-card" style={{"--accent":color} as any}>
    <div className="stat-icon">{icon}</div>
    <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const LoginPage = ({onLogin}:{onLogin:(user:UserType)=>void}) => {
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [showPwd,setShowPwd] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const handleLogin = async(e:React.FormEvent) => {
    e.preventDefault();
    if(!username||!password){setError("Remplissez tous les champs");return;}
    setLoading(true);setError("");
    try {
      const res=await fetch(`${API}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
      if(!res.ok){const d=await res.json();setError(d.detail||"Identifiants incorrects");setLoading(false);return;}
      const d=await res.json();
      setToken(d.access_token);
      onLogin(d.user);
    } catch { setError("Impossible de contacter le serveur"); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,var(--accent),var(--accent2))",marginBottom:14}}>
            <Lock size={24} color="#fff"/>
          </div>
          <div style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-0.5}}>NadjCloud</div>
          <div style={{color:"var(--muted)",fontSize:13,marginTop:6}}>Connectez-vous pour accéder à votre espace</div>
        </div>
        <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:28,boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:600,color:"var(--muted)",letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:8}}>Nom d'utilisateur</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",display:"flex"}}><User size={15}/></span>
                <input type="text" placeholder="Votre identifiant..." value={username} onChange={e=>setUsername(e.target.value)}
                  style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:9,color:"var(--text)",fontFamily:"var(--font-body)",fontSize:14,padding:"11px 14px 11px 38px",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,fontWeight:600,color:"var(--muted)",letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:8}}>Mot de passe</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",display:"flex"}}><Lock size={15}/></span>
                <input type={showPwd?"text":"password"} placeholder="Votre mot de passe..." value={password} onChange={e=>setPassword(e.target.value)}
                  style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:9,color:"var(--text)",fontFamily:"var(--font-body)",fontSize:14,padding:"11px 40px 11px 38px",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
                <button type="button" style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex",padding:4}} onClick={()=>setShowPwd(!showPwd)}>
                  {showPwd?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
            </div>
            {error&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,fontSize:13,color:"#f87171"}}><AlertCircle size={14}/>{error}</div>}
            <button type="submit" disabled={loading}
              style={{width:"100%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",color:"#fff",border:"none",borderRadius:9,padding:"12px",fontFamily:"var(--font-body)",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?<><div className="spinner" style={{width:16,height:16,borderWidth:2}}/>Connexion...</>:<><CheckCircle size={16}/>Se connecter</>}
            </button>
          </form>
        </div>
        <div style={{textAlign:"center",marginTop:20,color:"var(--muted)",fontSize:12}}>Contactez l'administrateur pour obtenir un accès</div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SHARED SECTION — Parcourir les dossiers partagés
// ════════════════════════════════════════════════════════════════════════════
const SharedSection = ({ sharedWithMe, apiFetch, formatDate, formatSize, getFileIcon }: {
  sharedWithMe: ShareItem[];
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response | null>;
  formatDate: (iso: string) => string;
  formatSize: (b: number) => string;
  getFileIcon: (ext?: string, size?: number) => React.ReactNode;
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [folderContents, setFolderContents] = useState<{ folders: any[]; files: any[] } | null>(null);
  const [loadingFolder, setLoadingFolder] = useState(false);

  const openFolder = async (folderId: string, folderName: string) => {
    setLoadingFolder(true);
    const res = await apiFetch(`/shared-folder/${folderId}/contents`);
    if (res && res.ok) {
      const data = await res.json();
      setFolderContents(data);
      setCurrentFolderId(folderId);
      setBreadcrumb(prev => [...prev, { id: folderId, name: folderName }]);
    }
    setLoadingFolder(false);
  };

  const navigateToBreadcrumb = async (idx: number) => {
    if (idx === -1) {
      // Retour à la liste des partages
      setCurrentFolderId(null);
      setFolderContents(null);
      setBreadcrumb([]);
      return;
    }
    const target = breadcrumb[idx];
    const newTrail = breadcrumb.slice(0, idx + 1);
    setBreadcrumb(newTrail);
    setLoadingFolder(true);
    const res = await apiFetch(`/shared-folder/${target.id}/contents`);
    if (res && res.ok) {
      setFolderContents(await res.json());
      setCurrentFolderId(target.id);
    }
    setLoadingFolder(false);
  };

  const downloadSharedFile = async (fileId: string) => {
    const res = await apiFetch(`/shared-file/${fileId}`);
    if (res && res.ok) {
      const d = await res.json();
      window.open(`${API}/uploads/${d.storage_path}`, "_blank");
    }
  };

  // Vue liste des partages
  if (!currentFolderId) {
    return (
      <div>
        <div className="section-title"><Share2 size={14} />Partagés avec moi<span className="section-badge">{sharedWithMe.length}</span></div>
        {sharedWithMe.length > 0 ? (
          sharedWithMe.map(s => (
            <div key={s.id} className="shared-card"
              style={{ cursor: s.item_type === "folder" ? "pointer" : "default" }}
              onClick={() => { if (s.item_type === "folder") openFolder(s.item_id, s.item_name || "Dossier"); }}>
              <div className="file-icon-box" style={{ width: 42, height: 42 }}>
                {s.item_type === "folder" ? <Folder size={20} style={{ color: "#fbbf24" }} /> : getFileIcon(undefined, 20)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.item_name || "Sans nom"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <UserCheck size={11} /> Partagé par <strong style={{ color: "var(--text)" }}>{s.owner_username}</strong>
                  <span style={{ opacity: .4 }}>·</span>{formatDate(s.created_at)}
                </div>
              </div>
              <span style={{ background: s.item_type === "file" ? "rgba(91,156,246,.15)" : "rgba(251,191,36,.15)", color: s.item_type === "file" ? "var(--accent)" : "#fbbf24", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, flexShrink: 0 }}>
                {s.item_type === "file" ? "📄 Fichier" : "📂 Dossier"}
              </span>
              {s.item_type === "file" && (
                <button className="btn-icon" title="Télécharger" onClick={e => { e.stopPropagation(); downloadSharedFile(s.item_id); }}><Download size={15} /></button>
              )}
              {s.item_type === "folder" && <ChevronRight size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />}
            </div>
          ))
        ) : (
          <div className="empty-state"><div className="empty-icon"><Share2 size={48} /></div><div style={{ fontWeight: 600 }}>Rien de partagé avec vous</div><p style={{ fontSize: 13, marginTop: 4 }}>Les fichiers et dossiers partagés apparaîtront ici</p></div>
        )}
      </div>
    );
  }

  // Vue contenu d'un dossier partagé
  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: 20 }}>
        <span className="breadcrumb-item" onClick={() => navigateToBreadcrumb(-1)}><Share2 size={12} /><span>Partagés</span></span>
        {breadcrumb.map((b, idx) => (
          <span key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronRight size={11} style={{ opacity: .4 }} />
            <span className="breadcrumb-item" onClick={() => navigateToBreadcrumb(idx)} style={idx === breadcrumb.length - 1 ? { color: "var(--text)" } : {}}>{b.name}</span>
          </span>
        ))}
      </div>

      {loadingFolder ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" style={{ width: 30, height: 30 }} /></div>
      ) : folderContents ? (
        <>
          {/* Sous-dossiers */}
          {folderContents.folders.length > 0 && (
            <>
              <div className="section-title"><Folder size={14} />Sous-dossiers<span className="section-badge">{folderContents.folders.length}</span></div>
              <div className="folders-grid" style={{ marginBottom: 20 }}>
                {folderContents.folders.map((f: any) => (
                  <div key={f.id} className="folder-card" onClick={() => openFolder(f.id, f.name)}>
                    <div className="folder-icon-wrap"><Folder size={20} style={{ color: "#fbbf24" }} /></div>
                    <div className="folder-name">{f.name}</div>
                    <div className="folder-count" style={{ display: "flex", alignItems: "center", gap: 4 }}><ChevronRight size={10} />Ouvrir</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fichiers */}
          <div className="section-title"><FileText size={14} />Fichiers<span className="section-badge">{folderContents.files.length}</span></div>
          {folderContents.files.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="table-wrap files-table">
                <table>
                  <thead><tr><th>Nom</th><th className="col-type">Type</th><th>Taille</th><th className="col-date">Ajouté</th><th>Actions</th></tr></thead>
                  <tbody>
                    {folderContents.files.map((f: any) => (
                      <tr key={f.id}>
                        <td><div className="file-name-cell"><div className="file-icon-box">{getFileIcon(f.ext)}</div><span style={{ fontWeight: 500 }}>{f.name}</span></div></td>
                        <td className="col-type"><span className="ext-badge">{f.ext}</span></td>
                        <td style={{ color: "var(--muted)" }}>{formatSize(f.size)}</td>
                        <td className="col-date" style={{ color: "var(--muted)" }}>{formatDate(f.created_at)}</td>
                        <td><button className="btn-icon" title="Télécharger" onClick={() => downloadSharedFile(f.id)}><Download size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="file-cards">
                {folderContents.files.map((f: any) => (
                  <div key={f.id} className="file-card">
                    <div className="file-icon-box" style={{ width: 40, height: 40 }}>{getFileIcon(f.ext, 18)}</div>
                    <div className="file-card-info">
                      <div className="file-card-name">{f.name}</div>
                      <div className="file-card-meta"><span>{formatSize(f.size)}</span><span>·</span><span>{formatDate(f.created_at)}</span></div>
                    </div>
                    <button className="btn-icon" onClick={() => downloadSharedFile(f.id)}><Download size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div className="empty-icon"><FileText size={36} /></div><p>Ce dossier est vide</p></div>
          )}
        </>
      ) : null}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser,setCurrentUser] = useState<UserType|null>(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [items,setItems] = useState<Item[]>([]);
  const [users,setUsers] = useState<UserType[]>([]);
  const [sharedWithMe,setSharedWithMe] = useState<ShareItem[]>([]);
  const [sharedByMe,setSharedByMe] = useState<ShareItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [uploading,setUploading] = useState(false);
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [modal,setModal] = useState<null|{type:string;targetId?:string|null;targetType?:"file"|"folder"}>(null);
  const [inputVal,setInputVal] = useState("");
  const [searchQuery,setSearchQuery] = useState("");
  const [section,setSection] = useState<string>("dashboard");
  const [toast,setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const [pendingFile,setPendingFile] = useState<File|null>(null);
  const [dragOver,setDragOver] = useState(false);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [newUserForm,setNewUserForm] = useState({username:"",email:"",password:"",is_admin:false});
  const [showNewUserPwd,setShowNewUserPwd] = useState(false);
  const [shareTargetUserId,setShareTargetUserId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3500);};

  // ── Auth headers ──
  const authH = ()=>({
    "Content-Type":"application/json",
    "Authorization":`Bearer ${getToken()}`
  });

  const apiFetch = useCallback(async(url:string,opts:RequestInit={})=>{
    const res=await fetch(`${API}${url}`,{...opts,headers:{...authH(),...(opts.headers as any||{})}});
    if(res.status===401){handleLogout();return null;}
    return res;
  },[]);

  // ── Check token on mount ──
  useEffect(()=>{
    const token=getToken();
    if(!token){setAuthLoading(false);return;}
    fetch(`${API}/auth/me`,{headers:{"Authorization":`Bearer ${token}`}})
      .then(r=>r.ok?r.json():null)
      .then(u=>{if(u)setCurrentUser(u);else removeToken();})
      .catch(()=>removeToken())
      .finally(()=>setAuthLoading(false));
  },[]);

  const handleLogin=(user:UserType)=>setCurrentUser(user);
  const handleLogout=()=>{removeToken();setCurrentUser(null);setItems([]);setUsers([]);setSharedWithMe([]);setSharedByMe([]);setSection("dashboard");};

  // ── Load all data ──
  const loadData=async()=>{
    setLoading(true);
    try {
      const [fr,fir,swr,sbr,ur]=await Promise.all([
        apiFetch("/folders"),apiFetch("/files"),
        apiFetch("/shares/with-me"),apiFetch("/shares/by-me"),
        apiFetch("/users"),
      ]);
      if(fr&&fir){
        const fd=await fr.json(); const fid=await fir.json();
        setItems([
          ...fd.map((f:any)=>({id:f.id,name:f.name,type:"folder",parentId:f.parent_id??null,isOpen:false,owner_id:f.owner_id})),
          ...fid.map((f:any)=>({id:f.id,name:f.name,type:"file",ext:f.ext??f.name.split(".").pop()??"txt",size:formatSize(f.size??0),storage_path:f.storage_path,modified:formatDate(f.created_at),parentId:f.folder_id??null,owner_id:f.owner_id})),
        ]);
      }
      if(swr){setSharedWithMe(await swr.json());}
      if(sbr){setSharedByMe(await sbr.json());}
      if(ur){setUsers(await ur.json());}
    } catch{showToast("Erreur de chargement",false);}
    setLoading(false);
  };

  useEffect(()=>{if(currentUser)loadData();},[currentUser]);

  const files=useMemo(()=>items.filter(i=>i.type==="file") as FileItem[],[items]);
  const folders=useMemo(()=>items.filter(i=>i.type==="folder") as FolderItem[],[items]);
  const getChildren=useCallback((pid:string|null)=>items.filter(i=>i.parentId===pid),[items]);
  const toggleFolder=(id:string)=>setItems(p=>p.map(i=>i.id===id&&i.type==="folder"?{...i,isOpen:!(i as FolderItem).isOpen}:i));
  const openModal=(type:string,targetId:string|null=null,targetType?:"file"|"folder")=>{setInputVal("");setPendingFile(null);setShareTargetUserId("");setNewUserForm({username:"",email:"",password:"",is_admin:false});setModal({type,targetId,targetType});};
  const closeModal=()=>{setModal(null);setPendingFile(null);};

  // ── CRUD ──
  const createFolder=async()=>{
    const name=inputVal.trim()||"Nouveau dossier";
    const res=await apiFetch("/folders",{method:"POST",body:JSON.stringify({name,parent_id:selectedId})});
    if(!res||!res.ok){showToast("Erreur création dossier",false);return;}
    const d=await res.json();
    setItems(p=>[...p,{id:d.id,name:d.name,type:"folder",parentId:d.parent_id??null,isOpen:false,owner_id:d.owner_id}]);
    showToast(`Dossier "${name}" créé ✓`);
  };

  const uploadFile=async()=>{
    if(!pendingFile){showToast("Aucun fichier sélectionné",false);return;}
    setUploading(true);
    const fd=new FormData();fd.append("file",pendingFile);
    const url=selectedId?`/files/upload?folder_id=${selectedId}`:`/files/upload`;
    const res=await fetch(`${API}${url}`,{method:"POST",body:fd,headers:{"Authorization":`Bearer ${getToken()}`}});
    if(!res.ok){showToast("Erreur upload",false);setUploading(false);return;}
    const d=await res.json();
    setItems(p=>[...p,{id:d.id,name:d.name,type:"file",ext:d.ext??d.name.split(".").pop()??"txt",size:formatSize(d.size),storage_path:d.storage_path,modified:formatDate(d.created_at),parentId:d.folder_id??null,owner_id:d.owner_id}]);
    showToast(`"${pendingFile.name}" téléversé ✓`);
    setUploading(false);
  };

  const deleteFolder=async(id:string)=>{
    const res=await apiFetch(`/folders/${id}`,{method:"DELETE"});
    if(!res||!res.ok){showToast("Erreur suppression",false);return;}
    await loadData();if(selectedId===id)setSelectedId(null);showToast("Dossier supprimé");
  };

  const deleteFile=async(id:string)=>{
    const res=await apiFetch(`/files/${id}`,{method:"DELETE"});
    if(!res||!res.ok){showToast("Erreur suppression",false);return;}
    setItems(p=>p.filter(i=>i.id!==id));showToast("Fichier supprimé");
  };

  const downloadFile=(file:FileItem)=>window.open(`${API}/uploads/${file.storage_path}`,"_blank");

  // ── Share ──
  const createShare=async()=>{
    if(!modal?.targetId||!shareTargetUserId){showToast("Sélectionnez un utilisateur",false);return;}
    const res=await apiFetch("/shares",{method:"POST",body:JSON.stringify({
      item_type:modal.targetType,item_id:modal.targetId,shared_with_id:shareTargetUserId
    })});
    if(!res||!res.ok){const d=await res?.json();showToast(d?.detail||"Erreur partage",false);return;}
    const d=await res.json();
    setSharedByMe(p=>[d,...p]);
    showToast(`Partagé avec ${users.find(u=>u.id===shareTargetUserId)?.username} ✓`);
  };

  const deleteShare=async(id:string)=>{
    const res=await apiFetch(`/shares/${id}`,{method:"DELETE"});
    if(!res||!res.ok){showToast("Erreur suppression partage",false);return;}
    setSharedByMe(p=>p.filter(s=>s.id!==id));
    showToast("Partage supprimé");
  };

  // ── Users ──
  const createUser=async()=>{
    if(!newUserForm.username||!newUserForm.email||!newUserForm.password){showToast("Remplissez tous les champs",false);return;}
    const res=await apiFetch("/users",{method:"POST",body:JSON.stringify(newUserForm)});
    if(!res||!res.ok){const d=await res?.json();showToast(d?.detail||"Erreur création",false);return;}
    const d=await res.json();setUsers(p=>[...p,d]);showToast(`Utilisateur "${newUserForm.username}" créé ✓`);
  };

  const toggleUser=async(id:string)=>{
    const res=await apiFetch(`/users/${id}/toggle`,{method:"PUT"});
    if(!res||!res.ok){showToast("Erreur",false);return;}
    const d=await res.json();setUsers(p=>p.map(u=>u.id===id?d:u));
    showToast(d.is_active?"Compte activé":"Compte désactivé");
  };

  const deleteUser=async(id:string)=>{
    const res=await apiFetch(`/users/${id}`,{method:"DELETE"});
    if(!res||!res.ok){showToast("Erreur suppression",false);return;}
    setUsers(p=>p.filter(u=>u.id!==id));showToast("Utilisateur supprimé");
  };

  const confirmModal=async()=>{
    if(!modal)return;closeModal();
    if(modal.type==="newFolder") await createFolder();
    else if(modal.type==="uploadFile") await uploadFile();
    else if(modal.type==="deleteFolder"&&modal.targetId) await deleteFolder(modal.targetId);
    else if(modal.type==="deleteFile"&&modal.targetId) await deleteFile(modal.targetId);
    else if(modal.type==="shareItem") await createShare();
    else if(modal.type==="newUser") await createUser();
    else if(modal.type==="deleteUser"&&modal.targetId) await deleteUser(modal.targetId);
  };

  const displayFiles=useMemo(()=>{
    let l=files;
    if(selectedId){const s=items.find(i=>i.id===selectedId);if(s?.type==="folder")l=files.filter(f=>f.parentId===selectedId);}
    if(searchQuery)l=l.filter(f=>f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return l;
  },[files,selectedId,searchQuery,items]);

  const displayFolders=useMemo(()=>{
    let l=folders;
    if(selectedId){const s=items.find(i=>i.id===selectedId);if(s?.type==="folder")l=folders.filter(f=>f.parentId===selectedId);}
    return l;
  },[folders,selectedId,items]);

  const totalSize=useMemo(()=>files.reduce((a,f)=>a+parseFloat(f.size),0).toFixed(1),[files]);
  const navigate=(s:string)=>{setSection(s);setSidebarOpen(false);};

  const TreeNode=({item,depth=0}:{item:Item;depth?:number})=>{
    const ch=getChildren(item.id);const isF=item.type==="folder";
    return (
      <div>
        <div className={`tree-node ${selectedId===item.id?"tree-selected":""}`} style={{paddingLeft:10+depth*14}}
          onClick={()=>{setSelectedId(item.id);if(isF)toggleFolder(item.id);}}>
          <span style={{display:"flex",alignItems:"center",color:"var(--muted)",flexShrink:0}}>
            {isF?((item as FolderItem).isOpen?<ChevronDown size={12}/>:<ChevronRight size={12}/>):<span style={{width:12}}/>}
          </span>
          <span style={{marginRight:5,display:"flex",alignItems:"center"}}>{isF?<Folder size={14} style={{color:"#fbbf24"}}/>:getFileIcon((item as FileItem).ext)}</span>
          <span className="tree-label">{item.name}</span>
          <div className="tree-actions">
            <button className="icon-btn" title="Partager" onClick={e=>{e.stopPropagation();openModal("shareItem",item.id,isF?"folder":"file");}}>
              <Share2 size={11}/>
            </button>
            <button className="icon-btn" onClick={e=>{e.stopPropagation();openModal(isF?"deleteFolder":"deleteFile",item.id);}}>
              <Trash2 size={11}/>
            </button>
          </div>
        </div>
        {isF&&(item as FolderItem).isOpen&&ch.map(c=><TreeNode key={c.id} item={c} depth={depth+1}/>)}
      </div>
    );
  };

  const NAV=[
    {id:"dashboard",icon:<LayoutDashboard size={18}/>,label:"Dashboard"},
    {id:"files",icon:<FolderOpen size={18}/>,label:"Mes Fichiers"},
    {id:"shared",icon:<Share2 size={18}/>,label:"Partagés"},
    ...(currentUser?.is_admin?[{id:"users",icon:<Users size={18}/>,label:"Utilisateurs"}]:[]),
    {id:"profile",icon:<User size={18}/>,label:"Profil"},
    {id:"settings",icon:<Settings size={18}/>,label:"Paramètres"},
  ];

  const SidebarContent=()=>(
    <>
      <div className="sidebar-logo">
        <div className="logo-dot"/><span>NadjCloud</span>
        {currentUser?.is_admin&&<span className="admin-pill"><Shield size={9}/>Admin</span>}
      </div>
      <nav className="sidebar-nav">
        {[
          {id:"dashboard",icon:<LayoutDashboard size={16}/>,label:"Dashboard"},
          {id:"files",icon:<FolderOpen size={16}/>,label:"Mes Fichiers",badge:files.length},
          {id:"shared",icon:<Share2 size={16}/>,label:"Partagés avec moi",badge:sharedWithMe.length},
          ...(currentUser?.is_admin?[{id:"users",icon:<Users size={16}/>,label:"Utilisateurs",badge:users.length}]:[]),
          {id:"trash",icon:<Trash2 size={16}/>,label:"Corbeille"},
        ].map((n:any)=>(
          <button key={n.id} className={`nav-item ${section===n.id?"active":""}`} onClick={()=>navigate(n.id)}>
            <span className="nav-icon">{n.icon}</span>{n.label}
            {n.badge!==undefined&&n.badge>0&&<span className="nav-badge">{n.badge}</span>}
          </button>
        ))}
      </nav>
      {section==="files"&&(
        <div className="sidebar-files">
          <div className="sidebar-section-title">Mes dossiers</div>
          {loading?<div style={{display:"flex",justifyContent:"center",padding:20}}><div className="spinner"/></div>
           :getChildren(null).length===0?<div style={{padding:"10px 12px",color:"var(--muted)",fontSize:12}}>Aucun élément</div>
           :getChildren(null).map(item=><TreeNode key={item.id} item={item} depth={0}/>)}
        </div>
      )}
      {section==="files"&&(
        <div className="sidebar-add-btns">
          <button className="btn-secondary" style={{flex:1,justifyContent:"center",fontSize:12,gap:5}} onClick={()=>openModal("newFolder")}><Plus size={13}/>Dossier</button>
          <button className="btn-secondary" style={{flex:1,justifyContent:"center",fontSize:12,gap:5}} onClick={()=>openModal("uploadFile")}><Upload size={13}/>Fichier</button>
        </div>
      )}
      <div className="sidebar-bottom">
        {[{id:"profile",icon:<User size={16}/>,label:"Mon Profil"},{id:"settings",icon:<Settings size={16}/>,label:"Paramètres"}].map(n=>(
          <button key={n.id} className={`nav-item ${section===n.id?"active":""}`} onClick={()=>navigate(n.id)}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </button>
        ))}
        <div className="user-card" style={{marginTop:8}}>
          <div className="avatar">{currentUser?.username[0].toUpperCase()}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="user-name">{currentUser?.username}</div>
            <div className="user-role">{currentUser?.is_admin?"Administrateur":"Utilisateur"}</div>
          </div>
          <button className="icon-btn" title="Déconnexion" onClick={handleLogout}><LogOut size={14}/></button>
        </div>
      </div>
    </>
  );

  if(authLoading) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400&display=swap');*{box-sizing:border-box;margin:0;padding:0}:root{--bg:#0d0f14;--text:#e8eaf0;--muted:#7a7f96;--font-display:'Syne',sans-serif;--font-body:'DM Sans',sans-serif}body{background:var(--bg);color:var(--text);font-family:var(--font-body)}@keyframes spin{to{transform:rotate(360deg)}}.spinner{border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}`}</style>
      <div style={{textAlign:"center"}}>
        <div className="spinner" style={{width:36,height:36,margin:"0 auto 16px"}}/>
        <div style={{color:"var(--muted)",fontSize:13}}>Chargement de NadjCloud...</div>
      </div>
    </div>
  );

  if(!currentUser) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}:root{--bg:#0d0f14;--card:#181b24;--card2:#1e2230;--border:rgba(255,255,255,0.07);--text:#e8eaf0;--muted:#7a7f96;--accent:#5b9cf6;--accent2:#a78bfa;--green:#34d399;--font-display:'Syne',sans-serif;--font-body:'DM Sans',sans-serif}body{background:var(--bg);color:var(--text);font-family:var(--font-body)}@keyframes spin{to{transform:rotate(360deg)}}.spinner{border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}`}</style>
      <LoginPage onLogin={handleLogin}/>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0d0f14;--sidebar:#12151c;--card:#181b24;--card2:#1e2230;--border:rgba(255,255,255,0.07);--text:#e8eaf0;--muted:#7a7f96;--accent:#5b9cf6;--accent2:#a78bfa;--green:#34d399;--orange:#fb923c;--font-display:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;--bottom-nav:62px}
        body{background:var(--bg);color:var(--text);font-family:var(--font-body)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        .layout{display:flex;height:100vh;overflow:hidden}
        .sidebar{width:256px;flex-shrink:0;background:var(--sidebar);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
        .sidebar-logo{padding:18px 18px 14px;font-family:var(--font-display);font-size:17px;font-weight:800;letter-spacing:-0.5px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--border)}
        .logo-dot{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));flex-shrink:0}
        .admin-pill{margin-left:auto;font-size:9px;background:rgba(167,139,250,.15);color:var(--accent2);padding:2px 7px;border-radius:99px;font-family:var(--font-body);font-weight:700;display:flex;align-items:center;gap:3px}
        .sidebar-nav{display:flex;flex-direction:column;gap:2px;padding:10px 8px;border-bottom:1px solid var(--border)}
        .nav-item{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:var(--muted);transition:all .15s;background:none;border:none;width:100%;text-align:left}
        .nav-item:hover{color:var(--text);background:rgba(255,255,255,.05)}
        .nav-item.active{color:var(--text);background:rgba(91,156,246,.15)}
        .nav-item.active .nav-icon{color:var(--accent)}
        .nav-icon{display:flex;align-items:center;flex-shrink:0}
        .nav-badge{margin-left:auto;background:var(--accent);color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px}
        .sidebar-files{flex:1;overflow-y:auto;padding:8px 6px}
        .sidebar-files::-webkit-scrollbar{width:3px}
        .sidebar-files::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
        .sidebar-section-title{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);padding:8px 11px 4px}
        .tree-node{display:flex;align-items:center;padding:5px 8px;border-radius:7px;cursor:pointer;font-size:12px;transition:background .12s;gap:3px}
        .tree-node:hover{background:rgba(255,255,255,.05)}
        .tree-node:hover .tree-actions{opacity:1}
        .tree-selected{background:rgba(91,156,246,.15)!important;color:var(--accent)}
        .tree-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .tree-actions{opacity:0;transition:opacity .1s;display:flex;gap:2px}
        .icon-btn{background:none;border:none;cursor:pointer;padding:4px;border-radius:5px;color:var(--muted);display:flex;align-items:center;justify-content:center;transition:color .1s,background .1s}
        .icon-btn:hover{color:var(--text);background:rgba(255,255,255,.1)}
        .sidebar-add-btns{display:flex;gap:6px;padding:10px;border-top:1px solid var(--border)}
        .sidebar-bottom{border-top:1px solid var(--border);padding:10px}
        .user-card{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px}
        .avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
        .user-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .user-role{font-size:11px;color:var(--muted)}
        .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
        .topbar{display:flex;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);gap:12px;flex-shrink:0}
        .page-title{font-family:var(--font-display);font-size:18px;font-weight:700;flex:1;white-space:nowrap}
        .search-wrap{position:relative;flex:1;max-width:320px}
        .search-icon-wrap{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);display:flex}
        .search-input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:var(--font-body);font-size:13px;padding:8px 12px 8px 34px;outline:none;transition:border .15s}
        .search-input:focus{border-color:var(--accent)}
        .search-input::placeholder{color:var(--muted)}
        .content{flex:1;overflow-y:auto;padding:20px}
        .content::-webkit-scrollbar{width:5px}
        .content::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}
        .stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px;transition:transform .15s,border-color .15s;animation:fadeIn .3s ease both}
        .stat-card:hover{transform:translateY(-2px);border-color:var(--accent)}
        .stat-icon{width:42px;height:42px;border-radius:10px;background:color-mix(in srgb,var(--accent) 15%,transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent)}
        .stat-value{font-family:var(--font-display);font-size:22px;font-weight:700}
        .stat-label{font-size:11px;color:var(--muted);margin-top:2px}
        .section-title{font-family:var(--font-display);font-size:14px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .section-badge{background:var(--card2);color:var(--muted);font-family:var(--font-body);font-size:10px;font-weight:500;padding:2px 7px;border-radius:99px}
        .recent-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}
        .recent-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px}
        .activity-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px}
        .activity-item:last-child{border-bottom:none}
        .table-wrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;position:relative}
        .table-toolbar{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);gap:10px;flex-wrap:wrap}
        table{width:100%;border-collapse:collapse}
        thead tr{border-bottom:1px solid var(--border)}
        th{text-align:left;padding:9px 14px;font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)}
        td{padding:11px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:middle}
        tbody tr{transition:background .1s}
        tbody tr:hover{background:rgba(255,255,255,.03)}
        tbody tr:last-child td{border-bottom:none}
        .file-name-cell{display:flex;align-items:center;gap:9px}
        .file-icon-box{width:30px;height:30px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ext-badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;background:var(--card2);color:var(--muted)}
        .folders-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px}
        .folder-card{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:14px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:7px;position:relative}
        .folder-card:hover{border-color:var(--accent2);transform:translateY(-2px)}
        .folder-card.sel{border-color:var(--accent);background:rgba(91,156,246,.08)}
        .folder-icon-wrap{width:40px;height:40px;border-radius:10px;background:rgba(251,191,36,.1);display:flex;align-items:center;justify-content:center}
        .folder-name{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .folder-count{font-size:10px;color:var(--muted)}
        .folder-actions{position:absolute;top:7px;right:7px;opacity:0;transition:opacity .1s;display:flex;gap:3px}
        .folder-card:hover .folder-actions{opacity:1}
        .file-cards{display:none;flex-direction:column;gap:8px}
        .file-card{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:13px;display:flex;align-items:center;gap:11px}
        .file-card-info{flex:1;min-width:0}
        .file-card-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .file-card-meta{font-size:11px;color:var(--muted);margin-top:3px;display:flex;align-items:center;gap:6px}
        .shared-card{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:14px;display:flex;align-items:center;gap:12px;margin-bottom:8px;transition:border-color .15s}
        .shared-card:hover{border-color:var(--accent2)}
        .btn-primary{background:var(--accent);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-family:var(--font-body);font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s,transform .1s;display:flex;align-items:center;gap:6px;white-space:nowrap}
        .btn-primary:hover{opacity:.85}
        .btn-primary:active{transform:scale(.97)}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-secondary{background:var(--card2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-family:var(--font-body);font-size:13px;font-weight:500;cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:6px;white-space:nowrap}
        .btn-secondary:hover{background:rgba(255,255,255,.08)}
        .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-family:var(--font-body);font-size:13px;cursor:pointer;transition:color .15s}
        .btn-ghost:hover{color:var(--text)}
        .btn-danger{background:rgba(239,68,68,.2);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:8px 14px;font-family:var(--font-body);font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px}
        .btn-danger:hover{background:rgba(239,68,68,.3)}
        .btn-icon{background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:7px 9px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text);transition:background .15s}
        .btn-icon:hover{background:rgba(255,255,255,.08)}
        input[type=text],input[type=email],input[type=password]{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-body);font-size:14px;padding:10px 14px;outline:none;transition:border .15s}
        input[type=text]:focus,input[type=email]:focus,input[type=password]:focus{border-color:var(--accent)}
        input[type=text]::placeholder,input[type=email]::placeholder,input[type=password]::placeholder{color:var(--muted)}
        select{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font-body);font-size:14px;padding:10px 14px;outline:none;transition:border .15s;cursor:pointer}
        select:focus{border-color:var(--accent)}
        .upload-zone{border:2px dashed var(--border);border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;user-select:none}
        .upload-zone:hover,.upload-zone.drag{border-color:var(--accent);background:rgba(91,156,246,.06)}
        .upload-zone.has-file{border-color:var(--green);background:rgba(52,211,153,.06)}
        .empty-state{text-align:center;padding:50px 20px;color:var(--muted)}
        .empty-icon{margin-bottom:12px;opacity:.4;display:flex;justify-content:center}
        .breadcrumb{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);margin-bottom:16px;flex-wrap:wrap}
        .breadcrumb-item{cursor:pointer;transition:color .1s;display:flex;align-items:center;gap:4px}
        .breadcrumb-item:hover{color:var(--text)}
        .settings-section{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px}
        .settings-row{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;gap:12px}
        .settings-row:last-child{border-bottom:none}
        .settings-label{font-weight:500}
        .settings-sub{font-size:11px;color:var(--muted);margin-top:2px}
        .toggle{width:38px;height:20px;background:var(--accent);border-radius:99px;position:relative;cursor:pointer;flex-shrink:0}
        .toggle::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s}
        .toggle.off{background:var(--card2)}
        .toggle.off::after{left:calc(100% - 17px)}
        .profile-header{display:flex;align-items:center;gap:16px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
        .avatar-lg{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;font-family:var(--font-display);flex-shrink:0}
        .spinner{border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        .loading-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(13,15,20,.7);z-index:10;border-radius:12px}
        .toast{position:fixed;bottom:80px;right:16px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:11px 16px;font-size:13px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:slideIn .2s ease;z-index:1000}
        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:var(--bottom-nav);background:var(--sidebar);border-top:1px solid var(--border);z-index:100;align-items:stretch}
        .bottom-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;font-size:9px;color:var(--muted);border:none;background:none;padding:6px 2px;transition:color .15s}
        .bottom-nav-item.active{color:var(--accent)}
        .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200}
        .sidebar-mobile{position:fixed;top:0;left:0;bottom:0;width:280px;background:var(--sidebar);z-index:201;display:flex;flex-direction:column;overflow:hidden}
        .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:var(--text);align-items:center;justify-content:center}
        .hamburger:hover{background:rgba(255,255,255,.08)}
        .form-group{margin-bottom:14px}
        .form-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;display:block;margin-bottom:7px}
        .checkbox-row{display:flex;align-items:center;gap:10px;padding:10px 0;font-size:13px;cursor:pointer}
        .checkbox-row input{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}
        .user-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .1s}
        .user-row:last-child{border-bottom:none}
        .user-row:hover{background:rgba(255,255,255,.02)}
        @media (max-width:1024px){.stats-grid{grid-template-columns:repeat(2,1fr)}.recent-grid{grid-template-columns:1fr}}
        @media (max-width:768px){
          .sidebar{display:none}.hamburger{display:flex}.bottom-nav{display:flex}
          .content{padding:14px;padding-bottom:calc(var(--bottom-nav) + 14px)}
          .topbar{padding:10px 14px}.page-title{font-size:15px}.search-wrap{max-width:none}
          .stats-grid{grid-template-columns:repeat(2,1fr);gap:10px}.stat-card{padding:12px}.stat-value{font-size:18px}
          .recent-grid{grid-template-columns:1fr}.files-table{display:none}.file-cards{display:flex}
          .col-type,.col-date{display:none}.topbar-actions{display:none}
          .toast{bottom:calc(var(--bottom-nav) + 10px);right:12px;left:12px}
          .mobile-add-btns{display:flex!important}
        }
        @media (min-width:769px){.mobile-add-btns{display:none!important}}
        @media (max-width:480px){.stats-grid{grid-template-columns:1fr 1fr}.profile-header{flex-direction:column;text-align:center}}
      `}</style>

      <div className="layout">
        <aside className="sidebar"><SidebarContent/></aside>
        {sidebarOpen&&(
          <div className="sidebar-overlay" style={{display:"block"}} onClick={()=>setSidebarOpen(false)}>
            <div className="sidebar-mobile" onClick={e=>e.stopPropagation()}><SidebarContent/></div>
          </div>
        )}

        <main className="main">
          <header className="topbar">
            <button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button>
            <div className="page-title">{{dashboard:"Dashboard",files:"Mes Fichiers",shared:"Partagés avec moi",users:"Utilisateurs",profile:"Profil",settings:"Paramètres",trash:"Corbeille"}[section]||section}</div>
            <div className="search-wrap">
              <span className="search-icon-wrap"><Search size={14}/></span>
              <input className="search-input" placeholder="Rechercher..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
            </div>
            {section==="files"&&(
              <div className="topbar-actions" style={{display:"flex",gap:8}}>
                <button className="btn-secondary" onClick={()=>openModal("newFolder")}><Plus size={14}/>Dossier</button>
                <button className="btn-primary" onClick={()=>openModal("uploadFile")}><Upload size={14}/>Téléverser</button>
              </div>
            )}
            {section==="users"&&currentUser?.is_admin&&(
              <div className="topbar-actions" style={{display:"flex",gap:8}}>
                <button className="btn-primary" onClick={()=>openModal("newUser")}><UserPlus size={14}/>Nouvel utilisateur</button>
              </div>
            )}
          </header>

          <div className="content">

            {/* Dashboard */}
            {section==="dashboard"&&(<>
              <div className="stats-grid">
                <StatCard icon={<FileText size={20}/>} label="Mes fichiers" value={files.length} color="var(--accent)"/>
                <StatCard icon={<Folder size={20}/>} label="Mes dossiers" value={folders.length} color="var(--accent2)"/>
                <StatCard icon={<Share2 size={20}/>} label="Partagés avec moi" value={sharedWithMe.length} color="var(--green)"/>
                <StatCard icon={<Link2 size={20}/>} label="Mes partages" value={sharedByMe.length} color="var(--orange)"/>
              </div>
              <div className="recent-grid">
                <div className="recent-card">
                  <div className="section-title"><FileText size={14}/>Fichiers récents<span className="section-badge">{files.slice(0,5).length}</span></div>
                  {files.slice(0,5).map(f=>(
                    <div className="activity-item" key={f.id}>
                      <div className="file-icon-box">{getFileIcon(f.ext)}</div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={{color:"var(--muted)",fontSize:11}}>{f.size}</div></div>
                      <span style={{color:"var(--muted)",fontSize:11,flexShrink:0}}>{f.modified}</span>
                    </div>
                  ))}
                  {files.length===0&&!loading&&<div className="empty-state" style={{padding:"20px 0"}}><div className="empty-icon"><FileText size={32}/></div><p>Aucun fichier</p></div>}
                </div>
                <div className="recent-card">
                  <div className="section-title"><Share2 size={14}/>Partagés avec moi<span className="section-badge">{sharedWithMe.length}</span></div>
                  {sharedWithMe.slice(0,5).map(s=>(
                    <div className="activity-item" key={s.id}>
                      <div className="file-icon-box">{s.item_type==="folder"?<Folder size={15} style={{color:"#fbbf24"}}/>:<FileText size={15} style={{color:"var(--muted)"}}/>}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.item_name||"Sans nom"}</div>
                        <div style={{color:"var(--muted)",fontSize:11,display:"flex",alignItems:"center",gap:4}}><UserCheck size={10}/>par {s.owner_username}</div>
                      </div>
                      <span style={{background:"rgba(52,211,153,.15)",color:"var(--green)",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99}}>{s.item_type==="file"?"Fichier":"Dossier"}</span>
                    </div>
                  ))}
                  {sharedWithMe.length===0&&<div className="empty-state" style={{padding:"20px 0"}}><div className="empty-icon"><Share2 size={32}/></div><p>Rien de partagé</p></div>}
                </div>
              </div>
            </>)}

            {/* Mes Fichiers */}
            {section==="files"&&(<>
              <div className="mobile-add-btns" style={{gap:8,marginBottom:14}}>
                <button className="btn-secondary" style={{flex:1,justifyContent:"center"}} onClick={()=>openModal("newFolder")}><Plus size={14}/>Dossier</button>
                <button className="btn-primary" style={{flex:1,justifyContent:"center"}} onClick={()=>openModal("uploadFile")}><Upload size={14}/>Fichier</button>
              </div>
              <div className="breadcrumb">
                <span className="breadcrumb-item" onClick={()=>setSelectedId(null)}><Home size={12}/><span>Accueil</span></span>
                {selectedId&&(()=>{
                  const sel=items.find(i=>i.id===selectedId);if(!sel)return null;
                  const trail:Item[]=[sel];let cur=sel.parentId;
                  while(cur){const p=items.find(i=>i.id===cur);if(!p)break;trail.unshift(p);cur=p.parentId;}
                  return trail.map((t,idx)=>(
                    <span key={t.id} style={{display:"flex",alignItems:"center",gap:4}}>
                      <ChevronRight size={11} style={{opacity:.4}}/>
                      <span className="breadcrumb-item" onClick={()=>setSelectedId(t.id)} style={idx===trail.length-1?{color:"var(--text)"}:{}}>{t.name}</span>
                    </span>
                  ));
                })()}
              </div>
              {displayFolders.length>0&&(<>
                <div className="section-title"><Folder size={14}/>Sous-dossiers<span className="section-badge">{displayFolders.length}</span></div>
                <div className="folders-grid">
                  {displayFolders.map(f=>(
                    <div key={f.id} className={`folder-card ${selectedId===f.id?"sel":""}`} onClick={()=>{setSelectedId(f.id);toggleFolder(f.id);}}>
                      <div className="folder-icon-wrap"><Folder size={20} style={{color:"#fbbf24"}}/></div>
                      <div className="folder-name">{f.name}</div>
                      <div className="folder-count">{items.filter(i=>i.parentId===f.id).length} élément(s)</div>
                      <div className="folder-actions">
                        <button className="icon-btn" title="Partager" onClick={e=>{e.stopPropagation();openModal("shareItem",f.id,"folder");}}><Share2 size={11}/></button>
                        <button className="icon-btn" title="Supprimer" onClick={e=>{e.stopPropagation();openModal("deleteFolder",f.id);}}><Trash2 size={11}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </>)}
              <div className="table-wrap files-table">
                {loading&&<div className="loading-overlay"><div className="spinner" style={{width:30,height:30}}/></div>}
                <div className="table-toolbar">
                  <div className="section-title" style={{marginBottom:0}}><FileText size={14}/>Fichiers<span className="section-badge">{displayFiles.length}</span></div>
                </div>
                {displayFiles.length>0?(
                  <table>
                    <thead><tr><th>Nom</th><th className="col-type">Type</th><th>Taille</th><th className="col-date">Modifié</th><th>Actions</th></tr></thead>
                    <tbody>
                      {displayFiles.map(f=>(
                        <tr key={f.id}>
                          <td><div className="file-name-cell"><div className="file-icon-box">{getFileIcon(f.ext)}</div><span style={{fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{f.name}</span></div></td>
                          <td className="col-type"><span className="ext-badge">{f.ext}</span></td>
                          <td style={{color:"var(--muted)"}}>{f.size}</td>
                          <td className="col-date" style={{color:"var(--muted)"}}>{f.modified}</td>
                          <td><div style={{display:"flex",gap:6}}>
                            <button className="btn-icon" title="Partager" onClick={()=>openModal("shareItem",f.id,"file")}><Share2 size={14}/></button>
                            <button className="btn-icon" title="Télécharger" onClick={()=>downloadFile(f)}><Download size={14}/></button>
                            <button className="btn-icon" title="Supprimer" style={{color:"#f87171"}} onClick={()=>openModal("deleteFile",f.id)}><Trash2 size={14}/></button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ):!loading?(<div className="empty-state"><div className="empty-icon"><FileText size={40}/></div><div style={{fontWeight:600}}>Aucun fichier</div><p style={{fontSize:13,marginTop:4}}>Téléversez un fichier pour commencer</p></div>):null}
              </div>
              <div className="file-cards">
                {displayFiles.length>0?displayFiles.map(f=>(
                  <div key={f.id} className="file-card">
                    <div className="file-icon-box" style={{width:40,height:40}}>{getFileIcon(f.ext,18)}</div>
                    <div className="file-card-info"><div className="file-card-name">{f.name}</div><div className="file-card-meta"><span>{f.size}</span><span>·</span><span>{f.modified}</span></div></div>
                    <button className="btn-icon" onClick={()=>openModal("shareItem",f.id,"file")}><Share2 size={14}/></button>
                    <button className="btn-icon" onClick={()=>downloadFile(f)}><Download size={14}/></button>
                    <button className="btn-icon" style={{color:"#f87171"}} onClick={()=>openModal("deleteFile",f.id)}><Trash2 size={14}/></button>
                  </div>
                )):(
                  <div className="empty-state"><div className="empty-icon"><FileText size={40}/></div><div style={{fontWeight:600}}>Aucun fichier</div></div>
                )}
              </div>

              {/* Mes partages */}
              {sharedByMe.length>0&&(
                <div style={{marginTop:24}}>
                  <div className="section-title"><Link2 size={14}/>Mes partages actifs<span className="section-badge">{sharedByMe.length}</span></div>
                  <div className="table-wrap">
                    {sharedByMe.map(s=>(
                      <div key={s.id} className="shared-card">
                        <div className="file-icon-box">{s.item_type==="folder"?<Folder size={15} style={{color:"#fbbf24"}}/>:<FileText size={15} style={{color:"var(--muted)"}}/>}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.item_name||"Sans nom"}</div>
                          <div style={{fontSize:11,color:"var(--muted)",marginTop:2,display:"flex",alignItems:"center",gap:4}}><UserCheck size={10}/>Partagé avec <strong style={{color:"var(--text)"}}>{s.shared_with_username}</strong></div>
                        </div>
                        <span style={{background:"rgba(91,156,246,.15)",color:"var(--accent)",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99,marginRight:8}}>{s.item_type==="file"?"Fichier":"Dossier"}</span>
                        <button className="btn-icon" title="Révoquer" style={{color:"#f87171"}} onClick={()=>deleteShare(s.id)}><Unlink size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>)}

            {/* Partagés avec moi */}
            {section==="shared"&&(
              <SharedSection
                sharedWithMe={sharedWithMe}
                apiFetch={apiFetch}
                formatDate={formatDate}
                formatSize={formatSize}
                getFileIcon={getFileIcon}
              />
            )}

            {/* Users */}
            {section==="users"&&currentUser?.is_admin&&(
              <div className="table-wrap">
                <div className="table-toolbar">
                  <div className="section-title" style={{marginBottom:0}}><Users size={14}/>Utilisateurs<span className="section-badge">{users.length}</span></div>
                  <button className="btn-primary" onClick={()=>openModal("newUser")}><UserPlus size={14}/>Nouvel utilisateur</button>
                </div>
                {users.map(u=>(
                  <div key={u.id} className="user-row">
                    <div style={{width:36,height:36,borderRadius:"50%",background:u.is_admin?"linear-gradient(135deg,var(--accent2),var(--accent))":"var(--card2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontWeight:600,fontSize:13}}>{u.username}</span>
                        {u.is_admin&&<span style={{background:"rgba(167,139,250,.15)",color:"var(--accent2)",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99,display:"flex",alignItems:"center",gap:3}}><Shield size={8}/>Admin</span>}
                        {!u.is_active&&<span style={{background:"rgba(239,68,68,.15)",color:"#f87171",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99}}>Inactif</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{u.email}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn-icon" onClick={()=>toggleUser(u.id)}>
                        {u.is_active?<ToggleRight size={16} style={{color:"var(--green)"}}/>:<ToggleLeft size={16} style={{color:"var(--muted)"}}/>}
                      </button>
                      {u.id!==currentUser.id&&<button className="btn-icon" style={{color:"#f87171"}} onClick={()=>openModal("deleteUser",u.id)}><Trash2 size={14}/></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Profile */}
            {section==="profile"&&(<>
              <div className="profile-header">
                <div className="avatar-lg">{currentUser?.username[0].toUpperCase()}</div>
                <div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>{currentUser?.username}</div>
                  <div style={{color:"var(--muted)",fontSize:13,marginTop:4}}>{currentUser?.email}</div>
                  <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                    {currentUser?.is_admin&&<span style={{background:"rgba(167,139,250,.15)",color:"var(--accent2)",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,display:"flex",alignItems:"center",gap:4}}><Shield size={10}/>Administrateur</span>}
                    <span style={{background:"rgba(52,211,153,.15)",color:"var(--green)",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,display:"flex",alignItems:"center",gap:4}}><CheckCircle size={10}/>Actif</span>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:14}}>
                <StatCard icon={<FileText size={20}/>} label="Mes fichiers" value={files.length} color="var(--accent)"/>
                <StatCard icon={<Folder size={20}/>} label="Mes dossiers" value={folders.length} color="var(--accent2)"/>
                <StatCard icon={<Share2 size={20}/>} label="Partagés" value={sharedWithMe.length} color="var(--green)"/>
              </div>
              <button className="btn-danger" style={{gap:8}} onClick={handleLogout}><LogOut size={14}/>Se déconnecter</button>
            </>)}

            {/* Settings */}
            {section==="settings"&&(<>
              <div className="section-title" style={{marginBottom:12}}><Server size={14}/>Backend</div>
              <div className="settings-section">
                {[{icon:<Server size={14}/>,label:"FastAPI",sub:"http://192.168.43.183:8000"},{icon:<Database size={14}/>,label:"MySQL",sub:"filevault"},{icon:<Shield size={14}/>,label:"Auth",sub:"JWT · HS256"},{icon:<Share2 size={14}/>,label:"Partage",sub:"Lecture seule · par utilisateur"}].map((r,i)=>(
                  <div className="settings-row" key={i}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"var(--muted)"}}>{r.icon}</span><div><div className="settings-label">{r.label}</div><div className="settings-sub">{r.sub}</div></div></div>
                    <span style={{background:"rgba(52,211,153,.15)",color:"var(--green)",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:99,display:"flex",alignItems:"center",gap:4,flexShrink:0}}><CheckCircle size={10}/>Actif</span>
                  </div>
                ))}
              </div>
            </>)}

            {/* Trash */}
            {section==="trash"&&(
              <div className="empty-state"><div className="empty-icon"><Trash2 size={48}/></div><div style={{fontWeight:600}}>Corbeille vide</div></div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {NAV.map(n=>(
          <button key={n.id} className={`bottom-nav-item ${section===n.id?"active":""}`} onClick={()=>navigate(n.id)}>
            <span style={{display:"flex"}}>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {modal&&(
        <Modal
          title={
            modal.type==="newFolder"?"Créer un dossier":
            modal.type==="uploadFile"?"Téléverser un fichier":
            modal.type==="shareItem"?"Partager cet élément":
            modal.type==="newUser"?"Nouvel utilisateur":
            modal.type==="deleteUser"?"Supprimer l'utilisateur":
            modal.type==="deleteFolder"?"Supprimer le dossier":"Supprimer le fichier"
          }
          onClose={closeModal} onConfirm={confirmModal}
          confirmLabel={
            modal.type==="uploadFile"?(uploading?"Envoi...":"Téléverser"):
            modal.type==="shareItem"?"Partager":
            modal.type==="newUser"?"Créer":
            ["deleteFolder","deleteFile","deleteUser"].includes(modal.type)?"Supprimer":"Créer"
          }
          confirmDanger={["deleteFolder","deleteFile","deleteUser"].includes(modal.type)}>

          {modal.type==="newFolder"&&(
            <input type="text" autoFocus placeholder="Nom du dossier..." value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&confirmModal()}/>
          )}

          {modal.type==="uploadFile"&&(
            <div>
              <div className={`upload-zone ${dragOver?"drag":""} ${pendingFile?"has-file":""}`}
                onClick={()=>fileInputRef.current?.click()}
                onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)setPendingFile(f);}}>
                <input type="file" ref={fileInputRef} style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setPendingFile(f);}}/>
                {pendingFile?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <div className="file-icon-box" style={{width:48,height:48}}>{getFileIcon(pendingFile.name.split(".").pop(),20)}</div>
                    <div style={{fontWeight:600,fontSize:13}}>{pendingFile.name}</div>
                    <div style={{color:"var(--muted)",fontSize:12}}>{formatSize(pendingFile.size)}</div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <Upload size={36} style={{color:"var(--muted)",opacity:.5}}/>
                    <div style={{fontWeight:600}}>Glissez un fichier ici</div>
                    <div style={{color:"var(--muted)",fontSize:12}}>ou appuyez pour parcourir</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {modal.type==="shareItem"&&(
            <div>
              <div style={{background:"var(--card2)",borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
                {modal.targetType==="folder"?<Folder size={18} style={{color:"#fbbf24"}}/>:<FileText size={18} style={{color:"var(--muted)"}}/>}
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{items.find(i=>i.id===modal.targetId)?.name||"Élément"}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Accès lecture seule</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Partager avec</label>
                <select value={shareTargetUserId} onChange={e=>setShareTargetUserId(e.target.value)}>
                  <option value="">Sélectionnez un utilisateur...</option>
                  {users.filter(u=>u.id!==currentUser?.id).map(u=>(
                    <option key={u.id} value={u.id}>{u.username} — {u.email}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {modal.type==="newUser"&&(
            <div>
              <div className="form-group"><label className="form-label">Nom d'utilisateur</label><input type="text" placeholder="ex: john_doe" value={newUserForm.username} onChange={e=>setNewUserForm(p=>({...p,username:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" placeholder="ex: john@email.com" value={newUserForm.email} onChange={e=>setNewUserForm(p=>({...p,email:e.target.value}))}/></div>
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <div style={{position:"relative"}}>
                  <input type={showNewUserPwd?"text":"password"} placeholder="Mot de passe..." value={newUserForm.password} onChange={e=>setNewUserForm(p=>({...p,password:e.target.value}))} style={{paddingRight:40}}/>
                  <button type="button" style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex",padding:4}} onClick={()=>setShowNewUserPwd(!showNewUserPwd)}>
                    {showNewUserPwd?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              <label className="checkbox-row"><input type="checkbox" checked={newUserForm.is_admin} onChange={e=>setNewUserForm(p=>({...p,is_admin:e.target.checked}))}/>
                <span style={{display:"flex",alignItems:"center",gap:6}}><Shield size={13} style={{color:"var(--accent2)"}}/>Administrateur</span>
              </label>
            </div>
          )}

          {["deleteFolder","deleteFile","deleteUser"].includes(modal.type)&&(
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <AlertCircle size={20} style={{color:"#f87171",flexShrink:0,marginTop:1}}/>
              <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.6}}>
                {modal.type==="deleteFolder"?"Ce dossier et tout son contenu seront supprimés définitivement.":modal.type==="deleteUser"?"Cet utilisateur sera supprimé définitivement.":"Ce fichier sera supprimé définitivement du serveur."}
              </p>
            </div>
          )}
        </Modal>
      )}

      {toast&&(
        <div className="toast">
          <span style={{display:"flex",alignItems:"center"}}>{toast.ok?<CheckCircle size={16} style={{color:"var(--green)"}}/>:<AlertCircle size={16} style={{color:"#f87171"}}/>}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
