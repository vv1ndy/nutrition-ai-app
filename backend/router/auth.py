from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from security import create_access_token, verify_password
from database import get_db
from models.user import User
from schemas.user import UserCreate  # Dùng UserCreate thay vì UserRegister
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "YOUR_SECRET_KEY_HERE"
ALGORITHM = "HS256"

class UserLogin(BaseModel):
    email: str
    password: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Kiểm tra tồn tại
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")

    # Mã hóa mật khẩu
    hashed_password = pwd_context.hash(user.password)

    new_user = User(
        ho_ten=user.ho_ten,
        email=user.email,
        password_hash=hashed_password, 
        nam_sinh=getattr(user, 'nam_sinh', None),
        gioi_tinh=getattr(user, 'gioi_tinh', None),
        chieu_cao=getattr(user, 'chieu_cao', None),
        can_nang=getattr(user, 'can_nang', None),
        muc_do_van_dong=getattr(user, 'muc_do_van_dong', "ACTIVE"),
        benh_nen=getattr(user, 'benh_nen', None),
        di_ung=getattr(user, 'di_ung', None)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"success": True, "message": "Đăng ký thành công!", "user_id": new_user.user_id}

@router.post("/login")
def login_user(user_creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_creds.email).first()
    if not user or not verify_password(user_creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")

    
    
    encoded_jwt = create_access_token(
        data={"sub": user.email, "user_id": user.user_id}
    )

    return {
        "access_token": encoded_jwt,
        "token_type": "bearer",
        "user_id": user.user_id,
        "ho_ten": user.ho_ten
    }