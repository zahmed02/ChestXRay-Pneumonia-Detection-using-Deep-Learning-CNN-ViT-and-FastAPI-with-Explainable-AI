import os
import io
import uuid
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
import torch
from torchvision import transforms

from api.database import SessionLocal
from api import crud, models
from api.dependencies import get_model, device
from api.rag import index_case

# Import Grad-CAM utility
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.gradcam import generate_gradcam

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    patient_id: str = Form(None),
    db: Session = Depends(get_db)
):
    # 1. Validate and read image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # 2. Generate patient ID if not provided
    if not patient_id:
        patient_id = f"PX-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

    # 3. Save original image to disk
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    img_filename = f"{patient_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{ext}"
    img_path = os.path.join(UPLOAD_DIR, img_filename)
    with open(img_path, "wb") as buffer:
        buffer.write(contents)

    # 4. Run inference
    input_tensor = transform(image).unsqueeze(0).to(device)
    model = get_model()
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.softmax(logits, dim=1)
        confidence, pred_idx = torch.max(probs, dim=1)
        diagnosis = "PNEUMONIA" if pred_idx.item() == 1 else "NORMAL"
        confidence = confidence.item()

    # 5. Generate Grad-CAM heatmap
    heatmap_path = None
    try:
        target_class = pred_idx.item()
        heatmap_filename = f"{patient_id}_heatmap_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.jpg"
        heatmap_path_full = os.path.join(UPLOAD_DIR, heatmap_filename)

        generate_gradcam(
            model=model,
            input_tensor=input_tensor,
            target_class=target_class,
            original_image=image,
            save_path=heatmap_path_full
        )
        heatmap_path = heatmap_path_full
        print(f"Heatmap saved: {heatmap_path}")
    except Exception as e:
        print(f"Grad-CAM generation failed: {e}")
        heatmap_path = None

    # 6. Save to database
    db_pred = crud.create_prediction(
        db=db,
        patient_id=patient_id,
        diagnosis=diagnosis,
        confidence=confidence,
        image_path=img_path,
        heatmap_path=heatmap_path
    )

    # 6b. Seed a minimal entry in the case vector store (best-effort; gets
    # enriched with real findings once the user asks the AI to explain it)
    try:
        index_case(
            prediction_id=db_pred.id,
            diagnosis=diagnosis,
            confidence=confidence,
            description=f"{diagnosis} case ({confidence * 100:.1f}% confidence), no AI explanation generated yet.",
        )
    except Exception as e:
        print(f"Warning: failed to index case {db_pred.id} into vector store: {e}")

    # 7. Return response
    return {
        "patient_id": patient_id,
        "class_name": diagnosis,
        "confidence": confidence,
        "heatmap_base64": None,
        "image_url": f"/uploads/{img_filename}",
        "heatmap_url": f"/uploads/{heatmap_filename}" if heatmap_path else None
    }