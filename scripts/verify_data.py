import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data.dataset import ChestXRayDataset
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

def verify_dataset():
    """Verify the dataset structure and count images"""
    data_root = "./data/chest_xray"
    
    # Check if root exists
    if not os.path.exists(data_root):
        logger.error(f"Data root not found: {data_root}")
        return
    
    logger.info(f"Checking dataset at: {data_root}")
    
    # Try to find the actual data path
    actual_path = data_root
    if os.path.exists(os.path.join(data_root, 'chest_xray')):
        actual_path = os.path.join(data_root, 'chest_xray')
        logger.info(f"Found nested structure, using: {actual_path}")
    
    # Check each split
    splits = ['train', 'val', 'test']
    for split in splits:
        try:
            dataset = ChestXRayDataset(actual_path, split=split)
            class_dist = dataset.get_class_distribution()
            total = len(dataset)
            
            logger.info(f"\n{split.upper()} Split:")
            logger.info(f"  Total images: {total}")
            for class_name, count in zip(dataset.get_class_names(), [class_dist.get(i, 0) for i in range(len(dataset.get_class_names()))]):
                logger.info(f"  {class_name}: {count} images")
            
        except Exception as e:
            logger.error(f"Error loading {split} split: {e}")

if __name__ == "__main__":
    verify_dataset()