from fastapi import FastAPI
from router import food_scan  # Import router food_scan mà bạn vừa tạo
from fastapi.middleware.cors import CORSMiddleware

# 1. IMPORT TẤT CẢ CÁC ROUTER (Đã thêm auth vào đầu danh sách)
from router import auth, user, food, meal, water, health, ai_assistant

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="AI Nutrition App API",
    description="Hệ thống Backend API cho ứng dụng AI Nutrition",
    version="1.0.0"
)
# ⚠️ QUAN TRỌNG: Phải có dòng này để FastAPI nhận diện các API trong food_scan.py
app.include_router(food_scan.router)
@app.get("/")
def root():
    return {"message": "Server is running"}

# Cấu hình CORS (Cho phép Android/React gọi API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# ĐĂNG KÝ CÁC ROUTER TỪ THƯ MỤC router/
# ==============================================================================

# 2. ĐĂNG KÝ AUTH ROUTER VÀO ĐÂY (API Đăng ký / Đăng nhập)
app.include_router(auth.router)

# Đăng ký các router còn lại
#app.include_router(auth.router, prefix="/api")
app.include_router(user.router)#, prefix="/api")
app.include_router(food.router)#, prefix="/api")
app.include_router(meal.router)#, prefix="/api")
app.include_router(water.router)#, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(ai_assistant.router)

# ==============================================================================
# ROUTER: HEALTH CHECK (Kiểm tra server sống/chết)
# ==============================================================================
@app.get("/", tags=["Trang chủ"])
def read_root():
    return {"message": "✅ Chào mừng đến với Hệ thống Backend AI Nutrition!"}