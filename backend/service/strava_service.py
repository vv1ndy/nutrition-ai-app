import requests

STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

def refresh_strava_token(client_id: str, client_secret: str, refresh_token: str) -> dict:
    """
    Làm mới Access Token của Strava khi token cũ hết hạn.
    """
    payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }
    
    response = requests.post(STRAVA_TOKEN_URL, data=payload)
    if response.status_code == 200:
        return response.json()
    return {"error": "Không thể làm mới Strava token", "details": response.text}

def get_strava_activities(access_token: str) -> list:
    """
    Lấy danh sách các hoạt động thể dục mới nhất của người dùng từ Strava.
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(STRAVA_ACTIVITIES_URL, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    return []