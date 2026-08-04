import os
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from api.database import SessionLocal
from api import models, crud

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/history")
def get_history(
    patient_id: Optional[str] = Query(None),
    diagnosis: Optional[str] = Query(None, pattern="^(NORMAL|PNEUMONIA)$"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * limit
    results, total = crud.get_predictions(
        db=db,
        patient_id=patient_id,
        diagnosis=diagnosis,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit
    )
    return {
        "items": [
            {
                "id": r.id,
                "patient_id": r.patient_id,
                "diagnosis": r.diagnosis,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat(),
                "image_url": f"/uploads/{os.path.basename(r.image_path)}"
            }
            for r in results
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/prediction/{prediction_id}")
def get_prediction(prediction_id: int, db: Session = Depends(get_db)):
    pred = db.query(models.Prediction).filter(models.Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return {
        "id": pred.id,
        "patient_id": pred.patient_id,
        "diagnosis": pred.diagnosis,
        "confidence": pred.confidence,
        "created_at": pred.created_at.isoformat(),
        "image_url": f"/uploads/{os.path.basename(pred.image_path)}",
        "heatmap_url": f"/uploads/{os.path.basename(pred.heatmap_path)}" if pred.heatmap_path else None
    }