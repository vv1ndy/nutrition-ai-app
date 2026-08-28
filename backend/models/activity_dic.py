from sqlalchemy import Column, Integer, String, Float
from database import Base

class ActivityDic(Base):
    __tablename__ = "activity_dic"
    
    id = Column(Integer, primary_key=True, index=True)
    exercise_key = Column(String(50), unique=True, index=True)
    name = Column(String(100))
    met = Column(Float)
    icon = Column(String(10)) # Lưu Emoji icon, vd: "🏃", "🏋️"