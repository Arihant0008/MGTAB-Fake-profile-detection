"""
Train MLP V1 from existing MGTAB graph_data.pt features.

This script:
1. Loads features (x) and labels (y) from the existing graph_data.pt
2. Computes and saves normalization statistics (min, max, mean, std per feature)
3. Normalizes features using log1p + MinMax (same as preprocessing pipeline)
4. Trains a 3-layer MLP on the 788-dim feature vectors
5. Saves the trained model to models/mlp_v1.pt
6. Saves normalization stats to models/normalization_stats.json
7. Reports train/val/test accuracy, bot recall, and F1

Usage:
    python train_mlp_v1.py --data-path ../path/to/graph_data.pt
    
    If --data-path is not provided, it looks for graph_data.pt in the parent
    MGTAB research directory structure.
"""

import argparse
import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

# Add parent directory to path for model import
sys.path.insert(0, str(Path(__file__).parent))
from models.mlp import MLPClassifier

# ============================================================
# Feature Constants (must match shared/constants.ts exactly)
# ============================================================

PROPERTY_FEATURE_NAMES = [
    "profile_use_background_image",
    "default_profile",
    "verified",
    "followers_count",
    "default_profile_image",
    "listed_count",
    "statuses_count",
    "friends_count",
    "geo_enabled",
    "favourites_count",
    "created_at",
    "screen_name_length",
    "name_length",
    "description_length",
    "followers_friends_ratio",
    "default_profile_background_color",
    "default_profile_sidebar_fill_color",
    "default_profile_sidebar_border_color",
    "has_url",
    "profile_background_image_url",
]

LOG_TRANSFORM_FEATURES_IDX = {
    3,   # followers_count
    5,   # listed_count
    6,   # statuses_count
    7,   # friends_count
    9,   # favourites_count
    14,  # followers_friends_ratio
}

BOOLEAN_FEATURES_IDX = {
    0,   # profile_use_background_image
    1,   # default_profile
    2,   # verified
    4,   # default_profile_image
    8,   # geo_enabled
    15,  # default_profile_background_color
    16,  # default_profile_sidebar_fill_color
    17,  # default_profile_sidebar_border_color
    18,  # has_url
    19,  # profile_background_image_url
}

NUM_PROPERTY = 20
EMBEDDING_DIM = 768
TOTAL_DIM = NUM_PROPERTY + EMBEDDING_DIM  # 788


def find_graph_data(data_path: str = None) -> str:
    """Locate graph_data.pt in the project directory structure."""
    if data_path and os.path.exists(data_path):
        return data_path

    # Search common locations relative to this script
    script_dir = Path(__file__).parent
    candidates = [
        script_dir.parent / "Datasets and precrosessing" / "graph_data.pt",
        script_dir.parent.parent / "Datasets and precrosessing" / "graph_data.pt",
        script_dir.parent / "graph_data.pt",
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError(
        "graph_data.pt not found. Provide --data-path argument."
    )


def compute_normalization_stats(
    features: torch.Tensor,
    train_mask: torch.Tensor,
) -> Dict:
    """
    Compute normalization statistics from training data only.
    
    For log-transform features: stats are computed AFTER log1p.
    For boolean features: stats are trivially {min: 0, max: 1}.
    """
    train_features = features[train_mask]
    stats = {"propertyFeatures": {}, "trainingSize": int(train_mask.sum().item())}

    for idx, name in enumerate(PROPERTY_FEATURE_NAMES):
        col = train_features[:, idx].float()

        if name in [PROPERTY_FEATURE_NAMES[i] for i in BOOLEAN_FEATURES_IDX]:
            # Boolean features: trivial stats
            stats["propertyFeatures"][name] = {
                "min": 0.0,
                "max": 1.0,
                "mean": float(col.mean().item()),
                "std": float(col.std().item()),
            }
        elif name in [PROPERTY_FEATURE_NAMES[i] for i in LOG_TRANSFORM_FEATURES_IDX]:
            # Apply log1p first, then compute stats
            log_col = torch.log1p(col)
            stats["propertyFeatures"][name] = {
                "min": float(log_col.min().item()),
                "max": float(log_col.max().item()),
                "mean": float(log_col.mean().item()),
                "std": float(log_col.std().item()),
            }
        else:
            # Standard MinMax features
            stats["propertyFeatures"][name] = {
                "min": float(col.min().item()),
                "max": float(col.max().item()),
                "mean": float(col.mean().item()),
                "std": float(col.std().item()),
            }

    import datetime
    stats["computedAt"] = datetime.datetime.now().isoformat()

    return stats


def normalize_features(
    features: torch.Tensor,
    stats: Dict,
) -> torch.Tensor:
    """Apply normalization transforms to the feature tensor."""
    normalized = features.clone().float()

    for idx, name in enumerate(PROPERTY_FEATURE_NAMES):
        col = normalized[:, idx]

        if idx in BOOLEAN_FEATURES_IDX:
            # Already 0/1, clamp to be safe
            normalized[:, idx] = col.clamp(0.0, 1.0)
        else:
            # Apply log1p for count features
            if idx in LOG_TRANSFORM_FEATURES_IDX:
                col = torch.log1p(col)

            # MinMax scaling
            feat_stats = stats["propertyFeatures"][name]
            feat_min = feat_stats["min"]
            feat_max = feat_stats["max"]

            if feat_max - feat_min > 1e-10:
                col = (col - feat_min) / (feat_max - feat_min)
            else:
                col = torch.zeros_like(col)

            normalized[:, idx] = col.clamp(0.0, 1.0)

    return normalized


def train_model(
    features: torch.Tensor,
    labels: torch.Tensor,
    train_mask: torch.Tensor,
    val_mask: torch.Tensor,
    test_mask: torch.Tensor,
    epochs: int = 200,
    lr: float = 0.001,
    batch_size: int = 256,
) -> Tuple[MLPClassifier, Dict]:
    """Train the MLP classifier with class-weighted loss."""

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🖥  Training on: {device}")

    # Class weights for imbalanced dataset
    num_human = (labels[train_mask] == 0).sum().item()
    num_bot = (labels[train_mask] == 1).sum().item()
    weight_bot = num_human / num_bot
    class_weights = torch.tensor([1.0, weight_bot], dtype=torch.float32).to(device)
    print(f"⚖️  Class weights: [human=1.0, bot={weight_bot:.3f}]")

    # Model
    model = MLPClassifier(input_dim=features.shape[1]).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", patience=15, factor=0.5
    )
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # Data loaders
    train_dataset = TensorDataset(
        features[train_mask].to(device),
        labels[train_mask].to(device),
    )
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    val_features = features[val_mask].to(device)
    val_labels = labels[val_mask].to(device)

    # Training loop
    best_val_acc = 0.0
    best_state = None
    metrics_history = []

    for epoch in range(1, epochs + 1):
        start_time = time.time()

        # Train
        model.train()
        total_loss = 0.0
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)

        # Evaluate
        model.eval()
        with torch.no_grad():
            # Validation
            val_logits = model(val_features)
            val_pred = val_logits.argmax(dim=1)
            val_acc = (val_pred == val_labels).float().mean().item()

            val_bot_mask = val_labels == 1
            val_bot_recall = (
                (val_pred[val_bot_mask] == 1).sum().item()
                / max(val_bot_mask.sum().item(), 1)
            )

            # Training accuracy (full, not batched)
            train_logits = model(features[train_mask].to(device))
            train_pred = train_logits.argmax(dim=1)
            train_labels_dev = labels[train_mask].to(device)
            train_acc = (train_pred == train_labels_dev).float().mean().item()

        scheduler.step(val_acc)
        elapsed = time.time() - start_time

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = model.state_dict().copy()

        metrics_history.append({
            "epoch": epoch,
            "loss": avg_loss,
            "train_acc": train_acc,
            "val_acc": val_acc,
            "val_bot_recall": val_bot_recall,
        })

        if epoch % 20 == 0 or epoch == 1:
            print(
                f"  Epoch {epoch:3d} | Loss={avg_loss:.4f} | "
                f"Train={train_acc:.4f} | Val={val_acc:.4f} | "
                f"BotRecall={val_bot_recall:.4f} | {elapsed:.2f}s"
            )

    # Load best model
    model.load_state_dict(best_state)
    model.eval()

    # Final test evaluation
    test_features_dev = features[test_mask].to(device)
    test_labels_dev = labels[test_mask].to(device)

    with torch.no_grad():
        test_logits = model(test_features_dev)
        test_pred = test_logits.argmax(dim=1)
        test_acc = (test_pred == test_labels_dev).float().mean().item()

        test_bot_mask = test_labels_dev == 1
        test_bot_recall = (
            (test_pred[test_bot_mask] == 1).sum().item()
            / max(test_bot_mask.sum().item(), 1)
        )

        test_human_mask = test_labels_dev == 0
        test_human_recall = (
            (test_pred[test_human_mask] == 0).sum().item()
            / max(test_human_mask.sum().item(), 1)
        )

    results = {
        "best_val_acc": best_val_acc,
        "test_acc": test_acc,
        "test_bot_recall": test_bot_recall,
        "test_human_recall": test_human_recall,
    }

    print(f"\n{'='*60}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"  Best Validation Accuracy: {best_val_acc:.4f}")
    print(f"  Test Accuracy:            {test_acc:.4f}")
    print(f"  Test Bot Recall:          {test_bot_recall:.4f}")
    print(f"  Test Human Recall:        {test_human_recall:.4f}")

    return model.cpu(), results


def main():
    parser = argparse.ArgumentParser(description="Train MGTAB MLP V1")
    parser.add_argument(
        "--data-path",
        type=str,
        default=None,
        help="Path to graph_data.pt",
    )
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--batch-size", type=int, default=256)
    args = parser.parse_args()

    print("=" * 60)
    print("🤖 MGTAB Detector — MLP V1 Training")
    print("=" * 60)

    # 1. Load data
    data_path = find_graph_data(args.data_path)
    print(f"\n📂 Loading graph data from: {data_path}")
    data = torch.load(data_path, map_location="cpu", weights_only=False)

    features = data.x       # [num_nodes, 788]
    labels = data.y          # [num_nodes]
    train_mask = data.train_mask
    val_mask = data.val_mask
    test_mask = data.test_mask

    print(f"   Nodes: {features.shape[0]}")
    print(f"   Features: {features.shape[1]} ({NUM_PROPERTY} property + {EMBEDDING_DIM} embedding)")
    print(f"   Train: {train_mask.sum().item()} | Val: {val_mask.sum().item()} | Test: {test_mask.sum().item()}")
    print(f"   Bot: {(labels == 1).sum().item()} | Human: {(labels == 0).sum().item()}")

    # 2. Compute normalization stats (from training set only)
    print("\n📐 Computing normalization statistics...")
    stats = compute_normalization_stats(features, train_mask)

    # Save stats
    models_dir = Path(__file__).parent / "models"
    models_dir.mkdir(exist_ok=True)
    stats_path = models_dir / "normalization_stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"   Saved normalization stats to: {stats_path}")

    # 3. Normalize features
    print("\n🔧 Normalizing features...")
    normalized_features = normalize_features(features, stats)
    print(f"   Feature range after normalization: [{normalized_features.min():.4f}, {normalized_features.max():.4f}]")

    # 4. Train
    print(f"\n🏋️  Training MLP (epochs={args.epochs}, lr={args.lr})...\n")
    model, results = train_model(
        features=normalized_features,
        labels=labels,
        train_mask=train_mask,
        val_mask=val_mask,
        test_mask=test_mask,
        epochs=args.epochs,
        lr=args.lr,
        batch_size=args.batch_size,
    )

    # 5. Save model
    model_path = models_dir / "mlp_v1.pt"
    torch.save(model.state_dict(), model_path)
    print(f"\n💾 Model saved to: {model_path}")
    print(f"   Model size: {model_path.stat().st_size / 1024:.1f} KB")

    # Also save as TorchScript for faster loading
    try:
        scripted = torch.jit.script(model)
        script_path = models_dir / "mlp_v1_scripted.pt"
        scripted.save(str(script_path))
        print(f"   TorchScript model saved to: {script_path}")
    except Exception as e:
        print(f"   ⚠️  TorchScript export failed (non-critical): {e}")

    print(f"\n✅ Training complete! Run inference with: python inference_v1.py")


if __name__ == "__main__":
    main()
