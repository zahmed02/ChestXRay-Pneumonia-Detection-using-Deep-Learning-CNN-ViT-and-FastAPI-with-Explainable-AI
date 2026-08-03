from dataclasses import dataclass

@dataclass
class TrainConfig:
    data_root: str = "./data/chest_xray"
    model_name: str = "resnet50"  # or "vit_base_patch16_224"
    batch_size: int = 32
    epochs: int = 20
    learning_rate: float = 1e-4
    weight_decay: float = 1e-5
    num_workers: int = 4
    device: str = "cuda"  # fallback to cpu in trainer
    save_dir: str = "./models"
    experiment_name: str = "baseline_resnet50"