import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, roc_curve
from torch.utils.data import DataLoader
from torchvision import transforms

from src.data.dataset import ChestXRayDataset
from src.models.builder import build_model
from src.training.config import TrainConfig
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

def evaluate_model():
    """Evaluate the trained model on the test set and generate metrics and plots."""
    config = TrainConfig()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    # Determine correct data path
    data_root = config.data_root
    if os.path.exists(os.path.join(data_root, 'chest_xray')):
        data_root = os.path.join(data_root, 'chest_xray')
    logger.info(f"Data root: {data_root}")

    # Data transforms (same as validation/test)
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    # Load test dataset
    test_dataset = ChestXRayDataset(data_root, 'test', transform)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
    logger.info(f"Test samples: {len(test_dataset)}")

    # Build model and load best checkpoint
    model = build_model(config.model_name, num_classes=2, pretrained=False)
    model_path = os.path.join(config.save_dir, 'best_model.pth')
    if not os.path.exists(model_path):
        logger.error(f"Model checkpoint not found at {model_path}")
        return

    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()
    logger.info(f"Loaded model from {model_path}")

    # Prediction containers
    all_preds = []
    all_probs = []
    all_labels = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())  # probability of class 1 (PNEUMONIA)
            all_labels.extend(labels.numpy())

    # Convert to arrays
    all_preds = np.array(all_preds)
    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)

    class_names = ['NORMAL', 'PNEUMONIA']

    # ---- Metrics ----
    logger.info("\n" + "="*60)
    logger.info("TEST SET EVALUATION RESULTS")
    logger.info("="*60)

    acc = (all_preds == all_labels).mean()
    logger.info(f"Accuracy: {acc:.4f}")

    print("\nClassification Report:")
    print(classification_report(all_labels, all_preds, target_names=class_names))

    cm = confusion_matrix(all_labels, all_preds)
    logger.info(f"\nConfusion Matrix:\n{cm}")

    try:
        auc = roc_auc_score(all_labels, all_probs)
        logger.info(f"AUC-ROC: {auc:.4f}")
    except Exception as e:
        logger.warning(f"Could not compute AUC: {e}")

    # ---- Save figures ----
    # 1. Confusion Matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names)
    plt.title('Confusion Matrix - Test Set')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png', dpi=300)
    logger.info("Confusion matrix saved as 'confusion_matrix.png'")

    # 2. ROC Curve
    try:
        fpr, tpr, _ = roc_curve(all_labels, all_probs)
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, label=f'AUC = {auc:.4f}')
        plt.plot([0, 1], [0, 1], 'k--')
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve - Test Set')
        plt.legend()
        plt.tight_layout()
        plt.savefig('roc_curve.png', dpi=300)
        logger.info("ROC curve saved as 'roc_curve.png'")
    except Exception as e:
        logger.warning(f"Could not generate ROC curve: {e}")

    # ---- Save results to text file ----
    with open('test_results.txt', 'w') as f:
        f.write("TEST SET EVALUATION RESULTS\n")
        f.write("="*60 + "\n")
        f.write(f"Accuracy: {acc:.4f}\n")
        f.write(f"AUC-ROC: {auc:.4f}\n\n" if auc else "\n")
        f.write("Classification Report:\n")
        f.write(classification_report(all_labels, all_preds, target_names=class_names))
        f.write(f"\nConfusion Matrix:\n{cm}\n")

    logger.info("Results saved to 'test_results.txt'")
    logger.info("Evaluation complete!")

if __name__ == "__main__":
    evaluate_model()