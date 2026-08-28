from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from decimal import Decimal

# ==============================================================================
# SCHEMA ĐẦU VÀO (REQUEST): Dùng khi đăng ký hoặc tạo User mới
# ==============================================================================
class UserCreate(BaseModel):
    ho_ten: str
    email: EmailStr
    password: str # Nhận mật khẩu gốc từ Client, hệ thống sẽ tự hash sau
    nam_sinh: Optional[int] = None
    gioi_tinh: Optional[str] = None
    chieu_cao: Optional[Decimal] = None
    can_nang: Optional[Decimal] = None
    muc_do_van_dong: Optional[str] = None
    benh_nen: Optional[str] = None
    di_ung: Optional[str] = None

# ==============================================================================
# SCHEMA ĐẦU RA (RESPONSE): Dùng để trả dữ liệu về cho Client (Đã ẩn password)
# ==============================================================================
class UserResponse(BaseModel):
    user_id: int
    ho_ten: str
    email: EmailStr
    nam_sinh: Optional[int] = None
    gioi_tinh: Optional[str] = None
    chieu_cao: Optional[Decimal] = None
    can_nang: Optional[Decimal] = None
    muc_do_van_dong: Optional[str] = None
    ngay_tao: datetime
    benh_nen: Optional[str] = None
    di_ung: Optional[str] = None
    role: str

    class Config:
        # Pydantic V2: Cấu hình này giúp schema tự động đọc dữ liệu từ Object ORM của SQLAlchemy
        from_attributes = True