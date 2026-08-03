import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
from src.models.builder import build_model
from src.training.config import TrainConfig

def inspect_model():
    config = TrainConfig()
    model_path = os.path.join(config.save_dir, 'best_model.pth')
    
    if not os.path.exists(model_path):
        print(f"Model file not found at {model_path}")
        return
    
    # 1. Load the state_dict
    state_dict = torch.load(model_path, map_location='cpu')
    print(f"Loaded state_dict from {model_path}")
    print(f"   Number of parameter tensors: {len(state_dict)}")
    
    # 2. Count total parameters
    total_params = 0
    for key, tensor in state_dict.items():
        total_params += tensor.numel()
    print(f"   Total parameters: {total_params:,}")
    
    # 3. Show first few layer keys
    print("\nFirst 10 layer names:")
    for i, key in enumerate(list(state_dict.keys())[:10]):
        print(f"   {i+1}. {key} -> shape {tuple(state_dict[key].shape)}")
    
    # 4. Check if it matches expected architecture
    # Build a fresh model and compare
    model = build_model(config.model_name, num_classes=2, pretrained=False)
    model_keys = set(model.state_dict().keys())
    saved_keys = set(state_dict.keys())
    
    if model_keys == saved_keys:
        print("\nModel architecture matches the saved weights (all keys match).")
    else:
        missing = model_keys - saved_keys
        extra = saved_keys - model_keys
        if missing:
            print(f"\nMissing keys in saved weights: {missing}")
        if extra:
            print(f"Extra keys in saved weights: {extra}")
    
    # 5. Check if it's from epoch 6 (look at maybe a metric, but we can't tell directly)
    # The file name doesn't contain epoch info, but we can check file modification time
    import datetime
    mod_time = os.path.getmtime(model_path)
    mod_date = datetime.datetime.fromtimestamp(mod_time)
    print(f"\nFile last modified: {mod_date}")
    print(f"   This likely corresponds to the epoch that achieved the best validation accuracy.")
    
    # 6. Optionally, verify model can be loaded and used for inference (dry run)
    try:
        model.load_state_dict(state_dict)
        print("Model can be loaded with the state_dict (valid).")
    except Exception as e:
        print(f"Error loading state_dict: {e}")

if __name__ == "__main__":
    inspect_model()