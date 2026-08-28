from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal

class FoodBase(BaseModel):
    ten_mon: str
    don_vi: Optional[str] = "phần"
    kich_thuoc_khau_phan: Optional[Decimal] = Decimal("1.0")
    calories: Decimal
    protein_g: Optional[Decimal] = Decimal("0.0")
    carb_g: Optional[Decimal] = Decimal("0.0")
    fat_g: Optional[Decimal] = Decimal("0.0")
    
    # BỔ SUNG TRƯỜNG NÀY ĐỂ PYDANTIC KHÔNG LỌC BỎ LỜI KHUYÊN
    loi_khuyen: Optional[str] = None

class FoodCreate(FoodBase):
    ten_chuan_hoa: Optional[str] = None
    biet_danh: Optional[str] = None

class FoodResponse(FoodBase):
    food_id: int

    # CẬP NHẬT CÚ PHÁP CHUẨN CỦA PYDANTIC V2
    model_config = ConfigDict(from_attributes=True)