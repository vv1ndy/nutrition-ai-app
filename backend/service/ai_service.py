import os
import google.generativeai as genai
from PIL import Image
from io import BytesIO

# Cấu hình API Key cho Google Gemini (Bạn có thể thay bằng API Key của bạn hoặc lấy từ biến môi trường)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "THAY_API_KEY_CUA_BAN_VAO_DAY")
genai.configure(api_key=GEMINI_API_KEY)

def analyze_food_image(image_bytes: bytes) -> dict:
    """
    Sử dụng Google Gemini AI để nhận diện món ăn từ ảnh chụp và ước tính dinh dưỡng.
    """
    try:
        # Sử dụng model Gemini flash hoặc pro phù hợp với hình ảnh
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Đọc dữ liệu ảnh từ bytes
        image = Image.open(BytesIO(image_bytes))
        
        prompt = (
            "Hãy phân tích bức ảnh món ăn này và trả về kết quả dưới dạng JSON thuần túy "
            "với các trường sau: ten_mon_an, calories (số nguyên), protein_g (float), "
            "carb_g (float), fat_g (float), loi_khuyen (lời khuyên dinh dưỡng ngắn gọn bằng tiếng Việt)."
        )
        
        response = model.generate_content([prompt, image])
        
        # Trả về chuỗi kết quả phân tích từ AI
        return {
            "success": True,
            "data": response.text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }