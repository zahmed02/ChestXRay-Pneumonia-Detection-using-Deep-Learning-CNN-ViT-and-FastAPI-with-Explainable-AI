from pydantic import BaseModel
from typing import Optional
from typing import List

class ChatTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ExplainRequest(BaseModel):
    question: str
    history: Optional[List[ChatTurn]] = []

class RetrievedSource(BaseModel):
    type: str  # "knowledge" or "case"
    label: str
    snippet: str

class ExplainResponse(BaseModel):
    answer: str
    prediction_id: int
    sources: List[RetrievedSource] = []

class PredictionResponse(BaseModel):
    class_name: str  # "NORMAL" or "PNEUMONIA"
    confidence: float
    heatmap_base64: Optional[str] = None  # Optional Grad-CAM image