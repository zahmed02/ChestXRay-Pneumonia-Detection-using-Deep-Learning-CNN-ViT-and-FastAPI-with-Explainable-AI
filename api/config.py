import os
from dotenv import load_dotenv

# Loads variables from the .env file at the project root
load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. The /explain endpoint will fail until it's configured in .env")