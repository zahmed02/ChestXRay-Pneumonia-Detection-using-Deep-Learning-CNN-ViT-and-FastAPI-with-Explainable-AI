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

    # --- Class imbalance handling ---
    # The Kermany/Mooney chest X-ray dataset is ~3:1 PNEUMONIA:NORMAL in the
    # train split. Without weighting, the loss lets the model default to
    # "predict PNEUMONIA" to maximize raw accuracy, which is what tanked
    # NORMAL recall to 0.67 in the 5-epoch run.
    use_class_weights: bool = True

    # Metric used to decide which epoch's weights get saved as best_model.pth.
    # "acc" (raw accuracy) can look good while quietly ignoring the minority
    # class. "macro_f1" treats NORMAL and PNEUMONIA recall/precision equally.
    checkpoint_metric: str = "macro_f1"  # one of: "acc", "macro_f1"