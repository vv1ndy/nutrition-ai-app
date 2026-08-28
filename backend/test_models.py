from database import SessionLocal
from models.user import User

def test_user_model():
    # 1. Mở phiên làm việc với database
    db = SessionLocal()
    test_email = "testuser@example.com"
    
    try:
        # Xóa user cũ nếu đã tồn tại từ lần chạy trước
        existing_user = db.query(User).filter(User.email == test_email).first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print(f"🧹 Đã dọn dẹp dữ liệu cũ của: {test_email}")

        print("⏳ Đang thử thêm một người dùng mới vào database...")
        
        # 2. Tạo một đối tượng User mẫu
        new_user = User(
            ho_ten="Nguyễn Văn Test",
            email=test_email,
            password_hash="hashed_password_123",
            nam_sinh=2000,
            gioi_tinh="NAM",
            chieu_cao=175.5,
            can_nang=70.0,
            muc_do_van_dong="ACTIVE"
        )
        
        # 3. Lưu vào database
        db.add(new_user)
        db.commit()
        db.refresh(new_user) 
        
        print(f"✅ Thêm thành công! User ID mới tạo là: {new_user.user_id}")
        
        # 4. Truy vấn thử để kiểm tra
        queried_user = db.query(User).filter(User.email == test_email).first()
        print(f"🔍 Truy vấn thành công: {queried_user.ho_ten} - {queried_user.email}")
        
    except Exception as e:
        print("❌ Có lỗi xảy ra trong quá trình test!")
        print("Chi tiết lỗi:", e)
        db.rollback() 
    finally:
        db.close() 

if __name__ == "__main__":
    test_user_model()