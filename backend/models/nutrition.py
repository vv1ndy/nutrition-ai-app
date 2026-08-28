from sqlalchemy import Column, Integer, String, DECIMAL, Date, ForeignKey, UniqueConstraint, Unicode
from sqlalchemy.orm import relationship
from datetime import date
from database import Base

class TargetNutri(Base):
    __tablename__ = "target_nutri"

    target_nutri_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    target_calories = Column(DECIMAL(6, 2), nullable=False)
    target_protein = Column(DECIMAL(6, 2), default=0)
    target_carb = Column(DECIMAL(6, 2), default=0)
    target_fat = Column(DECIMAL(6, 2), default=0)
    muc_tieu_can_nang = Column(Unicode(50), default="Giữ cân")
    water_target_ml = Column(Integer, default=2000 )
    ngay_bat_dau = Column(Date, default=date.today)
    ngay_ket_thuc = Column(Date, nullable=True)
    target_status = Column(String(20), default="ACTIVE")

    user = relationship("User", back_populates="target_nutris")

class Nutri(Base):
    __tablename__ = "nutri"

    nutri_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    date_log = Column("date", Date, nullable=False) # Đổi tên biến tránh trùng từ khóa 'date' trong Python
    total_calories = Column(DECIMAL(6, 2), default=0)
    total_protein = Column(DECIMAL(6, 2), default=0)
    total_carb = Column(DECIMAL(6, 2), default=0)
    total_fat = Column(DECIMAL(6, 2), default=0)
    total_water_ml = Column(Integer, default=0)
    calo_the_duc = Column(DECIMAL(6, 2), default=0)
    target_calories = Column(DECIMAL(6, 2), default=0)
    

    # Ràng buộc Unique
    __table_args__ = (UniqueConstraint('user_id', 'date', name='UQ_User_Date'),)

    user = relationship("User", back_populates="nutris")