from sqlalchemy import Unicode, Column, Integer, String, DECIMAL, Date, DateTime, Time, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, date, time
from database import Base
import pytz 

# Khai báo múi giờ Việt Nam
VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_vn_time():
    return datetime.now(VN_TZ)


class Activity(Base):
    __tablename__ = "activity"

    activity_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    loai_bai_tap = Column(Unicode, nullable=False)
    thoi_luong_phut = Column(Integer, nullable=False)
    calo_tieu_thu = Column(DECIMAL(6, 2), nullable=False)
    source = Column(String(50), default="MANUAL")
    external_id = Column(String(100), nullable=True)
    create_at = Column(DateTime, default=get_vn_time)

    user = relationship("User", back_populates="activities")

class ConfigWater(Base):
    __tablename__ = "config_water"

    config_water_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    target_ml = Column(Integer, default=2000)
    thoi_gian_bat_dau = Column(Time, default=time(7, 0))
    thoi_gian_ket_thuc = Column(Time, default=time(20, 0))
    khoang_cach_nhac_phut = Column(Integer, default=150)
    trang_thai = Column(Boolean, default=True)
    user = relationship("User", back_populates="config_water")

class Water(Base):
    __tablename__ = "water"

    water_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    ngay_uong = Column(Date, nullable=False)
    thoi_gian_uong = Column(DateTime, default=get_vn_time)
    luong_nuoc_ml = Column(Integer, nullable=False)

    user = relationship("User", back_populates="waters")