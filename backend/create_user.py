from database import SessionLocal, engine, Base
from models import User
from auth import hash_password
import uuid

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Create admin user
admin_user = User(
    id=str(uuid.uuid4()),
    username="admin",
    email="admin@example.com",
    hashed_password=hash_password("admin123"),
    is_admin=True,
    is_active=True
)

db.add(admin_user)
db.commit()
db.close()

print("Admin user created: username=admin, password=admin123")</content>
<parameter name="filePath">/home/nadjirom/Documents/www/mon-dashboard/backend/create_user.py