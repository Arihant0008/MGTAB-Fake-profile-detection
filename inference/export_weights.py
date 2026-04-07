"""
Export MLP model weights to JSON for pure-JS inference.
Run this once locally: python inference/export_weights.py
"""
import json
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent))
from models.mlp import MLPClassifier

MODEL_PATH = Path(__file__).parent / "models" / "mlp_v1.pt"
OUTPUT_PATH = Path(__file__).parent / "models" / "model_weights.json"

def export():
    model = MLPClassifier(input_dim=788)
    state_dict = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()

    weights = {}
    for name, param in model.state_dict().items():
        weights[name] = param.tolist()

    with open(OUTPUT_PATH, "w") as f:
        json.dump(weights, f)

    print(f"Exported {len(weights)} tensors to {OUTPUT_PATH}")
    print(f"File size: {OUTPUT_PATH.stat().st_size / 1024:.1f} KB")
    for name, param in model.state_dict().items():
        print(f"  {name}: {list(param.shape)}")

if __name__ == "__main__":
    export()
