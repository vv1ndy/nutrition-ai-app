import os
import json
import re
import unicodedata
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import cloudinary
import cloudinary.uploader
import google.generativeai as genai
from dotenv import load_dotenv
from database import get_db
from models.meal import Meal  
from models.food import Food  # 🔥 Thêm import model Food
from security import get_current_user  

router = APIRouter(prefix="/api/food", tags=["Scan AI Món Ăn"])

# Cấu hình Cloudinary
cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
)

# Cấu hình Gemini AI
load_dotenv()

# Lấy mã API một cách an toàn
my_api_key = os.getenv("GEMINI_API_KEY")

# Cấu hình cho AI
genai.configure(api_key=my_api_key)
def remove_vietnamese_accents(text: str) -> str:
    """Hàm chuyển đổi chuỗi tiếng Việt có dấu thành không dấu"""
    text = re.sub(r'[đĐ]', 'd', text)
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text

@router.post("/scan-ai")
async def scan_food_image(
    file: UploadFile = File(...),
    # 🔥 HỨNG NGỮ CẢNH TỪ FRONTEND QUA FORMDATA
    calo_con_lai: str = Form("0"),
    di_ung: str = Form("Không có"),
    benh_nen: str = Form("Không có"),
    db: Session = Depends(get_db)
):
    try: 
        # 1. Đẩy ảnh lên Cloudinary
        image_bytes = await file.read()
        upload_result = cloudinary.uploader.upload(image_bytes, folder="nutrition_app/foods")
        image_url = upload_result.get("secure_url")

        # 2. Gọi Gemini AI
        model = genai.GenerativeModel('gemini-3.6-flash') 
        
        # 🔥 ĐƯA NGỮ CẢNH VÀO PROMPT (Lưu ý dấu {{ và }} để không bị lỗi JSON trong Python f-string)
        prompt = f"""
        Hãy đóng vai một chuyên gia dinh dưỡng. Phân tích bức ảnh món ăn này.
        Dữ liệu sức khỏe hiện tại của tôi:
        - Lượng calo còn lại có thể nạp hôm nay: {calo_con_lai} kcal
        - Bệnh nền: {benh_nen}
        - Dị ứng thực phẩm: {di_ung}

        Dựa vào các thông tin trên, hãy trả về kết quả CHÍNH XÁC dưới dạng chuỗi JSON thuần túy (không kèm markdown như ```json) với cấu trúc sau:
        {{
            "ten_mon": "Tên món ăn tiếng Việt",
            "calories": số thực chuẩn cho 1 khẩu phần (kcal),
            "protein_g": số thực (gram),
            "carb_g": số thực (gram),
            "fat_g": số thực (gram),
            "loi_khuyen": "Lời khuyên ngắn gọn (2-3 câu). Nếu món ăn vi phạm dị ứng hoặc không tốt cho bệnh nền, phải CẢNH BÁO NGHIÊM KHẮC. Đánh giá xem lượng calo của món ăn có phù hợp với calo còn lại không."
        }}
        """
        
        image_part = {
            "mime_type": file.content_type or "image/jpeg",
            "data": image_bytes
        }
        
        response = model.generate_content([prompt, image_part])
        text_response = response.text.strip()
        
        if text_response.startswith("```"):
            text_response = text_response.split("```")[1]
            if text_response.startswith("json"):
                text_response = text_response[4:]
                
        food_info = json.loads(text_response.strip())
        
        # 3. Khối logic tự động lưu món mới vào bảng Food (Giữ nguyên của bạn)
        try:
            ten_mon = food_info.get("ten_mon", "")
            if ten_mon:
                raw_search = " ".join(ten_mon.lower().split())
                unaccent_search = remove_vietnamese_accents(raw_search)
                
                existing_food = db.query(Food).filter(
                    or_(
                        func.lower(Food.ten_mon).ilike(f"%{raw_search}%"),
                        Food.ten_chuan_hoa.ilike(f"%{unaccent_search}%")
                    )
                ).first()

                if not existing_food:
                    new_food = Food(
                        ten_mon=ten_mon,
                        ten_chuan_hoa=unaccent_search,
                        don_vi="phần",
                        kich_thuoc_khau_phan=1.0,
                        calories=float(food_info.get("calories", 0.0)),
                        protein_g=float(food_info.get("protein_g", 0.0)),
                        carb_g=float(food_info.get("carb_g", 0.0)),
                        fat_g=float(food_info.get("fat_g", 0.0))
                    )
                    db.add(new_food)
                    db.commit()
            else:
                print("LỖI: AI không trả về trường 'ten_mon' trong JSON.")
                
        except Exception as db_err:
            print(f"!!! LỖI NGHIÊM TRỌNG KHI LƯU DB: {str(db_err)}")
            db.rollback()

        # 4. Gắn URL và trả về cho Frontend
        food_info["image_url"] = image_url
        return food_info

    except Exception as e:
        print(f"Lỗi Scan AI: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/save-log")
async def save_food_log(
    data: dict,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """API Lưu kết quả quét AI vào bảng Meal (Lịch sử món ăn)"""
    try:
        new_meal = Meal(
            user_id=user_id,
            ten_mon_an=data.get('ten_mon'),
            meal_calories=data.get('calories', 0),
            meal_protein_g=data.get('protein_g', 0.0),
            meal_carb_g=data.get('carb_g', 0.0),
            meal_fat_g=data.get('fat_g', 0.0),
            image_url=data.get('image_url'),
            bua_an=data.get('bua_an', 'Khác') 
        )

        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)

        return {
            "status": "success", 
            "message": "Đã lưu món ăn thành công",
            "meal_id": new_meal.meal_id
        }
        
    except Exception as e:
        db.rollback() 
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu vào DB: {str(e)}")