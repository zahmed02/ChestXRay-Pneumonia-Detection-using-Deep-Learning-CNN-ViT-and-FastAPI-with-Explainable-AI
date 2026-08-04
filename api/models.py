from sqlalchemy import Column, Integer, String, Float, DateTime
from .database import Base
import datetime

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    diagnosis = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    image_path = Column(String, nullable=False)
    heatmap_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)