from sqlalchemy.orm import Session
from . import models
from datetime import datetime, timedelta
from typing import Optional, List, Tuple

def create_prediction(
    db: Session,
    patient_id: str,
    diagnosis: str,
    confidence: float,
    image_path: str,
    heatmap_path: Optional[str] = None
) -> models.Prediction:
    db_pred = models.Prediction(
        patient_id=patient_id,
        diagnosis=diagnosis,
        confidence=confidence,
        image_path=image_path,
        heatmap_path=heatmap_path
    )
    db.add(db_pred)
    db.commit()
    db.refresh(db_pred)
    return db_pred

def get_predictions(
    db: Session,
    patient_id: Optional[str] = None,
    diagnosis: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 20
) -> Tuple[List[models.Prediction], int]:
    query = db.query(models.Prediction)
    if patient_id:
        query = query.filter(models.Prediction.patient_id.contains(patient_id))
    if diagnosis:
        query = query.filter(models.Prediction.diagnosis == diagnosis)
    if date_from:
        query = query.filter(models.Prediction.created_at >= date_from)
    if date_to:
        query = query.filter(models.Prediction.created_at <= date_to)
    total = query.count()
    results = query.order_by(models.Prediction.created_at.desc()).offset(skip).limit(limit).all()
    return results, total

def get_today_stats(db: Session) -> dict:
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    total = db.query(models.Prediction).filter(
        models.Prediction.created_at >= today,
        models.Prediction.created_at < tomorrow
    ).count()
    normal = db.query(models.Prediction).filter(
        models.Prediction.created_at >= today,
        models.Prediction.created_at < tomorrow,
        models.Prediction.diagnosis == "NORMAL"
    ).count()
    pneumonia = db.query(models.Prediction).filter(
        models.Prediction.created_at >= today,
        models.Prediction.created_at < tomorrow,
        models.Prediction.diagnosis == "PNEUMONIA"
    ).count()
    return {"total": total, "normal": normal, "pneumonia": pneumonia}