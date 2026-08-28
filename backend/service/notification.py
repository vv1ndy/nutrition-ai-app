import requests

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def send_push_notification(expo_push_token: str, title: str, body: str, data: dict = None):
    """
    Gửi thông báo đẩy tới thiết bị thông qua Expo Push Notification Service.
    """
    if not expo_push_token or not expo_push_token.startswith("ExponentPushToken"):
        return {"success": False, "error": "Token Expo không hợp lệ"}

    message = {
        "to": expo_push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }

    headers = {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(EXPO_PUSH_URL, json=message, headers=headers)
        return {
            "success": True,
            "response": response.json()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }