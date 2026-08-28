from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

# --- TargetNutri ---
class TargetNutriBase(BaseModel):
    target_calories: Decimal
    target_protein: Optional[Decimal] = Decimal("0.0")
    target_carb: Optional[Decimal] = Decimal("0.0")
    target_fat: Optional[Decimal] = Decimal("0.0")

class TargetNutriCreate(TargetNutriBase):
    user_id: int

class TargetNutriResponse(TargetNutriBase):
    target_nutri_id: int
    ngay_bat_dau: date
    target_status: str

    class Config:
        from_attributes = True

# --- Nutri (Tổng hợp dinh dưỡng) ---
class NutriCreate(BaseModel):
    user_id: int
    date_log: date # Tránh trùng keyword 'date'
    total_calories: Optional[Decimal] = Decimal("0.0")
    total_protein: Optional[Decimal] = Decimal("0.0")
    total_carb: Optional[Decimal] = Decimal("0.0")
    total_fat: Optional[Decimal] = Decimal("0.0")
    total_water_ml: Optional[int] = 0
    calo_the_duc: Optional[Decimal] = Decimal("0.0")
    target_calories: Optional[Decimal] = Decimal("0.0")
    targer_carb: Optional[Decimal] = Decimal("0.0")
    targer_fat: Optional[Decimal] = Decimal("0.0")

class NutriResponse(NutriCreate):
    nutri_id: int

    class Config:
        from_attributes = True