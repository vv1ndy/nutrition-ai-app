# API Documentation - Nutrition AI

Base URL: `http://localhost:8000/api`

## Authentication

Tất cả endpoint (trừ register/login) yêu cầu header:

```
Authorization: Bearer <access_token>
```

---

## Auth

### POST /auth/register

```json
{
  "email": "user@example.com",
  "password": "123456",
  "full_name": "Nguyễn Văn A"
}
```

### POST /auth/login

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

### POST /auth/profile/setup

Thiết lập hồ sơ sau đăng ký. Tự động tính BMI, BMR, TDEE.

```json
{
  "gender": "male",
  "birth_year": 2000,
  "height_cm": 170,
  "weight_kg": 65,
  "activity_level": "moderate",
  "goal": "lose_weight"
}
```

---

## Meals

### POST /meals

```json
{
  "meal_date": "2026-08-05",
  "meal_type": "lunch",
  "status": "logged",
  "items": [
    {
      "food_id": 1,
      "quantity_g": 500,
      "ai_confidence": 92.5
    }
  ]
}
```

### GET /meals?meal_date=2026-08-05

### GET /meals/summary/daily?summary_date=2026-08-05

Response:
```json
{
  "date": "2026-08-05",
  "total_calories": 1250.5,
  "total_protein": 65.2,
  "total_carbs": 140.0,
  "total_fat": 35.8,
  "target_calories": 2000
}
```

---

## AI

### POST /ai/recognize

Content-Type: `multipart/form-data`

Field: `image` (file ảnh JPEG/PNG)

Response:
```json
{
  "predictions": [
    {
      "name": "Pho Bo",
      "name_vi": "Phở bò",
      "confidence": 95.2,
      "estimated_quantity_g": 500
    }
  ],
  "matched_foods": [...]
}
```

### POST /ai/suggest-menu

```json
{
  "remaining_calories": 800
}
```

Response:
```json
{
  "breakfast": ["Cháo yến mạch", "Trứng luộc"],
  "lunch": ["Cơm gà", "Canh rau"],
  "dinner": ["Salad cá hồi"],
  "snack": ["Chuối"],
  "explanation": "Thực đơn cân bằng protein cho mục tiêu giảm cân"
}
```

### GET /ai/foods/search?q=phở

---

## Goals

### POST /goals

```json
{
  "period_type": "daily",
  "target_calories": 2000,
  "target_protein": 120,
  "target_carbs": 250,
  "target_fat": 65,
  "start_date": "2026-08-05"
}
```

### GET /goals/progress

Response:
```json
{
  "target_calories": 2000,
  "consumed_calories": 1250,
  "remaining_calories": 750,
  "status": "on_track"
}
```

---

## Exercises

### POST /exercises

```json
{
  "exercise_date": "2026-08-05",
  "activity_name": "Chạy bộ",
  "duration_min": 30,
  "calories_burned": 250,
  "source": "manual"
}
```
