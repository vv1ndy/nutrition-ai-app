# Nutrition AI App

Ứng dụng di động hỗ trợ dinh dưỡng tích hợp AI nhận diện món ăn.

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Mobile | React Native (Expo) |
| Backend API | FastAPI (Python) |
| Database | SQL Server 2022 |
| AI | Google Generative AI (Gemini 3.6-flash) |

## Cấu trúc dự án

```
nutrition-ai-app/
├── backend/          # FastAPI REST API
├── mobile/           # React Native (Expo) app
├── database/         # SQL Server schema & seed data
├── docs/             # Tài liệu thiết kế
└── docker-compose.yml
```

## Yêu cầu hệ thống

- Python 3.11+
- Node.js 18+
- Docker Desktop (cho SQL Server)
- Google AI API Key ([aistudio.google.com](https://aistudio.google.com))

## Khởi chạy nhanh

### 1. Database (SQL Server)

```bash
docker-compose up -d
```

SQL Server chạy tại `localhost:1433` với:
- Database: `QL`
- User: `sa` / Password: `Your_password123`

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # Cập nhật GEMINI_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 3. Mobile (React Native)

```bash
cd mobile
npm install
npm start
```

> **Lưu ý:** Sửa `API_BASE_URL` trong `mobile/src/constants/config.ts` thành IP máy tính khi chạy trên thiết bị thật (ví dụ: `http://192.168.1.100:8000/api`).

## Chức năng chính

- **Quản lý người dùng**: Đăng ký, đăng nhập, thiết lập hồ sơ (BMI, BMR, TDEE)
- **Quản lý bữa ăn**: Nhập/sửa/xóa bữa ăn, tổng hợp dinh dưỡng theo ngày
- **AI nhận diện món ăn**: Chụp/chọn ảnh → Gemini phân tích → thêm vào nhật ký
- **Gợi ý thực đơn AI**: Dựa trên mục tiêu và calo còn lại
- **Quản lý mục tiêu**: Theo dõi tiến độ calo/macro, cảnh báo vượt/chưa đạt
- **Quản lý tập luyện**: Nhập thủ công hoặc kết nối app thể dục (sẵn sàng mở rộng)

## API Endpoints chính

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/profile/setup` | Thiết lập hồ sơ |
| GET | `/api/meals` | Danh sách bữa ăn |
| POST | `/api/meals` | Tạo bữa ăn |
| GET | `/api/meals/summary/daily` | Tổng hợp dinh dưỡng ngày |
| POST | `/api/ai/recognize` | Nhận diện món ăn (upload ảnh) |
| POST | `/api/ai/suggest-menu` | Gợi ý thực đơn |
| GET | `/api/goals/progress` | Tiến độ mục tiêu |
| POST | `/api/exercises` | Ghi nhận tập luyện |

## Tác nhân hệ thống

- **User**: Sử dụng app di động
- **Admin**: Quản trị dữ liệu thực phẩm, xử lý báo cáo (mở rộng)
- **Hệ thống AI**: Gemini xử lý nhận diện và gợi ý
- **Database**: MySQL lưu trữ toàn bộ dữ liệu
Lệnh chạy:
npx expo start -c --localhost --clear
tạo admin;tạo trực tiếp qua API docs (Swagger/FastAPI)
Note:Lời khuyên để phát triển dự án tốt hơn:
Khi code trên máy ảo Android (Dùng Expo Go hiện tại): Sử dụng IP Wi-Fi của máy tính là giải pháp nhanh và tiện nhất để test ngay lập tức.

Khi bảo vệ đồ án / Demo thực tế: Bạn nên nhớ kiểm tra lại ipconfig trước khi thuyết trình để đảm bảo IP trong client.js vẫn khớp với IP hiện tại của máy tính kết nối mạng tại phòng đó.
..