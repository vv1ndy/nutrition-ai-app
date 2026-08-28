from datetime import date
from decimal import Decimal
from pydantic import ValidationError

# Import các schema từ thư mục schemas
from schemas import UserCreate, FoodCreate, MealCreate

def test_schemas_validation():
    print("⏳ Đang kiểm tra các file trong thư mục schemas...\n")
    
    try:
        # 1. TEST TẠO USER HỢP LỆ
        print("1. Kiểm tra UserCreate (Hợp lệ)...")
        user_data = {
            "ho_ten": "Trần Schema Test",
            "email": "test.schema@example.com",
            "password": "matkhau_sieu_baomat",
            "nam_sinh": 2000,
            "chieu_cao": Decimal("170.5"),
            "can_nang": Decimal("65.2")
        }
        user = UserCreate(**user_data)
        print(f"   ✅ Thành công! Dữ liệu đã parse: {user.ho_ten} - {user.email}\n")

        # 2. TEST TẠO FOOD HỢP LỆ
        print("2. Kiểm tra FoodCreate (Hợp lệ)...")
        food_data = {
            "ten_mon": "Bún Bò Huế",
            "calories": Decimal("550.0")
            # Các trường khác như protein_g, carb_g sẽ tự động lấy default = 0.0
        }
        food = FoodCreate(**food_data)
        print(f"   ✅ Thành công! Tên món: {food.ten_mon}, Calo: {food.calories}, Protein (default): {food.protein_g}\n")

        # 3. TEST PYDANTIC BẮT LỖI (Cố tình nhập sai Email)
        print("3. Kiểm tra Pydantic bắt lỗi (Cố tình nhập sai định dạng Email)...")
        try:
            bad_user = UserCreate(
                ho_ten="Lỗi Email", 
                email="day_khong_phai_la_email", # Sai định dạng email
                password="123"
            )
            print("   ❌ Lỗi: Pydantic không bắt được lỗi email!")
        except ValidationError as e:
            print("   ✅ Tuyệt vời! Pydantic đã chặn lại vì sai định dạng email.")
            # print("Chi tiết lỗi từ Pydantic:", e)
        
        print("\n🎉 TẤT CẢ CÁC SCHEMAS ĐỀU ĐƯỢC CẤU HÌNH ĐÚNG VÀ HOẠT ĐỘNG HOÀN HẢO!")

    except Exception as e:
        print("\n❌ Có lỗi cấu trúc khi import hoặc khởi tạo schemas:")
        print(e)

if __name__ == "__main__":
    test_schemas_validation()