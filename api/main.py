from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import predict
from api.dependencies import load_model
import mlflow

# Optional: Set tracking URI if using MLflow
# mlflow.set_tracking_uri("http://localhost:5000")

app = FastAPI(
    title="Chest X-Ray Pneumonia Detection API",
    description="Deep Learning model (CNN/ViT) with Explainable AI (Grad-CAM) for detecting pneumonia.",
    version="1.0.0"
)

# Allow CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Preload the model into memory when the server starts
    load_model()
    print("Model loaded successfully.")

@app.get("/health")
async def health_check():
    return {"status": "OK", "message": "Service is running"}

# Include routers
app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])