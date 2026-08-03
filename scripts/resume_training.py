import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
from torch.utils.data import DataLoader
from torchvision import transforms
import mlflow

from src.data.dataset import ChestXRayDataset
from src.models.builder import build_model
from src.training.config import TrainConfig
from src.training.trainer import Trainer
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

def resume_training():
    config = TrainConfig()
    config.epochs = 20  # Total epochs you want
    
    # Data loading
    data_root = config.data_root
    if os.path.exists(os.path.join(data_root, 'chest_xray')):
        data_root = os.path.join(data_root, 'chest_xray')
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = ChestXRayDataset(data_root, 'train', transform)
    val_dataset = ChestXRayDataset(data_root, 'val', transform)
    
    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False)
    
    # Build model
    model = build_model(config.model_name, num_classes=2, pretrained=True)
    
    # Load checkpoint if exists
    checkpoint_path = f"{config.save_dir}/best_model.pth"
    start_epoch = 0
    
    if os.path.exists(checkpoint_path):
        logger.info(f"Loading checkpoint from {checkpoint_path}")
        model.load_state_dict(torch.load(checkpoint_path))
        
        # You can also save optimizer state if you want to resume exactly
        # But for now, we'll just continue from the best model
        logger.info("Resuming from best saved model")
    
    # Train
    trainer = Trainer(model, train_loader, val_loader, config)
    
    with mlflow.start_run(run_name=f"{config.experiment_name}_resume", nested=True):
        trainer.train()  # This will run for remaining epochs

if __name__ == "__main__":
    resume_training()