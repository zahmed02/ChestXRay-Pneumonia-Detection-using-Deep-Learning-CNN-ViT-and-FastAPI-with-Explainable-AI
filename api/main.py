import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.database import engine
from api import models                     # <-- correct import
from api.routers import predict, history, stats, explain
from api.dependencies import load_model

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PneumoniaAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])
app.include_router(history.router, prefix="/api/v1", tags=["History"])
app.include_router(stats.router, prefix="/api/v1", tags=["Stats"])
app.include_router(explain.router, prefix="/api/v1", tags=["Explainability"])

# Serve uploaded files
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup():
    load_model()  # preload model
    print("Model loaded successfully.")

@app.get("/health")
async def health():
    return {"status": "OK"}