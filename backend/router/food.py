import json
import unicodedata
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel
import google.generativeai as genai

from database import get_db
from models.food import Food

router = APIRouter(prefix="/api/food", tags=["Thức ăn"])

class ManualFoodEntry(BaseModel):
    ten_mon_an: str
    khau_phan: float = 1.0

def remove_vietnamese_accents(text: str) -> str:
    text = re.sub(r'[đĐ]', 'd', text)
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text

def get_nutrition_from_gemini(food_name: str) -> str:
    """Hàm giao tiếp với Gemini - Đã cập nhật Prompt lấy thêm Định lượng & Lời khuyên"""
    prompt = f"""Bạn là một chuyên gia dinh dưỡng. Hãy ước lượng thành phần dinh dưỡng trung bình cho 1 KHẨU PHẦN PHỔ BIẾN NHẤT của món ăn: '{food_name}'.

YÊU CẦU BẮT BUỘC CHUẨN ĐẦU RA:
1. Bạn CHỈ ĐƯỢC PHÉP trả về một object JSON duy nhất, tuyệt đối KHÔNG có văn bản giải thích.
2. KHÔNG sử dụng block code markdown (không dùng dấu ```json).
3. Định dạng JSON bắt buộc phải chứa đúng các key sau:
{{
    "ten_mon": "Tên món ăn chuẩn hóa có dấu",
    "khau_phan_chuan": "Định lượng chuẩn cho mỗi khẩu phần bằng gram hoặc ml để người dùng dễ hình dung (Ví dụ: '1 bát vừa (khoảng 300g)', '1 ly (250ml)', '1 đĩa vừa (200g)', '1 cái (150g)')",
    "calories": <số float>,
    "protein_g": <số float>,
    "carb_g": <số float>,
    "fat_g": <số float>,
    "loi_khuyen": "Một lời khuyên dinh dưỡng cực kỳ ngắn gọn (dưới 20 chữ), giọng điệu vui vẻ, xưng hô 'bạn' với người dùng."
}}"""
    
    model = genai.GenerativeModel('gemini-3.6-flash')
    response = model.generate_content(prompt)
    return response.text

@router.post("/manual-entry")
def add_food_manually(request: ManualFoodEntry, db: Session = Depends(get_db)):
    """API Nhập món: Đã được bọc Try-Catch an toàn tuyệt đối"""
    try:
        raw_search = " ".join(request.ten_mon_an.lower().split())
        unaccent_search = remove_vietnamese_accents(raw_search) 
        
        # 1. Truy vấn Database (Nếu Database thiếu cột, lỗi sẽ bị bắt ngay tại đây)
        existing_food = db.query(Food).filter(
            or_(
                func.lower(Food.ten_mon).ilike(f"%{raw_search}%"),
                Food.ten_chuan_hoa.ilike(f"%{unaccent_search}%")
            )
        ).first()

        # NẾU CÓ SẴN TRONG DATABASE
        if existing_food:
            return {
                "status": "success",
                "source": "database",
                "message": "Đã tìm thấy dữ liệu trong hệ thống.",
                "data": {
                    "food_id": existing_food.food_id,
                    "ten_mon": existing_food.ten_mon,
                    "calories": float(existing_food.calories or 0.0),
                    "protein_g": float(existing_food.protein_g or 0.0),
                    "carb_g": float(existing_food.carb_g or 0.0),
                    "fat_g": float(existing_food.fat_g or 0.0),
                    "unit": existing_food.don_vi or "phần",
                    "kich_thuoc_khau_phan": float(existing_food.kich_thuoc_khau_phan or 1.0),
                    "loi_khuyen": getattr(existing_food, 'loi_khuyen', None) or 'Món này ngon tuyệt! Chúc bạn ngon miệng nhé!'
                }
            }

        # 2. NẾU KHÔNG CÓ TRONG DB -> GỌI AI GEMINI
        raw_text = get_nutrition_from_gemini(request.ten_mon_an)
        #Làm sạch dữ liệu nhận về từ AI (lọc bỏ markdown, dấu cách, dấu xuống dòng dư thừa)
        clean_text = raw_text.strip()
        if clean_text.startswith("```json"): clean_text = clean_text[7:]
        if clean_text.startswith("```"): clean_text = clean_text[3:]
        if clean_text.endswith("```"): clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        nutri_data = json.loads(clean_text)
        ten_mon_ai = nutri_data.get("ten_mon", request.ten_mon_an)
        
        new_food = Food(
            ten_mon=ten_mon_ai,
            ten_chuan_hoa=remove_vietnamese_accents(ten_mon_ai.lower()),
            don_vi=nutri_data.get("khau_phan_chuan", "phần"),
            kich_thuoc_khau_phan=1.0,
            calories=nutri_data.get("calories", 0.0),
            protein_g=nutri_data.get("protein_g", 0.0),
            carb_g=nutri_data.get("carb_g", 0.0),
            fat_g=nutri_data.get("fat_g", 0.0),
            loi_khuyen=nutri_data.get("loi_khuyen", "Một món mới tinh! Nhớ ăn uống điều độ bạn nhé!")
        )
        
        db.add(new_food)
        db.commit()
        db.refresh(new_food)#Để lấy food_id mới tạo ra để trả về cho Frontend để lưu vào bảng meal

        return {
            "status": "success",
            "source": "gemini",
            "message": "AI đã phân tích món mới.",
            "data": {
                "food_id": new_food.food_id,
                "ten_mon": new_food.ten_mon,
                "calories": float(new_food.calories or 0.0),
                "protein_g": float(new_food.protein_g or 0.0),
                "carb_g": float(new_food.carb_g or 0.0),
                "fat_g": float(new_food.fat_g or 0.0),
                "unit": new_food.don_vi or "phần",
                "kich_thuoc_khau_phan": float(new_food.kich_thuoc_khau_phan or 1.0),
                "loi_khuyen": new_food.loi_khuyen
            }
        }

    except Exception as e:
        # Tóm gọn MỌI LỖI (kể cả lỗi Database) và trả về Frontend để dễ soi
        print("\n=== LỖI BACKEND PHÁT HIỆN ===")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi chi tiết từ Backend: {str(e)}")