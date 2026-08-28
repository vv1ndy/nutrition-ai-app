from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta, datetime
from typing import List
from database import get_db
from models.health_water import ConfigWater, Water
from models.nutrition import Nutri, TargetNutri
from schemas.health_water import ConfigWaterCreate, ConfigWaterResponse, WaterCreate, WaterResponse
from security import get_current_user
from models.user import User
from fastapi import HTTPException

router = APIRouter(prefix="/api/water", tags=["Uống nước"])
# 1. API: CẬP NHẬT MỤC TIÊU UỐNG NƯỚC CÁ NHÂN HÓA
# =========================================================================
@router.put("/water/target")
def update_water_target(
    target_ml: int, 
    db: Session = Depends(get_db), 
    user_id: int = Depends(get_current_user)
):
    target_nutri = db.query(TargetNutri).filter(
        TargetNutri.user_id == user_id
    ).order_by(TargetNutri.target_nutri_id.desc()).first()
    
    if not target_nutri:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ mục tiêu của người dùng. Vui lòng cập nhật hồ sơ trước!")
    target_nutri.water_target_ml = target_ml
    db.commit()
    
    return {
        "status": "success", 
        "message": "Đã cập nhật mục tiêu uống nước!", 
        "water_target_ml": target_ml
    }
#
@router.post("/config", response_model=ConfigWaterResponse)
def upsert_water_config(
    config: ConfigWaterCreate, 
    user_id: int = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """API Tạo mới hoặc Cập nhật cấu hình nhắc nhở uống nước"""
    existing_config = db.query(ConfigWater).filter(ConfigWater.user_id == user_id).first()
    config_data = config.model_dump(exclude_unset=True)
    if existing_config:
        for key, value in config_data.items():
            setattr(existing_config, key, value)
        db.commit()
        db.refresh(existing_config)
        return existing_config
    else:
        config_data["user_id"] = user_id
        new_config = ConfigWater(**config_data)
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config

@router.post("/log", response_model=WaterResponse)
def log_water(
    water: WaterCreate, 
    user_id: int = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """API Ghi nhận lượng nước uống và CỘNG VÀO BẢNG NUTRI"""
    today = date.today()
    now = datetime.now()
    
    # 1. Giữ lại việc lưu lịch sử chi tiết vào bảng Water 
    new_water = Water(
        user_id=user_id,
        ngay_uong=today,
        thoi_gian_uong=now,
        luong_nuoc_ml=water.luong_nuoc_ml
    )
    db.add(new_water)
    
    # 2. 🔥 Tự động cập nhật tổng nước vào bảng Nutri
    nutri_record = db.query(Nutri).filter(
        Nutri.user_id == user_id, 
        Nutri.date_log == today
    ).first()
    
    if nutri_record:
        # Nếu hôm nay đã có bản ghi Nutri (do người dùng đã ăn hoặc đã uống nước trước đó)
        current_water = nutri_record.total_water_ml or 0
        new_total = current_water + water.luong_nuoc_ml
        nutri_record.total_water_ml = max(0, new_total)
    else:
        # Nếu hôm nay chưa có bản ghi Nutri nào (người dùng vừa ngủ dậy và uống nước ngay)
        initial_water = max(0, water.luong_nuoc_ml)
        nutri_record = Nutri(
            user_id=user_id,
            date_log=today,
            total_water_ml=water.luong_nuoc_ml
            # Các thông số calo khác sẽ mặc định là 0 theo cấu trúc DB của bạn
        )
        db.add(nutri_record)

    db.commit()
    db.refresh(new_water)
    return new_water

# ================= CÁC API THỐNG KÊ MỚI CỰC NHANH =================

@router.get("/today")
def get_today_water(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """API Lấy lượng nước hôm nay trực tiếp từ bảng Nutri"""
    try:
        today = date.today()
    
        nutri_record = db.query(Nutri).filter(
            Nutri.user_id == user_id,
            Nutri.date_log == today
        ).first()
    
    # Lấy thông tin mục tiêu của User
        target_nutri = db.query(TargetNutri).filter(TargetNutri.user_id == user_id).order_by(TargetNutri.target_nutri_id.desc()).first()
        target_ml = 2000 # Gán mặc định là 2000 từ đầu
        if target_nutri and target_nutri.water_target_ml is not None:
            target_ml = target_nutri.water_target_ml

    # Truy vấn lịch sử nước: Dùng trực tiếp cột ngay_uong và thoi_gian_uong
        water_logs = db.query(Water).filter(
            Water.user_id == user_id,
            Water.ngay_uong == today 
        ).order_by(Water.thoi_gian_uong.desc()).all() 

    # Nếu chưa có Nutri thì mặc định trả về 0
        total_water = nutri_record.total_water_ml if nutri_record and nutri_record.total_water_ml else 0
    
        return {
            "target_ml": target_ml,
            "total_ml": total_water, # Trả về total_ml để khớp với Frontend
            "completion_percent": round((total_water / target_ml) * 100) if target_ml > 0 else 0,
            "logs": [
                {
                    "id": log.water_id, 
                    "amount_ml": log.luong_nuoc_ml, 
                    # Lấy giờ phút từ thoi_gian_uong
                    "time": log.thoi_gian_uong.strftime("%H:%M") if log.thoi_gian_uong else "" 
                } for log in water_logs
            ]
        }
    except Exception as e:
        # IN LỖI RA TERMINAL
        print("=== BẮT ĐƯỢC LỖI BACKEND ===")
        traceback.print_exc()
        # NÉM THẲNG LỖI LÊN APP ĐIỆN THOẠI
        raise HTTPException(status_code=500, detail=f"Lỗi chi tiết: {str(e)}")
@router.get("/weekly-stats")
def get_weekly_water_stats(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """API Thống kê lượng nước 7 ngày qua KHÔNG CẦN CỘNG DỒN nữa"""
    today = date.today()
    start_date = today - timedelta(days=6)
    
    stats_dict = {}
    for i in range(7):
        day = start_date + timedelta(days=i)
        stats_dict[day.strftime("%d/%m")] = 0
        
    # 🔥 Truy vấn trực tiếp cột total_water_ml từ bảng Nutri, không cần group_by và sum nữa
    nutri_logs = db.query(
        Nutri.date_log, 
        Nutri.total_water_ml
    ).filter(
        Nutri.user_id == user_id,
        Nutri.date_log >= start_date,
        Nutri.date_log <= today
    ).all()
    
    for log in nutri_logs:
        day_str = log.date_log.strftime("%d/%m")
        if day_str in stats_dict:
            stats_dict[day_str] = int(log.total_water_ml or 0)
            
    return {
        "labels": list(stats_dict.keys()),
        "data": list(stats_dict.values())
    }