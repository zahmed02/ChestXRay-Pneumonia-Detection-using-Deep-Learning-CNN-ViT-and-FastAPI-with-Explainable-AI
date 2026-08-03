import requests
import sys
import os

def test_api_health():
    """Test the API health endpoint"""
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health Check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to API. Is the server running?")
        print("Start it with: uvicorn api.main:app --reload")
        return False

if __name__ == "__main__":
    test_api_health()