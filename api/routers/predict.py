import io
import base64
import torch
import numpy as np
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from PIL import Image
from torchvision import transforms
from api.schemas import PredictionResponse
from api.dependencies import load_model, device
import matplotlib.pyplot as plt

# Optional: Grad-CAM (fallback if torchcam is not installed)
try:
    from torchcam.methods import GradCAM
    TORCHCAM_AVAILABLE = True
except ImportError:
    TORCHCAM_AVAILABLE = False
    print("⚠️ torchcam not installed. Grad-CAM disabled.")

router = APIRouter()

# Standard ImageNet normalization
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def generate_heatmap(model, input_tensor, pred_idx):
    """Generate Grad-CAM heatmap if torchcam is available."""
    if not TORCHCAM_AVAILABLE:
        return None
    
    try:
        # ResNet50 uses layer4 as target
        with GradCAM(model, target_layer="layer4") as cam_extractor:
            out = model(input_tensor)
            activations = cam_extractor(pred_idx, out)
            if not activations:
                return None
            activation = activations[0].cpu().numpy()
            # Normalize and resize heatmap
            heatmap = np.maximum(activation, 0)
            heatmap /= heatmap.max() if heatmap.max() > 0 else 1
            # Resize to original image size (224x224 for simplicity)
            import cv2
            heatmap = cv2.resize(heatmap, (224, 224))
            heatmap = np.uint8(255 * heatmap)
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
            # Convert to PIL and then to base64
            heatmap_img = Image.fromarray(heatmap)
            buffered = io.BytesIO()
            heatmap_img.save(buffered, format="PNG")
            heatmap_b64 = base64.b64encode(buffered.getvalue()).decode()
            return f"data:image/png;base64,{heatmap_b64}"
    except Exception as e:
        print(f"Grad-CAM failed: {e}")
        return None

@router.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")
    
    # Read and preprocess image
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    # Load model
    model = load_model()
    
    # Inference
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.softmax(logits, dim=1)
        confidence, pred_idx = torch.max(probs, dim=1)
        class_name = "PNEUMONIA" if pred_idx.item() == 1 else "NORMAL"
    
    # Generate heatmap (if available)
    heatmap_b64 = generate_heatmap(model, input_tensor, pred_idx.item())
    
    return PredictionResponse(
        class_name=class_name,
        confidence=confidence.item(),
        heatmap_base64=heatmap_b64
    )