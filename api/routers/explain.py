from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import SessionLocal
from api import models
from api.schemas import ExplainRequest, ExplainResponse
from api.groq_client import ask_about_image

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/explain/{prediction_id}", response_model=ExplainResponse)
def explain_prediction(prediction_id: int, req: ExplainRequest, db: Session = Depends(get_db)):
    pred = db.query(models.Prediction).filter(models.Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    history = [turn.dict() for turn in (req.history or [])]

    try:
        answer = ask_about_image(
            diagnosis=pred.diagnosis,
            confidence=pred.confidence,
            image_path=pred.image_path,
            heatmap_path=pred.heatmap_path,
            history=history,
            question=question,
        )
    except RuntimeError as e:
        # GROQ_API_KEY missing/misconfigured
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")

    return ExplainResponse(answer=answer, prediction_id=prediction_id)