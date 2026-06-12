import requests
r = requests.post(
    "http://127.0.0.1:8000/auth/signup",
    json={"email": "testuser999@example.com", "password": "test123456"}
)
print("Status:", r.status_code)
print("Response:", r.text)