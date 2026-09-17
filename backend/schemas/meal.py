from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class MealCreate(BaseModel):
    user_id: Optional[int] = None
    food_id: Optional[int] = None
    loai_bua_an: str | None = None # BREAKFAST, LUNCH, DINNER, SNACK
    ngay_an: date
    ten_mon_an: str
    so_luong_khau_phan: Decimal = Decimal("1.0")
    meal_calories: Decimal
    meal_protein_g: Decimal = Decimal("0.0")
    meal_carb_g: Decimal = Decimal("0.0")
    meal_fat_g: Decimal = Decimal("0.0")
    image_url: Optional[str] = None
    loi_khuyen: Optional[str] = None

class MealResponse(MealCreate):
    meal_id: int
    create_at: datetime

    class Config:
        from_attributes = True