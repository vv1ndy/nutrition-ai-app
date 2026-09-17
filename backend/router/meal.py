from fastapi import APIRouter, Depends, HTTPException
from models.nutrition import TargetNutri, Nutri
from sqlalchemy.orm import Session
from typing import List
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func
from datetime import timedelta,date, datetime # Thêm thư viện này để lấy ngày và giờ hiện tại
from security import get_current_user
from database import get_db
from models.meal import Meal
from schemas.meal import MealCreate, MealResponse

router = APIRouter(prefix="/api/meals", tags=["Nhật ký bữa ăn"])

@router.post("", response_model=MealResponse)#Dùng response_model để tự động chuyển đổi kết quả thành schemas
def log_meal(
    meal: MealCreate, 
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """API Ghi nhận một bữa ăn mới"""
    # 1. Lưu bữa ăn vào bảng Meal
    meal_data = meal.model_dump()
    meal_data["user_id"] = user_id
    new_meal = Meal(**meal_data)
    db.add(new_meal)
    # 2. Xử lý cộng dồn vào bảng Nutri
    nutri_record = db.query(Nutri).filter(
        Nutri.user_id == user_id, 
        Nutri.date_log == new_meal.ngay_an
    ).first()
    if nutri_record:
        # Nếu đã có log của ngày hôm nay -> Cộng dồn số liệu
        nutri_record.total_calories += new_meal.meal_calories
        nutri_record.total_protein += new_meal.meal_protein_g
        nutri_record.total_carb += new_meal.meal_carb_g
        nutri_record.total_fat += new_meal.meal_fat_g
    else:
        target = db.query(TargetNutri).filter(TargetNutri.user_id == user_id).order_by(TargetNutri.target_nutri_id.desc()).first()
        new_nutri = Nutri(
            user_id=user_id,
            date_log=new_meal.ngay_an,
            total_calories=new_meal.meal_calories,
            total_protein=new_meal.meal_protein_g or 0,
            total_carb=new_meal.meal_carb_g or 0,
            total_fat=new_meal.meal_fat_g or 0,
            target_calories=target.target_calories if target else 2000
        )
        db.add(new_nutri)
    db.commit()
    db.refresh(new_meal)
    return new_meal


# ====== 1. API LẤY DANH SÁCH THEO NGÀY CỤ THỂ ======
@router.get("/by-date")
def get_meals_by_date(
    date: str,  # Nhận ngày từ query parameter (Định dạng: YYYY-MM-DD)
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """API Lấy danh sách bữa ăn và tổng hợp dinh dưỡng theo ngày"""
    try:
        # 1. Bắt lỗi định dạng ngày riêng biệt để trả về 400 thay vì 500
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Sai định dạng ngày. Yêu cầu YYYY-MM-DD")
        
        # 2. Truy vấn danh sách món ăn từ bảng Meal
        meals = db.query(Meal).filter(
            Meal.user_id == user_id,
            Meal.ngay_an == target_date
        ).all()
        
        # 3. Truy vấn tổng hợp dinh dưỡng từ bảng Nutri
        nutri_record = db.query(Nutri).filter(
            Nutri.user_id == user_id, 
            Nutri.date_log == target_date
        ).first()
        
        # 4. Truy vấn mục tiêu TDEE
        target = db.query(TargetNutri).filter(
            TargetNutri.user_id == user_id
        ).order_by(TargetNutri.target_nutri_id.desc()).first()
        tdee = float(target.target_calories) if target and target.target_calories else 2000.0#Lấy mục tiêu có id lớn nhất
        
        # 5. Đóng gói dữ liệu trả về theo chuẩn mới cho Frontend
        return {
            "meals": meals,
            "summary": {
                "total_calories": float(nutri_record.total_calories or 0) if nutri_record else 0.0,
                "total_protein": float(nutri_record.total_protein or 0) if nutri_record else 0.0,
                "total_carb": float(nutri_record.total_carb or 0) if nutri_record else 0.0,
                "total_fat": float(nutri_record.total_fat or 0) if nutri_record else 0.0,
            },
            "daily_goal": tdee,
            "consumed_calories": float(nutri_record.total_calories or 0) if nutri_record else 0.0 # Giữ lại key này nếu có màn hình khác vẫn dùng
        }
        
    except HTTPException:
        # Cho phép các lỗi HTTP có chủ đích (như 400 ở trên) được văng ra bình thường
        raise
    except Exception as e:
        print(f"Lỗi truy vấn bữa ăn: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chi tiết lỗi: {str(e)}")
#===== 2. API THỐNG KÊ CALO THEO TUẤN =====

@router.get("/weekly-stats")
def get_weekly_stats(
    date_str: str,
    user_id: int = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """API Thống kê calo 7 ngày và lấy TDEE từ TargetNutri"""
    today = datetime.strptime(date_str, "%Y-%m-%d").date()
    start_date = today - timedelta(days=6)
    #Ghi sẵn dữ liệu calo là 0
    stats_dict = {}
    for i in range(7):
        day = start_date + timedelta(days=i)
        stats_dict[day.strftime("%d/%m")] = 0
    #LẤY CALO ĐÃ ĂN TỪ BẢNG Nutri
    nutris = db.query(Nutri).filter(
        Nutri.user_id == user_id,
        Nutri.date_log >= start_date,
        Nutri.date_log <= today
    ).all()
    #BÓC TÁCH DỮ LIỆU TRẢ VỀ, GHI ĐỀ STATS_DICT
    for record in nutris:
        day_str = record.date_log.strftime("%d/%m")
        if day_str in stats_dict:
            stats_dict[day_str] = round(float(record.total_calories or 0))
            
    # LẤY THÊM MỤC TIÊU TDEE TỪ BẢNG TargetNutri
    target = db.query(TargetNutri).filter(TargetNutri.user_id == user_id).order_by(TargetNutri.target_nutri_id.desc()).first()
    tdee = float(target.target_calories) if target and target.target_calories else 2000.0
            
    # Trả về cả mảng dữ liệu và TDEE
    return {
        "labels": list(stats_dict.keys()),#danh sách các ngày để vẽ trục ngang (Trục X)
        "data": list(stats_dict.values()),#mảng số calo để vẽ các cột/đường (Trục Y)
        "daily_goal": tdee
    }