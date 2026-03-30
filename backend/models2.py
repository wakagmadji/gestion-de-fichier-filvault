from sqlalchemy import Column, String, BigInteger, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.mysql import CHAR
from database import Base
from datetime import datetime
import uuid

def gen_uuid(): return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(CHAR(36), primary_key=True, default=gen_uuid)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Folder(Base):
    __tablename__ = "folders"
    id = Column(CHAR(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    parent_id = Column(CHAR(36), nullable=True)
    owner_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class File(Base):
    __tablename__ = "files"
    id = Column(CHAR(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    ext = Column(String(50), nullable=True)
    size = Column(BigInteger, default=0)
    storage_path = Column(Text, nullable=False)
    folder_id = Column(CHAR(36), nullable=True)
    owner_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Share(Base):
    __tablename__ = "shares"
    id = Column(CHAR(36), primary_key=True, default=gen_uuid)
    item_type = Column(Enum("file", "folder"), nullable=False)
    item_id = Column(CHAR(36), nullable=False)
    owner_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_with_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(CHAR(36), primary_key=True, default=gen_uuid)
    # Destinataire
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Type: file_uploaded, file_deleted, folder_created, file_shared, user_created
    type = Column(String(50), nullable=False)
    # Message lisible
    message = Column(String(500), nullable=False)
    # Données supplémentaires (ex: nom du fichier, qui a partagé)
    extra = Column(String(500), nullable=True)
    # Lu ou non
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
