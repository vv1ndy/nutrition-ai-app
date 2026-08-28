from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, time
from decimal import Decimal


# --- Activity ---
class ActivityCreate(BaseModel):
    user_id: int
    loai_bai_tap: str
    thoi_luong_phut: int
    calo_tieu_thu: Decimal
    source: Optional[str] = "MANUAL"
    external_id: Optional[str] = None

class ActivityResponse(ActivityCreate):
    activity_id: int
    create_at: datetime

    class Config:
        from_attributes = True

# --- ConfigWater ---
class ConfigWaterCreate(BaseModel):
   
    target_ml: Optional[int] = 2000
    thoi_gian_bat_dau: Optional[time] = time(7, 0)#Bắt đầu uống nước từ 7h sáng
    thoi_gian_ket_thuc: Optional[time] = time(20, 0)#Kết thúc uống nước vào 20h tối
    khoang_cach_nhac_phut: Optional[int] = 150#Nhắc mỗi 2.5 giờ
    trang_thai: Optional[bool] = True

class ConfigWaterResponse(ConfigWaterCreate):
    config_water_id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Water ---
class WaterCreate(BaseModel):
    # Frontend chỉ cần gửi đúng lượng nước mỗi lần bấm nút (+)
    luong_nuoc_ml: int

class WaterResponse(WaterCreate):
    water_id: int
    user_id: int
    ngay_uong: date
    thoi_gian_uong: datetime

    class Config:
        from_attributes = True