from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Unicode
from sqlalchemy.orm import relationship
from datetime import datetime
import pytz
VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_vn_time():
    return datetime.now(VN_TZ)
# Import Base từ file database.py của bạn. 
# Tùy thuộc vào vị trí file database.py, bạn có thể cần chỉnh lại đường dẫn (ví dụ: from ..database import Base)
from database import Base

class User(Base):
    __tablename__ = "user"

    # Ánh xạ các cột
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ho_ten = Column(Unicode(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nam_sinh = Column(Integer, nullable=True)
    gioi_tinh = Column(Unicode(10), nullable=True)  # NAM, NỮ, KHÁC
    chieu_cao = Column(DECIMAL(5, 2), nullable=True)
    can_nang = Column(DECIMAL(5, 2), nullable=True)
    muc_do_van_dong = Column(Unicode(20), nullable=True)
    ngay_tao = Column(DateTime, default=get_vn_time)
    benh_nen = Column(Unicode(255), nullable=True)  # Trong SQLAlchemy, String không chỉ định độ dài tương đương NVARCHAR(MAX)
    di_ung = Column(Unicode(255), nullable=True)
    role = Column(String(20), default="USER")
    strava_token = Column(String(255), nullable=True)
    strava_refresh_token = Column(Unicode(255), nullable=True) 
    strava_expires_at = Column(Integer, nullable=True)

    # ==============================================================================
    # KHAI BÁO MỐI QUAN HỆ (RELATIONSHIPS)
    # Lưu ý: Sử dụng tên Class dưới dạng chuỗi (ví dụ: "TargetNutri") 
    # thay vì import trực tiếp để tránh lỗi vòng lặp import (Circular Import) khi tách file.
    # ==============================================================================
    
    # 1 - N: Một người dùng có nhiều mục tiêu dinh dưỡng
    target_nutris = relationship("TargetNutri", back_populates="user", cascade="all, delete-orphan")
    
    # 1 - 1: Một người dùng có một cấu hình nhắc nước (uselist=False)
    config_water = relationship("ConfigWater", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # 1 - N: Lịch sử bữa ăn
    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    
    # 1 - N: Lịch sử dinh dưỡng tổng hợp
    nutris = relationship("Nutri", back_populates="user", cascade="all, delete-orphan")
    
    # 1 - N: Hoạt động thể dục
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    
    # 1 - N: Lịch sử uống nước
    waters = relationship("Water", back_populates="user", cascade="all, delete-orphan")
    
