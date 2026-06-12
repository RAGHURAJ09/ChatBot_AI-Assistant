import os
import sys
import time
import requests
from multiprocessing import Process

def run_server():
    os.chdir(r"D:\2nd Year(III) sem\Flask and Django\ChatBot\backend")
    os.environ['PYTHONPATH'] = r"D:\2nd Year(III) sem\Flask and Django\ChatBot\backend"
    import main

if __name__ == "__main__":
    # Start server in a separate process
    server_process = Process(target=run_server)
    server_process.start()
    
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(15)
    
    try:
        # Test signup
        print("\n=== Testing Signup ===")
        r = requests.post(
            "http://127.0.0.1:8000/auth/signup",
            json={"email": "testuser@example.com", "password": "test123456"}
        )
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text[:500]}")
        
        # Test login
        print("\n=== Testing Login ===")
        r = requests.post(
            "http://127.0.0.1:8000/auth/login",
            data={"username": "testuser@example.com", "password": "test123456"}
        )
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text[:500]}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        server_process.terminate()
        server_process.join()
        print("\nDone!")