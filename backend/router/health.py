import os
import time
import httpx
import logging
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import traceback
from database import get_db
from models.health_water import Activity
from models.nutrition import Nutri
from models.user import User
from schemas.health_water import ActivityCreate, ActivityResponse
from security import get_current_user
from models.activity_dic import ActivityDic

# ================= CẤU HÌNH LOGGING =================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Sức khỏe & Thể dục"])

# ================= BIẾN MÔI TRƯỜNG =================
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID", "273787")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET", "6bb1e97e3b5318e96726d8ba100cde31f8e2235c")
# =========================================================================
# LUỒNG 0: LẤY TỪ ĐIỂN BÀI TẬP
# =========================================================================
@router.get("/activity-dic")
def get_activity_dictionary(db: Session = Depends(get_db)):
    activities = db.query(ActivityDic).all()
    result = []
    for act in activities:
        result.append({
            "value": act.exercise_key,
            "label": f"{act.icon} {act.name}",
            "name": act.name,
            "icon": act.icon
        })
    return result
# LUỒNG 1: LƯU BÀI TẬP THỦ CÔNG
# =========================================================================
@router.post("/activity") 
def log_manual_activity(
    data: dict,
    db: Session = Depends(get_db), 
    user_id: int = Depends(get_current_user)
):
    logger.info(f"Dữ liệu nhận được từ app: {data}")
    try:
        exercise_key = data.get("exercise_key", "chay_bo_vua") 
        duration_minutes = float(data.get("duration_minutes", 0)) 
        
        user = db.query(User).filter(User.user_id == user_id).first()
        weight_kg = getattr(user, "weight", 60.0) if user else 60.0 
        activity_info = db.query(ActivityDic).filter(ActivityDic.exercise_key == exercise_key).first()
        met_value = activity_info.met if activity_info else 3.5
        exercise_name = activity_info.name if activity_info else exercise_key.replace("_", " ").capitalize()
        calories_burned = duration_minutes * ((met_value * 3.5 * weight_kg) / 200)
        today = date.today()
        new_activity = Activity(
            user_id=user_id,
            loai_bai_tap=exercise_name,
            thoi_luong_phut=int(duration_minutes),
            calo_tieu_thu=round(calories_burned, 2),
            source="MANUAL",              
            external_id=None,             
            create_at=datetime.now()      
        )
        db.add(new_activity)
        
        nutri_record = db.query(Nutri).filter(
            Nutri.user_id == user_id, 
            Nutri.date_log == today
        ).first()
        
        if nutri_record:
            current_calo_td = nutri_record.calo_the_duc or 0
            nutri_record.calo_the_duc = float(current_calo_td) + float(calories_burned)
        else:
            nutri_record = Nutri(
                user_id=user_id,
                date_log=today,
                calo_the_duc=round(calories_burned, 2)
            )
            db.add(nutri_record)
            db.flush()

        db.commit()
        db.refresh(new_activity)
        return {
            "name": exercise_name,
            "distance": 0, 
            "calories": round(calories_burned, 2),
            "type": "MANUAL",
            "start_date": new_activity.create_at.isoformat() if new_activity.create_at else None
        }
    except Exception as e:
        logger.error(f"Lỗi khi lưu bài tập thủ công: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================================
# LUỒNG 2: XÁC THỰC OAUTH2 VỚI STRAVA
# =========================================================================
@router.post("/strava-exchange")
async def exchange_strava_token(
    request: Request, 
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
): 
    try:
        data = await request.json()
    except Exception as e:
        raise HTTPException(status_code=422, detail="JSON không hợp lệ")

    code = data.get("code") if isinstance(data, dict) else None
    if not code:
        raise HTTPException(status_code=400, detail="Thiếu mã code")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.strava.com/oauth/token",
                data={
                    "client_id": STRAVA_CLIENT_ID,
                    "client_secret": STRAVA_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code"
                }
            )
            res_data = response.json()
            
            if "access_token" in res_data:
                access_token = res_data["access_token"]
                user = db.query(User).filter(User.user_id == user_id).first()
                if user:
                    user.strava_token = access_token
                    user.strava_refresh_token = res_data.get("refresh_token")
                    user.strava_expires_at = res_data.get("expires_at")
                    db.commit()
                return {"status": "success", "message": "Đã liên kết Strava!"}
            else:
                raise HTTPException(status_code=400, detail="Không thể đổi token")
    except Exception as e:
        print(f"🔥 LỖI STRAVA: {str(e)}") 
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def get_valid_strava_token(user: User, db: Session):
    if not user.strava_token:
        return None
    current_time = int(time.time())
    if user.strava_expires_at and current_time < (user.strava_expires_at - 300):
        return user.strava_token
        
    if user.strava_refresh_token:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://www.strava.com/oauth/token",
                    data={
                        "client_id": STRAVA_CLIENT_ID,
                        "client_secret": STRAVA_CLIENT_SECRET,
                        "grant_type": "refresh_token",
                        "refresh_token": user.strava_refresh_token
                    }
                )
                res_data = response.json()
                if "access_token" in res_data:
                    user.strava_token = res_data["access_token"]
                    user.strava_refresh_token = res_data.get("refresh_token")
                    user.strava_expires_at = res_data.get("expires_at")
                    db.commit()
                    return user.strava_token
        except Exception as e:
            logger.error(f"Lỗi khi tự động refresh token: {e}")
    return None 

# =========================================================================
# LUỒNG 3: ĐỒNG BỘ STRAVA & PHÂN TRANG DANH SÁCH HOẠT ĐỘNG
# =========================================================================
@router.get("/strava-activities")
async def get_strava_activities(
    skip: int = 0,
    limit: int = 20,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Bọc TOÀN BỘ hàm vào try...except để không lọt bất kỳ lỗi 500 nào
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        
        # CHỈ ĐỒNG BỘ STRAVA KHI Ở TRANG ĐẦU TIÊN (skip == 0) ĐỂ TRÁNH QUÁ TẢI API
        if skip == 0 and user:
            valid_token = await get_valid_strava_token(user, db)
            if valid_token:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            "https://www.strava.com/api/v3/athlete/activities?per_page=10",
                            headers={"Authorization": f"Bearer {valid_token}"}
                        )
                        
                        if response.status_code == 200:
                            strava_activities = response.json()
                            strava_ids = [str(act.get("id")) for act in strava_activities if act.get("id")]
                            
                            existing_records = db.query(Activity.external_id).filter(
                                Activity.user_id == user_id, 
                                Activity.source == "STRAVA",
                                Activity.external_id.in_(strava_ids)
                            ).all()
                            
                            existing_id_set = {record[0] for record in existing_records}
                            
                            nutri_cache = {} 
                            
                            for act in strava_activities:
                                external_id = str(act.get("id"))
                                if external_id not in existing_id_set:
                                    loai_bai_tap = act.get("name", "Strava Activity")
                                    thoi_luong_phut = act.get("moving_time", 0) // 60
                                    
                                    # ... (Giữ nguyên đoạn tính toán calo_tieu_thu, met, weight_kg...)
                                    strava_calories = act.get("calories", 0)
                                    if not strava_calories:
                                        strava_calories = act.get("kilojoules", 0) * 0.239006
                                    
                                    calo_tieu_thu = float(strava_calories)
                                    if calo_tieu_thu == 0 and thoi_luong_phut > 0:
                                        strava_type = act.get("type", "Workout")
                                        met = 5.0
                                        if strava_type == "Run": met = 7.0
                                        elif strava_type == "Ride": met = 6.0
                                        elif strava_type == "Walk": met = 3.5
                                        elif strava_type == "Swim": met = 7.0
                                        elif strava_type == "WeightTraining": met = 6.0
                                        
                                        weight_kg = getattr(user, "weight", 60.0) if user else 60.0
                                        calo_tieu_thu = thoi_luong_phut * ((met * 3.5 * weight_kg) / 200)
                                    
                                    start_date_str = act.get("start_date_local")
                                    create_at_time = datetime.now()
                                    if start_date_str:
                                        try:
                                            clean_date = start_date_str.replace("Z", "")
                                            create_at_time = datetime.fromisoformat(clean_date)
                                        except Exception:
                                            pass
                                    
                                    act_date = create_at_time.date()
                                    
                                    # Lưu Activity
                                    new_act = Activity(
                                        user_id=user_id,
                                        loai_bai_tap=loai_bai_tap,
                                        thoi_luong_phut=thoi_luong_phut,
                                        calo_tieu_thu=round(calo_tieu_thu, 2),
                                        source="STRAVA",
                                        external_id=external_id,
                                        create_at=create_at_time
                                    )
                                    db.add(new_act)
                                    
                                    # 2. XỬ LÝ NUTRI VỚI BỘ NHỚ TẠM
                                    # Kiểm tra xem ngày này đã có trong bộ nhớ tạm chưa
                                    if act_date not in nutri_cache:
                                        # Nếu chưa, thử tìm trong DB
                                        existing_nutri = db.query(Nutri).filter(
                                            Nutri.user_id == user_id, 
                                            Nutri.date_log == act_date
                                        ).first()
                                        
                                        if existing_nutri:
                                            nutri_cache[act_date] = existing_nutri
                                        else:
                                            # Nếu DB cũng chưa có, tạo mới và lưu vào DB + Bộ nhớ tạm
                                            new_nutri = Nutri(
                                                user_id=user_id,
                                                date_log=act_date,
                                                calo_the_duc=0 # Khởi tạo calo = 0
                                            )
                                            db.add(new_nutri)
                                            nutri_cache[act_date] = new_nutri
                                            
                                    # 3. CỘNG DỒN CALO VÀO BẢN GHI TRONG BỘ NHỚ TẠM
                                    current_calo_td = nutri_cache[act_date].calo_the_duc or 0
                                    nutri_cache[act_date].calo_the_duc = float(current_calo_td) + float(calo_tieu_thu)
                            
                            # 4. CHỈ COMMIT MỘT LẦN DUY NHẤT SAU KHI KẾT THÚC VÒNG LẶP
                            db.commit()
                except Exception as e:
                    logger.warning(f"Lỗi đồng bộ Strava: {e}")
                    traceback.print_exc() # Thêm dòng này để nếu API Strava lỗi, nó cũng báo chi tiết

        # Truy vấn có áp dụng phân trang
        db_activities = db.query(Activity).filter(
            Activity.user_id == user_id
        ).order_by(Activity.create_at.desc()).offset(skip).limit(limit).all()
        
        formatted_activities = []
        for act in db_activities:
            formatted_activities.append({
                "name": act.loai_bai_tap,
                "distance": 0, 
                #Thêm 'or 0' để chặn lỗi float(None)
                "calories": float(act.calo_tieu_thu or 0),
                "type": act.source,
                "start_date": act.create_at.isoformat() if act.create_at else None
            })
            
        return formatted_activities

    except Exception as e:
        print("🚨 LỖI CRASH Ở GET STRAVA ACTIVITIES:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải lịch sử: {str(e)}")
# =========================================================================
# LUỒNG 4: THỐNG KÊ BIỂU ĐỒ TUẦN
# =========================================================================
@router.get("/weekly-stats")
def get_weekly_exercise_stats(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    start_date = today - timedelta(days=6)
    
    stats_dict = {}
    for i in range(7):
        day = start_date + timedelta(days=i)
        stats_dict[day.strftime("%d/%m")] = 0
        
    nutri_logs = db.query(Nutri.date_log, Nutri.calo_the_duc).filter(
        Nutri.user_id == user_id,
        Nutri.date_log >= start_date,
        Nutri.date_log <= today
    ).all()
    
    for log in nutri_logs:
        day_str = log.date_log.strftime("%d/%m")
        if day_str in stats_dict:
            stats_dict[day_str] = float(log.calo_the_duc or 0)
            
    return {
        "labels": list(stats_dict.keys()),
        "data": list(stats_dict.values())
    }
#////////////////////////////////////////////////////////////////////////////////////////
#Hàm seed data activity_dic chỉ dùng 1 lần
from models.activity_dic import ActivityDic

@router.post("/seed-activity-dic")
def seed_activity_dictionary(db: Session = Depends(get_db)):
    """API dùng để đổ dữ liệu mẫu vào bảng ActivityDic 1 lần duy nhất"""
    
    # Kiểm tra xem bảng đã có dữ liệu chưa để tránh bị duplicate
    if db.query(ActivityDic).first():
        return {"message": "Dữ liệu đã tồn tại, không cần thêm mới!"}

    activities_data = [
        {"exercise_key": "di_bo_binh_thuong", "name": "Đi bộ bình thường", "met": 3.5, "icon": "🚶"},
        {"exercise_key": "di_bo_nhanh", "name": "Đi bộ nhanh", "met": 5.0, "icon": "🚶‍♂️"},
        {"exercise_key": "chay_bo_vua", "name": "Chạy bộ vừa", "met": 7.0, "icon": "🏃"},
        {"exercise_key": "chay_bo_nhanh", "name": "Chạy bộ nhanh", "met": 10.0, "icon": "🏃‍♂️"},
        {"exercise_key": "dap_xe_nhe", "name": "Đạp xe nhẹ", "met": 4.5, "icon": "🚴"},
        {"exercise_key": "dap_xe_nang", "name": "Đạp xe nặng", "met": 8.5, "icon": "🚴‍♂️"},
        {"exercise_key": "boi_loi_nhe", "name": "Bơi lội nhẹ", "met": 5.8, "icon": "🏊"},
        {"exercise_key": "boi_loi_nhanh", "name": "Bơi lội nhanh", "met": 9.8, "icon": "🏊‍♂️"},
        {"exercise_key": "cheo_sup", "name": "Chèo SUP", "met": 5.0, "icon": "🚣"},
        {"exercise_key": "yoga", "name": "Yoga", "met": 3.0, "icon": "🧘"},
        {"exercise_key": "aerobic", "name": "Aerobic", "met": 6.5, "icon": "💃"},
        {"exercise_key": "tap_ta_nhe", "name": "Tập tạ nhẹ", "met": 3.0, "icon": "🏋️"},
        {"exercise_key": "tap_ta_nang", "name": "Tập tạ nặng", "met": 6.0, "icon": "💪"},
        {"exercise_key": "bodyweight", "name": "Bodyweight", "met": 8.0, "icon": "🤸"},
        {"exercise_key": "hiit", "name": "HIIT", "met": 8.0, "icon": "⏱️"},
        {"exercise_key": "may_elip", "name": "Máy chạy Elip", "met": 5.0, "icon": "⛷️"},
        {"exercise_key": "leo_cau_thang", "name": "Leo cầu thang", "met": 8.0, "icon": "🧗"},
        {"exercise_key": "cau_long", "name": "Cầu lông", "met": 5.5, "icon": "🏸"},
        {"exercise_key": "tennis", "name": "Tennis", "met": 7.3, "icon": "🎾"},
        {"exercise_key": "bong_ban", "name": "Bóng bàn", "met": 4.0, "icon": "🏓"},
        {"exercise_key": "bong_da", "name": "Bóng đá", "met": 8.0, "icon": "⚽"},
        {"exercise_key": "bong_ro", "name": "Bóng rổ", "met": 8.0, "icon": "🏀"},
        {"exercise_key": "bong_chuyen", "name": "Bóng chuyền", "met": 4.0, "icon": "🏐"},
        {"exercise_key": "bida", "name": "Bida", "met": 2.5, "icon": "🎱"},
        {"exercise_key": "bowling", "name": "Bowling", "met": 3.0, "icon": "🎳"},
        {"exercise_key": "golf", "name": "Golf", "met": 4.3, "icon": "⛳"},
        {"exercise_key": "nhay_day_vua", "name": "Nhảy dây vừa", "met": 8.8, "icon": "🪢"},
        {"exercise_key": "nhay_day_nhanh", "name": "Nhảy dây nhanh", "met": 11.8, "icon": "⚡"},
        {"exercise_key": "da_cau", "name": "Đá cầu", "met": 5.5, "icon": "🦶"},
        {"exercise_key": "lac_vong", "name": "Lắc vòng", "met": 4.5, "icon": "⭕"},
        {"exercise_key": "truot_patin", "name": "Trượt patin", "met": 7.0, "icon": "🛼"},
        {"exercise_key": "zumba", "name": "Zumba", "met": 5.0, "icon": "🕺"},
        {"exercise_key": "dam_bao_cat", "name": "Đấm bao cát", "met": 5.5, "icon": "🥊"},
        {"exercise_key": "vo_thuat", "name": "Võ thuật", "met": 10.0, "icon": "🥋"}
    ]

    for item in activities_data:
        new_record = ActivityDic(**item)
        db.add(new_record)
    
    db.commit()
    return {"message": f"Đã thêm thành công {len(activities_data)} bài tập vào database!"}