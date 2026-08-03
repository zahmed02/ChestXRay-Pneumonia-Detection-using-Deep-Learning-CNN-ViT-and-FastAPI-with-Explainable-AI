from pydantic import BaseModel
from typing import Optional

class PredictionResponse(BaseModel):
    class_name: str  # "NORMAL" or "PNEUMONIA"
    confidence: float
    heatmap_base64: Optional[str] = None  # Optional Grad-CAM image