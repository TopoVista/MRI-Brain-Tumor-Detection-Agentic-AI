from __future__ import annotations

import argparse
import json
import os
import random
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms


LABELS = ["glioma", "meningioma", "notumor", "pituitary"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DEFAULT_NUM_WORKERS = min(4, max((os.cpu_count() or 1) - 1, 1))
PAPER_COUNTS = {
    "glioma": 926,
    "meningioma": 937,
    "notumor": 500,
    "pituitary": 901,
}


class LaplacianEnhance:
    def __call__(self, image: Image.Image) -> Image.Image:
        rgb = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        laplacian = cv2.Laplacian(blurred, cv2.CV_32F)
        boosted = np.clip(blurred + 0.10 * laplacian, 0, 255).astype(np.uint8)
        stacked = np.stack([boosted, boosted, boosted], axis=-1)
        return Image.fromarray(stacked)


class BrainTumorDataset(Dataset):
    def __init__(self, items: list[tuple[Path, int]], transform: transforms.Compose) -> None:
        self.items = items
        self.transform = transform

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        path, label = self.items[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


class ProposedCNN(nn.Module):
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=0),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, padding=0),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=0),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 2 * 2, 4160),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(4160, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        return self.classifier(x)


def gather_items(dataset_root: Path, seed: int, match_paper_counts: bool) -> list[tuple[Path, int]]:
    grouped: dict[int, list[tuple[Path, int]]] = defaultdict(list)
    for split in ("Training", "Testing"):
        split_root = dataset_root / split
        if not split_root.exists():
            continue
        for label_index, label_name in enumerate(LABELS):
            label_root = split_root / label_name
            if not label_root.exists():
                continue
            for path in label_root.rglob("*"):
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                    grouped[label_index].append((path, label_index))

    candidates = []
    random.seed(seed)
    for label_index, label_name in enumerate(LABELS):
        label_items = grouped[label_index]
        if not label_items:
            continue
        random.shuffle(label_items)
        if match_paper_counts:
            target = PAPER_COUNTS[label_name]
            label_items = label_items[:target]
        candidates.extend(label_items)
    if not candidates:
        raise FileNotFoundError(f"No MRI images found under {dataset_root}")
    return candidates


def stratified_split(items: list[tuple[Path, int]], seed: int, split_mode: str) -> tuple[list, list, list]:
    grouped: dict[int, list[tuple[Path, int]]] = defaultdict(list)
    for item in items:
        grouped[item[1]].append(item)

    random.seed(seed)
    train_items: list[tuple[Path, int]] = []
    val_items: list[tuple[Path, int]] = []
    test_items: list[tuple[Path, int]] = []

    for label_items in grouped.values():
        random.shuffle(label_items)
        total = len(label_items)
        train_end = int(total * 0.8)
        if split_mode == "holdout_80_20":
            train_items.extend(label_items[:train_end])
            test_items.extend(label_items[train_end:])
            continue

        val_end = train_end + int(total * 0.1)
        train_items.extend(label_items[:train_end])
        val_items.extend(label_items[train_end:val_end])
        test_items.extend(label_items[val_end:])

    return train_items, val_items, test_items


def build_model(model_name: str) -> tuple[nn.Module, int]:
    if model_name == "cnn":
        return ProposedCNN(num_classes=len(LABELS)), 32
    if model_name == "resnet50":
        model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        model.fc = nn.Linear(model.fc.in_features, len(LABELS))
        return model, 224
    if model_name == "vgg16":
        model = models.vgg16(weights=models.VGG16_Weights.DEFAULT)
        classifier = list(model.classifier)
        classifier[-1] = nn.Linear(classifier[-1].in_features, len(LABELS))
        model.classifier = nn.Sequential(*classifier)
        return model, 224
    if model_name == "inception_v3":
        model = models.inception_v3(weights=models.Inception_V3_Weights.DEFAULT, aux_logits=True)
        if model.AuxLogits is not None:
            model.AuxLogits.fc = nn.Linear(model.AuxLogits.fc.in_features, len(LABELS))
        model.fc = nn.Linear(model.fc.in_features, len(LABELS))
        return model, 299
    raise ValueError(f"Unsupported model: {model_name}")


def get_primary_logits(outputs: torch.Tensor | object) -> torch.Tensor:
    if isinstance(outputs, torch.Tensor):
        return outputs
    if hasattr(outputs, "logits"):
        return outputs.logits
    if isinstance(outputs, tuple):
        return outputs[0]
    raise TypeError(f"Unsupported output type: {type(outputs)}")


def compute_training_loss(model_name: str, outputs: torch.Tensor | object, labels: torch.Tensor, criterion: nn.Module) -> torch.Tensor:
    if model_name == "inception_v3" and hasattr(outputs, "aux_logits") and getattr(outputs, "aux_logits") is not None:
        return criterion(outputs.logits, labels) + 0.4 * criterion(outputs.aux_logits, labels)
    if model_name == "inception_v3" and hasattr(outputs, "aux_logits"):
        return criterion(outputs.logits, labels)
    return criterion(get_primary_logits(outputs), labels)


def load_checkpoint(checkpoint_path: Path) -> dict:
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    if "model" not in checkpoint or "state_dict" not in checkpoint:
        raise ValueError(f"Checkpoint is missing required keys: {checkpoint_path}")
    return checkpoint


def export_model_to_onnx(model_name: str, checkpoint_path: Path, output_dir: Path) -> Path:
    checkpoint = load_checkpoint(checkpoint_path)
    saved_model_name = checkpoint["model"]
    if saved_model_name != model_name:
        raise ValueError(f"Checkpoint model '{saved_model_name}' does not match requested model '{model_name}'")

    model, image_size = build_model(model_name)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    output_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = output_dir / f"{model_name}.onnx"
    dummy = torch.randn(1, 3, image_size, image_size)
    with torch.no_grad():
        torch.onnx.export(
            model.cpu(),
            dummy,
            onnx_path,
            input_names=["input"],
            output_names=["logits"],
            opset_version=17,
            dynamo=False,
        )
    return onnx_path


def build_transforms(image_size: int) -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(12),
            transforms.RandomAffine(degrees=0, translate=(0.08, 0.08), scale=(0.92, 1.08)),
            LaplacianEnhance(),
            transforms.ToTensor(),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            LaplacianEnhance(),
            transforms.ToTensor(),
        ]
    )
    return train_transform, eval_transform


def evaluate(model: nn.Module, loader: DataLoader, device: torch.device, criterion: nn.Module) -> dict[str, float]:
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_items = 0
    with torch.no_grad():
        for inputs, labels in loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            outputs = model(inputs)
            logits = get_primary_logits(outputs)
            loss = criterion(logits, labels)
            total_loss += float(loss.item()) * labels.size(0)
            total_correct += int((logits.argmax(dim=1) == labels).sum().item())
            total_items += int(labels.size(0))

    return {
        "loss": total_loss / max(total_items, 1),
        "accuracy": total_correct / max(total_items, 1),
    }


def train(args: argparse.Namespace) -> None:
    dataset_root = Path(args.dataset_root)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    model, image_size = build_model(args.model)
    train_transform, eval_transform = build_transforms(image_size=image_size)
    items = gather_items(dataset_root, seed=args.seed, match_paper_counts=args.match_paper_counts)
    train_items, val_items, test_items = stratified_split(items=items, seed=args.seed, split_mode=args.split_mode)

    train_loader = DataLoader(
        BrainTumorDataset(train_items, train_transform),
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        persistent_workers=args.num_workers > 0,
    )
    val_loader = DataLoader(
        BrainTumorDataset(val_items if val_items else test_items, eval_transform),
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        persistent_workers=args.num_workers > 0,
    )
    test_loader = DataLoader(
        BrainTumorDataset(test_items, eval_transform),
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        persistent_workers=args.num_workers > 0,
    )

    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu_only else "cpu")
    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    criterion = nn.CrossEntropyLoss()
    best_state = None
    best_val_accuracy = -1.0

    history = []
    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        running_correct = 0
        running_items = 0

        for inputs, labels in train_loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            logits = get_primary_logits(outputs)
            loss = compute_training_loss(args.model, outputs, labels, criterion)
            loss.backward()
            optimizer.step()

            running_loss += float(loss.item()) * labels.size(0)
            running_correct += int((logits.argmax(dim=1) == labels).sum().item())
            running_items += int(labels.size(0))

        train_metrics = {
            "loss": running_loss / max(running_items, 1),
            "accuracy": running_correct / max(running_items, 1),
        }
        val_metrics = evaluate(model, val_loader, device, criterion)
        epoch_metrics = {"epoch": epoch + 1, "train": train_metrics, "val": val_metrics}
        history.append(epoch_metrics)
        print(json.dumps(epoch_metrics), flush=True)

        if val_metrics["accuracy"] > best_val_accuracy:
            best_val_accuracy = val_metrics["accuracy"]
            best_state = {key: value.cpu() for key, value in model.state_dict().items()}

    if best_state is None:
        raise RuntimeError("Training did not produce a checkpoint.")

    model.load_state_dict(best_state)
    checkpoint_path = output_dir / f"{args.model}.pt"
    torch.save(
        {
            "model": args.model,
            "labels": LABELS,
            "image_size": image_size,
            "state_dict": best_state,
            "history": history,
        },
        checkpoint_path,
    )

    test_metrics = evaluate(model, test_loader, device, criterion)
    metrics_path = output_dir / f"{args.model}-metrics.json"
    metrics_path.write_text(json.dumps({"test": test_metrics, "best_val_accuracy": best_val_accuracy}, indent=2))
    print(json.dumps({"saved_checkpoint": str(checkpoint_path), "test": test_metrics}, indent=2), flush=True)

    if args.export_onnx:
        onnx_path = export_model_to_onnx(args.model, checkpoint_path, output_dir)
        print(json.dumps({"exported_onnx": str(onnx_path)}, indent=2), flush=True)


def export_only(args: argparse.Namespace) -> None:
    output_dir = Path(args.output_dir)
    checkpoint_path = Path(args.checkpoint_path) if args.checkpoint_path else output_dir / f"{args.model}.pt"
    onnx_path = export_model_to_onnx(args.model, checkpoint_path, output_dir)
    print(json.dumps({"exported_onnx": str(onnx_path)}, indent=2), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train paper-aligned MRI classification models.")
    parser.add_argument("--dataset-root", default="datasets/brain-tumor-mri")
    parser.add_argument("--output-dir", default="artifacts/models")
    parser.add_argument("--model", choices=["cnn", "resnet50", "vgg16", "inception_v3"], required=True)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=18)
    parser.add_argument("--num-workers", type=int, default=DEFAULT_NUM_WORKERS)
    parser.add_argument("--learning-rate", type=float, default=0.01)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cpu-only", action="store_true")
    parser.add_argument("--export-onnx", action="store_true")
    parser.add_argument("--export-only", action="store_true")
    parser.add_argument("--checkpoint-path", default="")
    parser.add_argument("--split-mode", choices=["train_val_test_80_10_10", "holdout_80_20"], default="train_val_test_80_10_10")
    parser.add_argument("--match-paper-counts", action="store_true", default=True)
    parser.add_argument("--no-match-paper-counts", dest="match_paper_counts", action="store_false")
    args = parser.parse_args()
    if args.export_only:
        export_only(args)
        return
    train(args)


if __name__ == "__main__":
    main()
