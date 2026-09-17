from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta # 🔥 Import thêm thư viện thời gian để tính tuổi
from typing import Optional# 🔥 Import Optional cho các trường có thể để trống
from pydantic import BaseModel # 🔥 Import thêm BaseModel để làm form nhận dữ liệu
# Import các thành phần hệ thống
from database import get_db
from models.user import User
from schemas.user import UserCreate, UserResponse
from models.nutrition import TargetNutri



from security import get_current_user 

# Khởi tạo APIRouter
router = APIRouter(
    prefix="/api/users", # Đặt tiền tố chung cho tất cả API trong file này
    tags=["Người dùng"]
)
# 1. Khai báo cấu trúc hứng dữ liệu từ màn hình OnboardingScreen
class OnboardingData(BaseModel):
    user_id: int
    gioi_tinh: str           # 🔥 Đã bổ sung trường Giới tính
    nam_sinh: int
    chieu_cao: float
    can_nang: float
    muc_do_van_dong: str
    muc_tieu_can_nang: str="Giữ cân"
    benh_nen: Optional[str] = None
    di_ung: Optional[str] = None

# 2. API đón dữ liệu từ OnboardingScreen
@router.post("/onboarding")
def setup_user_profile(data: OnboardingData, db: Session = Depends(get_db)):
    """API lưu thông tin cá nhân lần đầu và tự động thiết lập Target Nutri"""
    # 1. TÌM VÀ CẬP NHẬT BẢNG USER
    user = db.query(User).filter(User.user_id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")

    user.gioi_tinh = data.gioi_tinh
    user.nam_sinh = data.nam_sinh
    user.chieu_cao = data.chieu_cao
    user.can_nang = data.can_nang
    user.muc_do_van_dong = data.muc_do_van_dong
    user.benh_nen = data.benh_nen
    user.di_ung = data.di_ung

    # 2. TÍNH BMR & TDEE 
    current_year = datetime.now().year
    tuoi = current_year - data.nam_sinh

    if data.gioi_tinh.lower() == "nam":
        bmr = (10 * data.can_nang) + (6.25 * data.chieu_cao) - (5 * tuoi) + 5
    else:
        bmr = (10 * data.can_nang) + (6.25 * data.chieu_cao) - (5 * tuoi) - 161

    he_so = {
        "Ít vận động": 1.2,
        "Nhẹ": 1.375,
        "Vừa": 1.55,
        "Nhiều": 1.725,
        "Rất nhiều": 1.9
    }
    multiplier = he_so.get(data.muc_do_van_dong, 1.2)
    tdee = bmr * multiplier
    calo_muc_tieu = tdee
    muc_tieu = getattr(data, 'muc_tieu_can_nang', 'Giữ cân') # Dùng data cho onboarding, update_data cho update_profile
        
    if muc_tieu == "Giảm cân":
        calo_muc_tieu = tdee - 500
    elif muc_tieu == "Tăng cân":
        calo_muc_tieu = tdee + 500
        
        # Đảm bảo calo không bị rớt xuống mức nguy hiểm (chuẩn y khoa tối thiểu ~1200 kcal)
    calo_muc_tieu = max(1200, calo_muc_tieu)

        #3. Tính Macros dựa trên CALO_MUC_TIEU (không phải tdee cơ bản nữa)
    carb_ratio = 0.50
    pro_ratio = 0.30
    fat_ratio = 0.20

    benh_nen_lower = user.benh_nen.lower() if user.benh_nen else ""
    if "tiểu đường" in benh_nen_lower or "diabetes" in benh_nen_lower:
        carb_ratio = 0.40
        pro_ratio = 0.35
        fat_ratio = 0.25
    elif "gout" in benh_nen_lower or "gút" in benh_nen_lower:
        carb_ratio = 0.55
        pro_ratio = 0.20
        fat_ratio = 0.25

    carb_g = (calo_muc_tieu * carb_ratio) / 4
    pro_g = (calo_muc_tieu * pro_ratio) / 4
    fat_g = (calo_muc_tieu * fat_ratio) / 9
    old_targets = db.query(TargetNutri).filter(
        TargetNutri.user_id == data.user_id,
        TargetNutri.target_status == "ACTIVE"
    ).all()
    
    for old in old_targets:
        old.target_status = "INACTIVE"
        old.ngay_ket_thuc = datetime.now().date()

    new_target = TargetNutri(
        user_id=data.user_id,
        target_calories=round(calo_muc_tieu, 2),
        target_protein=round(pro_g, 2),
        target_carb=round(carb_g, 2),
        target_fat=round(fat_g, 2),
        muc_tieu_can_nang=getattr(data, 'muc_tieu_can_nang', 'Giữ cân'),
        water_target_ml=int(data.can_nang * 40),
        ngay_bat_dau=datetime.now().date(),
        ngay_ket_thuc=datetime.now().date() + timedelta(days=84),
        target_status="ACTIVE"
    )
    db.add(new_target)

    # Chốt lưu toàn bộ xuống SQL Server
    db.commit()
    return {
        "status": "success", 
        "message": "Cập nhật hồ sơ và thiết lập mục tiêu dinh dưỡng thành công!"
    }
# 👇 ĐÂY LÀ PHẦN BỔ SUNG THÊM API /users/me
# ==========================================
@router.get("/me")
def get_my_profile(
    user_id: int = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """API lấy thông tin cá nhân và mục tiêu dinh dưỡng từ Database"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # Kéo mục tiêu dinh dưỡng từ bảng target_nutri
    target = db.query(TargetNutri).filter(TargetNutri.user_id == user_id,TargetNutri.target_status == "ACTIVE").first()
    
    tdee = target.target_calories if target else 2000

    return {
        "user_id": user.user_id,
        "ho_ten": user.ho_ten,
        "email": user.email,
        "chieu_cao": user.chieu_cao,
        "can_nang": user.can_nang,
        "nam_sinh": user.nam_sinh,
        "gioi_tinh": user.gioi_tinh,
        "muc_do_van_dong": user.muc_do_van_dong,
        "di_ung": user.di_ung,
        "benh_nen": user.benh_nen,
        "muc_tieu_can_nang": target.muc_tieu_can_nang,
        "water_target_ml": target.water_target_ml if target else 2000,
        "tdee": target.target_calories if target else 2000, 
        "ngay_bat_dau": target.ngay_bat_dau if target else None,
        "ngay_ket_thuc": target.ngay_ket_thuc if target else None,
        "macros": {
            "carb": target.target_carb if target else 0,
            "protein": target.target_protein if target else 0,
            "fat": target.target_fat if target else 0
        } if target else None
    }
# =========================================================
# 👇 ĐÂY LÀ PHẦN BỔ SUNG ĐỂ LƯU DỮ LIỆU CẬP NHẬT VÀO DATABASE
# =========================================================

# Khai báo cấu trúc dữ liệu gửi lên từ App
class UserUpdate(BaseModel):
    chieu_cao: Optional[float] = None
    can_nang: Optional[float] = None
    muc_do_van_dong: Optional[str] = None
    muc_tieu_can_nang: Optional[str] = None
    nam_sinh: Optional[int] = None
    gioi_tinh: Optional[str] = None
    benh_nen: Optional[str] = None
    di_ung: Optional[str] = None

@router.put("/me")
def update_my_profile(
    update_data: UserUpdate,
    user_id: int = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """API Đồng bộ dữ liệu cập nhật từ App xuống Database và tính lại Target Nutri"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # 1. Cập nhật thông tin mới vào bảng User
    if update_data.chieu_cao is not None:
        user.chieu_cao = update_data.chieu_cao
    if update_data.can_nang is not None:
        user.can_nang = update_data.can_nang
    if update_data.muc_do_van_dong is not None:
        user.muc_do_van_dong = update_data.muc_do_van_dong
    if update_data.nam_sinh is not None:
        user.nam_sinh = update_data.nam_sinh
    if update_data.gioi_tinh is not None:
        user.gioi_tinh = update_data.gioi_tinh
    if update_data.benh_nen is not None:
        user.benh_nen = update_data.benh_nen
    if update_data.di_ung is not None:
        user.di_ung = update_data.di_ung

    db.flush()

    # 2. Tự động tính toán lại TDEE và Macros nếu user đã có đủ thông tin cơ bản
    if user.can_nang and user.chieu_cao and user.nam_sinh and user.gioi_tinh:
        current_year = datetime.now().year
        tuoi = current_year - user.nam_sinh

        # Tính BMR
        if user.gioi_tinh.lower() == "nam":
            bmr = (10 * user.can_nang) + (6.25 * user.chieu_cao) - (5 * tuoi) + 5
        else:
            bmr = (10 * user.can_nang) + (6.25 * user.chieu_cao) - (5 * tuoi) - 161

        # Nhân hệ số vận động
        he_so = {
            "Ít vận động": 1.2,
            "Nhẹ": 1.375,
            "Vừa": 1.55,
            "Nhiều": 1.725,
            "Rất nhiều": 1.9
        }
        multiplier = he_so.get(user.muc_do_van_dong, 1.2)
        tdee = bmr * multiplier

        # 3. Lấy hoặc tạo bảng TargetNutri
        target = db.query(TargetNutri).filter(TargetNutri.user_id == user_id).first()
        if not target:
            target = TargetNutri(
                user_id=user_id,
                ngay_bat_dau=datetime.now().date(),
                target_status="ACTIVE"
            )
            db.add(target)

        # 🔥 4. BẺ LÁI CALO THEO MỤC TIÊU (Tăng/Giảm/Giữ cân)
        calo_muc_tieu = tdee
        
        # Lấy mục tiêu từ data gửi lên, nếu không có thì lấy mục tiêu cũ trong DB, mặc định là Giữ cân
        muc_tieu = getattr(update_data, 'muc_tieu_can_nang', getattr(target, 'muc_tieu_can_nang', 'Giữ cân'))
        
        if muc_tieu == "Giảm cân":
            calo_muc_tieu = tdee - 500
        elif muc_tieu == "Tăng cân":
            calo_muc_tieu = tdee + 500
            
        # Chốt chặn y khoa: Calo không được rớt xuống dưới 1200 kcal/ngày
        calo_muc_tieu = max(1200, calo_muc_tieu)

        # 5. Tính Macros & Bẻ lái theo bệnh nền (Dựa trên CALO_MUC_TIEU)
        carb_ratio = 0.50
        pro_ratio = 0.30
        fat_ratio = 0.20

        benh_nen_lower = user.benh_nen.lower() if user.benh_nen else ""
        if "tiểu đường" in benh_nen_lower or "diabetes" in benh_nen_lower:
            carb_ratio = 0.40
            pro_ratio = 0.35
            fat_ratio = 0.25
        elif "gout" in benh_nen_lower or "gút" in benh_nen_lower:
            carb_ratio = 0.55
            pro_ratio = 0.20
            fat_ratio = 0.25

        carb_g = (calo_muc_tieu * carb_ratio) / 4
        pro_g = (calo_muc_tieu * pro_ratio) / 4
        fat_g = (calo_muc_tieu * fat_ratio) / 9
        old_targets = db.query(TargetNutri).filter(
            TargetNutri.user_id == user_id,
            TargetNutri.target_status == "ACTIVE"
        ).all()
        
        for old in old_targets:
            old.target_status = "INACTIVE"
            old.ngay_ket_thuc = datetime.now().date() # Chốt sổ ngày kết thúc là hôm nay
        new_target = TargetNutri(
            user_id=user_id,
            target_calories=round(calo_muc_tieu, 2),
            target_protein=round(pro_g, 2),
            target_carb=round(carb_g, 2),
            target_fat=round(fat_g, 2),
            muc_tieu_can_nang=muc_tieu,
            water_target_ml=int(user.can_nang * 40),
            ngay_bat_dau=datetime.now().date(),
            ngay_ket_thuc=datetime.now().date() + timedelta(days=32), # Lộ trình 1 tháng
            target_status="ACTIVE"
        )
        db.add(new_target)
    # LỆNH QUAN TRỌNG NHẤT: Chốt lưu toàn bộ
    db.commit()
    db.refresh(user)
    
    return {"status": "success", "message": "Đã đồng bộ hồ sơ và cập nhật lại mục tiêu dinh dưỡng!"}