from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database import SessionLocal
from api import crud

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    stats = crud.get_today_stats(db)
    return stats