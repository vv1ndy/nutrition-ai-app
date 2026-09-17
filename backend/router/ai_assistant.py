import json
import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models.user import User
from models.nutrition import Nutri, TargetNutri # 🔥 Thêm import 2 bảng này

from security import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


model = genai.GenerativeModel('gemini-3.6-flash')

@router.get("/suggest-meal")
def suggest_meal(
    bua_an: str = Query(..., description="Bữa ăn muốn gợi ý (Ví dụ: Sáng, Trưa, Tối, Ăn vặt)"),
    user_id: int = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """API Gọi Gemini AI để gợi ý 5 món ăn cho một bữa cụ thể dựa trên hồ sơ y tế"""
   
    # 1. Lấy thông tin y tế của người dùng từ DB
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin người dùng")
    
    current_year = date.today().year
    tuoi = current_year - user.nam_sinh if user.nam_sinh else "Không xác định"
    
    di_ung_str = user.di_ung if user.di_ung else "Không có"
    benh_nen_str = user.benh_nen if user.benh_nen else "Không có"
    
    # 2. 🔥 TỰ ĐỘNG TÍNH TOÁN CALO CÒN LẠI TỪ DATABASE
    # Lấy mục tiêu Calo từ bảng TargetNutri
    target = db.query(TargetNutri).filter(TargetNutri.user_id == user_id).order_by(TargetNutri.target_nutri_id.desc()).first()
    target_cal = target.target_calories if target else 2000
    target_pro = target.target_protein if target else 150
    target_carb = target.target_carb if target else 250
    target_fat = target.target_fat if target else 60
    # Lấy số Calo đã tiêu thụ hôm nay từ bảng Nutri
    nutri_today = db.query(Nutri).filter(Nutri.user_id == user_id, Nutri.date_log == date.today()).first()
    consumed_cal = nutri_today.total_calories if nutri_today else 0
    consumed_pro = nutri_today.total_protein if nutri_today else 0
    consumed_carb = nutri_today.total_carb if nutri_today else 0
    consumed_fat = nutri_today.total_fat if nutri_today else 0
    # Số calo còn lại = Mục tiêu - Đã ăn
    calo_con_lai = int(target_cal - consumed_cal)
    pro_con_lai = round(target_pro - consumed_pro, 1)
    carb_con_lai = round(target_carb - consumed_carb, 1)
    fat_con_lai = round(target_fat - consumed_fat, 1)
    # 3. Xây dựng Kịch bản Calo cho Prompt
    if calo_con_lai > 300:
        calo_prompt = f"- Mục tiêu: Thiết kế món ăn sao cho calo của từng gợi ý không vượt quá {calo_con_lai} kcal."
    elif calo_con_lai > 0:
        calo_prompt = f"- CẢNH BÁO: Khách hàng chỉ còn {calo_con_lai} kcal trong ngày. BẮT BUỘC chỉ gợi ý các món RẤT NHẸ (salad, canh trong, trái cây ít ngọt) để không vượt quá giới hạn này."
    else:
        calo_prompt = f"- CẢNH BÁO ĐỎ: Khách hàng ĐÃ VƯỢT QUÁ lượng calo cho phép hôm nay (âm {abs(calo_con_lai)} kcal) nhưng vẫn muốn ăn bữa {bua_an}. BẮT BUỘC TÌM CÁC MÓN 'CỨU TRỢ' CỰC KỲ ÍT CALO (dưới 80 kcal, ví dụ: nước ép cần tây, 1 quả dưa chuột, canh rong biển chay, nước lọc pha chanh) giúp no giả, hỗ trợ tiêu hóa và giảm thiểu tối đa sự tích mỡ."
    macro_prompt = f"- Định mức Macros cần bù đắp (Quan trọng): Protein còn thiếu {pro_con_lai}g, Carb còn thiếu {carb_con_lai}g, Fat còn thiếu {fat_con_lai}g. Hãy thiết kế món ăn ưu tiên bổ sung nhóm chất có số lượng còn thiếu nhiều, và CẮT GIẢM TỐI ĐA các thành phần thuộc nhóm chất có số âm (tức là đã ăn lố)."
    prompt = f"""
Bạn là một chuyên gia dinh dưỡng lâm sàng am hiểu ẩm thực Việt Nam. Khách hàng đang cần 5 gợi ý thực đơn cho bữa {bua_an}.
- Dị ứng (TUYỆT ĐỐI TRÁNH): {di_ung_str}.
- Bệnh nền (PHẢI LỰA CHỌN THỰC PHẨM AN TOÀN): {benh_nen_str}.
- Độ tuổi: {tuoi} tuổi.
- Calo còn lại trong ngày: {calo_con_lai} kcal.
{calo_prompt}
{macro_prompt}

YÊU CẦU QUAN TRỌNG:
1. ĐẬM CHẤT VIỆT NAM & THỰC TẾ: Ưu tiên tối đa các món ăn quen thuộc, dân dã, thường ngày của người Việt (ví dụ: mâm cơm gia đình 3 món mặn-canh-xào, bún bò, phở gà, hủ tiếu, xôi, bánh mì...). Đảm bảo nguyên liệu dễ tìm, dễ nấu ở Việt Nam.
2. PHÂN BỔ CALO HỢP LÝ (RẤT QUAN TRỌNG): TUYỆT ĐỐI KHÔNG sử dụng hết toàn bộ {calo_con_lai} kcal cho một bữa ăn (trừ khi số calo còn lại đã dưới 400). Hãy tự ước lượng và đề xuất mức calo phù hợp với tính chất của bữa {bua_an}.Khéo léo kết hợp nguyên liệu để khớp với tình trạng thiếu/dư Macros của khách hàng:
   - Bữa Sáng: Thường rơi vào khoảng 300 - 500 kcal.
   - Bữa Trưa: Thường rơi vào khoảng 500 - 700 kcal.
   - Bữa Tối: Thường rơi vào khoảng 400 - 600 kcal.
   - Ăn vặt / Phụ: Thường rơi vào khoảng 100 - 250 kcal.
   => Calo của các món gợi ý phải nằm trong các ngưỡng tiêu chuẩn trên và KHÔNG ĐƯỢC VƯỢT QUÁ {calo_con_lai} kcal.
3. LỜI KHUYÊN HỮU ÍCH: Mỗi món ăn phải đi kèm một lời khuyên thiết thực.

Yêu cầu trả về JSON, không giải thích thêm, không dùng khối lệnh (code block) hay markdown. Cấu trúc bắt buộc:
{{
    "bua_an": "{bua_an}",
    "goi_y": [
        {{
            "ten_mon_an": "<Tên món ăn chi tiết, , đi kèm khẩu phần khuyến nghị, ví dụ: 1 bát cơm vừa (khoảng 200g), 100g thịt, 1 bát canh rau ngót (khoảng 150ml)>",
            "meal_calories": <số nguyên ước tính, đơn vị kcal>,
            "meal_protein_g": <số thực ước tính, đơn vị gam>,
            "meal_carb_g": <số thực ước tính, đơn vị gam>,
            "meal_fat_g": <số thực ước tính, đơn vị gam>,
            "loi_khuyen": "<Tại sao món này tốt cho họ, và nhắc nhở nhẹ nhàng về tình trạng calo và món đó giúp cân bằng marcos hiện tại ra sao>"
        }}
    ]
}}
    """

    try:
        # 4. Gọi API Gemini
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            ),
        )
        
        # 5. Trả về kết quả cho Frontend
        return {
            "status": "success",
            "data": json.loads(response.text)
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, 
            detail="AI phản hồi không đúng định dạng JSON. Vui lòng thử lại."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Lỗi hệ thống AI: {str(e)}"
        )