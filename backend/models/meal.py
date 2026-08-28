from sqlalchemy import Column, Integer, String, DECIMAL, Date, DateTime, ForeignKey, Text, Unicode
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Meal(Base):
    __tablename__ = "meal"

    meal_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    food_id = Column(Integer, ForeignKey("food.food_id", ondelete="SET NULL"), nullable=True)
    loai_bua_an = Column(Unicode(50), nullable=True)
    ngay_an = Column(Date, nullable=False)
    ten_mon_an = Column(Unicode(255), nullable=False)
    so_luong_khau_phan = Column(DECIMAL(4, 2), default=1.0)
    meal_calories = Column(DECIMAL(6, 2), nullable=False)
    meal_protein_g = Column(DECIMAL(6, 2), default=0)
    meal_carb_g = Column(DECIMAL(6, 2), default=0)
    meal_fat_g = Column(DECIMAL(6, 2), default=0)
    image_url = Column(Text)
    loi_khuyen = Column(Unicode(1024), nullable=True)
    create_at = Column(DateTime, default=datetime.utcnow)

    # Mối quan hệ ngược lại với User và Food
    user = relationship("User", back_populates="meals")
    food = relationship("Food", back_populates="meals")