from passlib.context import CryptContext
import jwt
import traceback
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login") # Thay đường dẫn bằng API login thực tế của bạn
# ==============================================================================
# CẤU HÌNH BẢO MẬT
# ==============================================================================
# Chuỗi bí mật dùng để ký Token (Trong thực tế nên đưa vào file .env)
SECRET_KEY = "Mot_Chuoi_Bi_Mat_Sieu_Dai_Va_Kho_Doan_Cua_Ung_Dung_AI_Nutrition"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 # Token có hạn trong 30 ngày

# Công cụ mã hóa mật khẩu bằng thuật toán bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hàm băm mật khẩu trước khi lưu vào DB"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Hàm kiểm tra mật khẩu người dùng nhập có khớp với chuỗi băm trong DB không"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Hàm tạo JWT Token khi đăng nhập thành công"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Mã hóa dữ liệu thành chuỗi Token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    """Hàm giải mã Token để lấy ra user_id của người đang gọi API"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin, Token không hợp lệ",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Giải mã token bằng SECRET_KEY và ALGORITHM đã khai báo
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Trích xuất user_id từ payload (Cần đảm bảo lúc đăng nhập bạn truyền key này)
        user_id: int = payload.get("user_id") 
        
        if user_id is None:
            raise credentials_exception
            
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token đã hết hạn, vui lòng đăng nhập lại")
    except jwt.PyJWTError:
        raise credentials_exception
    except Exception as e:
        print("🚨 LỖI CHẾT TẠI CHỐT CHẶN GET_CURRENT_USER:")
        traceback.print_exc() # In chi tiết lỗi ra Terminal
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi xác thực: {str(e)}")