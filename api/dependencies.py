import torch
from src.models.builder import build_model

model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_model(model_path: str = "./models/best_model.pth", model_name: str = "resnet50"):
    global model
    if model is None:
        model = build_model(model_name=model_name, num_classes=2, pretrained=False)
        state_dict = torch.load(model_path, map_location=device)
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
    return model