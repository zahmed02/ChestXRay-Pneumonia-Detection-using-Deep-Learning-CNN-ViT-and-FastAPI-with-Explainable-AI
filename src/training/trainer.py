import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from tqdm import tqdm
import mlflow
from sklearn.metrics import f1_score, recall_score

class Trainer:
    def __init__(self, model, train_loader, val_loader, config):
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.config = config

        self.device = torch.device(config.device if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

        class_weights = self._compute_class_weights()
        if class_weights is not None:
            print(f"Using class weights: {class_weights.tolist()}")
            self.criterion = nn.CrossEntropyLoss(weight=class_weights.to(self.device))
        else:
            self.criterion = nn.CrossEntropyLoss()

        self.optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(self.optimizer, mode='min', patience=3)

    def _compute_class_weights(self):
        """
        Inverse-frequency class weights computed from the training set, so the
        loss penalizes a mistake on the minority class (NORMAL) proportionally
        more than a mistake on the majority class (PNEUMONIA), instead of
        letting the model default to "always predict PNEUMONIA" to maximize
        raw accuracy.
        """
        if not self.config.use_class_weights:
            return None
        try:
            dataset = self.train_loader.dataset
            class_counts = dataset.get_class_distribution()  # Counter {0: n_normal, 1: n_pneumonia}
        except AttributeError:
            print("Warning: train_loader.dataset has no get_class_distribution(); skipping class weighting.")
            return None

        num_classes = len(class_counts)
        total = sum(class_counts.values())
        # Standard "balanced" weighting: total / (num_classes * count_for_class)
        weights = [total / (num_classes * class_counts[i]) for i in range(num_classes)]
        return torch.tensor(weights, dtype=torch.float32)

    def train_epoch(self):
        self.model.train()
        total_loss = 0
        correct = 0
        progress = tqdm(self.train_loader, desc="Training")
        for images, labels in progress:
            images, labels = images.to(self.device), labels.to(self.device)
            self.optimizer.zero_grad()
            outputs = self.model(images)
            loss = self.criterion(outputs, labels)
            loss.backward()
            self.optimizer.step()

            total_loss += loss.item()
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            progress.set_postfix({"Loss": f"{loss.item():.4f}"})

        return total_loss / len(self.train_loader), correct / len(self.train_loader.dataset)

    def validate(self):
        self.model.eval()
        total_loss = 0
        correct = 0
        all_preds = []
        all_labels = []
        with torch.no_grad():
            for images, labels in tqdm(self.val_loader, desc="Validating"):
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = self.model(images)
                loss = self.criterion(outputs, labels)
                total_loss += loss.item()
                _, preds = torch.max(outputs, 1)
                correct += (preds == labels).sum().item()
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        val_loss = total_loss / len(self.val_loader)
        val_acc = correct / len(self.val_loader.dataset)

        # macro-F1 weights both classes equally, unlike raw accuracy, which
        # can stay high even when the minority class (NORMAL) is neglected.
        val_macro_f1 = f1_score(all_labels, all_preds, average="macro", zero_division=0)
        val_normal_recall = recall_score(all_labels, all_preds, pos_label=0, zero_division=0)
        val_pneumonia_recall = recall_score(all_labels, all_preds, pos_label=1, zero_division=0)

        return {
            "loss": val_loss,
            "acc": val_acc,
            "macro_f1": val_macro_f1,
            "normal_recall": val_normal_recall,
            "pneumonia_recall": val_pneumonia_recall,
        }

    def train(self):
        checkpoint_metric = self.config.checkpoint_metric
        best_metric = 0.0

        for epoch in range(self.config.epochs):
            train_loss, train_acc = self.train_epoch()
            val_metrics = self.validate()

            mlflow.log_metric("train_loss", train_loss, step=epoch)
            mlflow.log_metric("train_acc", train_acc, step=epoch)
            mlflow.log_metric("val_loss", val_metrics["loss"], step=epoch)
            mlflow.log_metric("val_acc", val_metrics["acc"], step=epoch)
            mlflow.log_metric("val_macro_f1", val_metrics["macro_f1"], step=epoch)
            mlflow.log_metric("val_normal_recall", val_metrics["normal_recall"], step=epoch)
            mlflow.log_metric("val_pneumonia_recall", val_metrics["pneumonia_recall"], step=epoch)

            print(
                f"Epoch {epoch+1}/{self.config.epochs} | "
                f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} | "
                f"Val Loss: {val_metrics['loss']:.4f}, Val Acc: {val_metrics['acc']:.4f}, "
                f"Val Macro-F1: {val_metrics['macro_f1']:.4f} | "
                f"NORMAL Recall: {val_metrics['normal_recall']:.4f}, "
                f"PNEUMONIA Recall: {val_metrics['pneumonia_recall']:.4f}"
            )

            current_metric = val_metrics[checkpoint_metric]
            if current_metric > best_metric:
                best_metric = current_metric
                torch.save(self.model.state_dict(), f"{self.config.save_dir}/best_model.pth")
                print(f"Best model saved! ({checkpoint_metric}={best_metric:.4f})")

            self.scheduler.step(val_metrics["loss"])