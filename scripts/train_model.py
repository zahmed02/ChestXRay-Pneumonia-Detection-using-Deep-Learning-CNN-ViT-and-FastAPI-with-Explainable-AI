import os
import sys
import torch
from torch.utils.data import DataLoader
from torchvision import transforms
import mlflow

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data.dataset import ChestXRayDataset
from src.models.builder import build_model
from src.training.config import TrainConfig
from src.training.trainer import Trainer
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

def main():
    # Configuration
    config = TrainConfig()
    
    # Set up transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),  # Data augmentation for training
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Try to find the correct data path
    data_root = config.data_root
    if os.path.exists(os.path.join(data_root, 'chest_xray')):
        data_root = os.path.join(data_root, 'chest_xray')
        logger.info(f"Using nested data path: {data_root}")
    
    # Load datasets
    logger.info("Loading datasets...")
    train_dataset = ChestXRayDataset(data_root, 'train', transform)
    val_dataset = ChestXRayDataset(data_root, 'val', transform)
    
    # Create data loaders
    train_loader = DataLoader(
        train_dataset, 
        batch_size=config.batch_size, 
        shuffle=True,
        num_workers=config.num_workers
    )
    val_loader = DataLoader(
        val_dataset, 
        batch_size=config.batch_size, 
        shuffle=False,
        num_workers=config.num_workers
    )
    
    logger.info(f"Train samples: {len(train_dataset)}")
    logger.info(f"Val samples: {len(val_dataset)}")
    
    # Build model
    logger.info(f"Building model: {config.model_name}")
    model = build_model(
        model_name=config.model_name,
        num_classes=2,
        pretrained=True
    )
    
    # Log model parameters
    from src.models.builder import count_parameters
    logger.info(f"Total trainable parameters: {count_parameters(model):,}")
    
    # Start MLflow tracking
    mlflow.set_experiment("chest_xray_classification")
    with mlflow.start_run(run_name=config.experiment_name):
        # Log config parameters
        mlflow.log_params({
            "model_name": config.model_name,
            "batch_size": config.batch_size,
            "epochs": config.epochs,
            "learning_rate": config.learning_rate,
            "weight_decay": config.weight_decay
        })
        
        # Train
        trainer = Trainer(model, train_loader, val_loader, config)
        trainer.train()
        
        logger.info("Training completed!")

if __name__ == "__main__":
    main()