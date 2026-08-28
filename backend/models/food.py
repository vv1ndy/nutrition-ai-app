from sqlalchemy import Column, Integer, String, DECIMAL, Text, Unicode
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from database import Base

class Food(Base):
    __tablename__ = "food"

    food_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ten_mon = Column(NVARCHAR(150), nullable=False)
    ten_chuan_hoa = Column(NVARCHAR(150), index=True)
    don_vi = Column(NVARCHAR(50), default="phần")
    kich_thuoc_khau_phan = Column(DECIMAL(6, 2), default=1.0)
    calories = Column(DECIMAL(6, 2), nullable=False)
    protein_g = Column(DECIMAL(6, 2), default=0)
    carb_g = Column(DECIMAL(6, 2), default=0)
    fat_g = Column(DECIMAL(6, 2), default=0)
    
    # BỔ SUNG CỘT LỜI KHUYÊN (Sử dụng Text vì lời khuyên AI có thể dài)
    loi_khuyen = Column(NVARCHAR(None), nullable=True)

    # 1 - N: Một món ăn chuẩn có thể có trong nhiều nhật ký bữa ăn
    meals = relationship("Meal", back_populates="food")