import torch
import os
import sys

# Add parent directory to path so we can import src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.builder import build_model
from src.training.config import TrainConfig

model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_model():
    global model
    if model is None:
        config = TrainConfig()
        model = build_model(config.model_name, num_classes=2, pretrained=False)
        model_path = os.path.join(config.save_dir, 'best_model.pth')
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        print("Model loaded successfully.")
    return model

def get_model():
    global model
    if model is None:
        load_model()
    return model