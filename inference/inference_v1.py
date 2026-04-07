"""
MGTAB Detector — V1 Inference Script.

Runs as a subprocess spawned by the Node.js backend.
Protocol: reads JSON from stdin, writes JSON to stdout.

Input JSON:
{
    "features": [0.1, 0.2, ...],   // normalized 788-dim vector
    "computeImportance": true       // whether to compute feature importance
}

Output JSON:
{
    "predictedClass": 1,                     // 0=human, 1=bot
    "probabilities": [0.15, 0.85],           // [p_human, p_bot]
    "featureImportance": [0.1, 0.05, ...],   // 20 values for property features
    "inferenceTimeMs": 12.5
}

The model is loaded once at startup and kept in memory.
Supports streaming mode: continuously reads JSON lines from stdin.
"""

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import torch
import torch.nn.functional as F

# Add parent to path for model import
sys.path.insert(0, str(Path(__file__).parent))
from models.mlp import MLPClassifier

# ============================================================
# Configuration
# ============================================================

MODELS_DIR = Path(__file__).parent / "models"
MODEL_PATH = os.environ.get("MODEL_PATH", str(MODELS_DIR / "mlp_v1.pt"))
SCRIPTED_MODEL_PATH = str(MODELS_DIR / "mlp_v1_scripted.pt")
INPUT_DIM = 788
NUM_PROPERTY_FEATURES = 20

# ============================================================
# Logging (goes to stderr so it doesn't interfere with JSON stdout)
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [inference] %(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)

# ============================================================
# Model Loading
# ============================================================


def load_model() -> torch.nn.Module:
    """
    Load the MLP model from disk.
    Prefers TorchScript version for faster loading, falls back to state dict.
    """
    device = torch.device("cpu")  # V1 runs on CPU for simplicity

    # Try TorchScript first
    if os.path.exists(SCRIPTED_MODEL_PATH):
        try:
            model = torch.jit.load(SCRIPTED_MODEL_PATH, map_location=device)
            model.eval()
            logger.info(f"Loaded TorchScript model from {SCRIPTED_MODEL_PATH}")
            return model
        except Exception as e:
            logger.warning(f"TorchScript load failed, falling back: {e}")

    # Fall back to state dict
    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model not found at {MODEL_PATH}")
        logger.error("Run train_mlp_v1.py first to generate the model.")
        sys.exit(1)

    model = MLPClassifier(input_dim=INPUT_DIM)
    state_dict = torch.load(MODEL_PATH, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    logger.info(f"Loaded MLP model from {MODEL_PATH}")
    return model


# ============================================================
# Inference
# ============================================================


def compute_gradient_importance(
    model: torch.nn.Module,
    features: torch.Tensor,
) -> List[float]:
    """
    Compute simple gradient-based feature importance for the predicted class.
    
    Uses input gradients: |∂output/∂input| for each of the 20 property features.
    This gives a rough indication of which features most influence the prediction.
    """
    features_grad = features.clone().detach().requires_grad_(True)

    logits = model(features_grad)
    predicted_class = logits.argmax(dim=1)

    # Backward pass on the predicted class logit
    target_logit = logits[0, predicted_class[0]]
    target_logit.backward()

    # Get gradients for property features only (first 20 dims)
    grads = features_grad.grad[0, :NUM_PROPERTY_FEATURES].abs()

    # Normalize to sum to 1
    total = grads.sum()
    if total > 0:
        grads = grads / total

    return grads.tolist()


def run_inference(
    model: torch.nn.Module,
    input_data: Dict,
) -> Dict:
    """
    Run a single inference pass.
    
    Args:
        model: Loaded MLP model.
        input_data: Parsed JSON input with 'features' and 'computeImportance'.
        
    Returns:
        Result dict matching InferenceOutput type.
    """
    start_time = time.time()

    # Parse input
    features_list = input_data.get("features", [])
    compute_importance = input_data.get("computeImportance", False)

    if len(features_list) != INPUT_DIM:
        return {
            "error": f"Expected {INPUT_DIM} features, got {len(features_list)}",
            "predictedClass": -1,
            "probabilities": [0.0, 0.0],
            "featureImportance": [],
            "inferenceTimeMs": 0.0,
        }

    # Convert to tensor
    features = torch.tensor([features_list], dtype=torch.float32)

    # Forward pass
    with torch.no_grad():
        logits = model(features)
        probabilities = F.softmax(logits, dim=1)[0]
        predicted_class = logits.argmax(dim=1)[0].item()

    # Feature importance (requires gradients, so separate call)
    feature_importance = []
    if compute_importance:
        try:
            feature_importance = compute_gradient_importance(model, features)
        except Exception as e:
            logger.warning(f"Feature importance computation failed: {e}")
            feature_importance = [0.0] * NUM_PROPERTY_FEATURES

    elapsed_ms = (time.time() - start_time) * 1000

    return {
        "predictedClass": int(predicted_class),
        "probabilities": [
            round(probabilities[0].item(), 6),
            round(probabilities[1].item(), 6),
        ],
        "featureImportance": [round(v, 6) for v in feature_importance],
        "inferenceTimeMs": round(elapsed_ms, 2),
    }


# ============================================================
# Main Loop (stdin/stdout JSON protocol)
# ============================================================


def main():
    """
    Main entry point. Loads model once, then reads JSON lines from stdin.
    Each line is an inference request; result is written as JSON to stdout.
    """
    logger.info("=" * 50)
    logger.info("MGTAB Detector — V1 Inference Server Starting")
    logger.info("=" * 50)

    model = load_model()
    logger.info("Model loaded. Waiting for input on stdin...")

    # Signal readiness
    print(json.dumps({"status": "ready", "model": "mlp_v1"}), flush=True)

    # Process requests line by line
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            input_data = json.loads(line)
        except json.JSONDecodeError as e:
            error_response = {
                "error": f"Invalid JSON: {str(e)}",
                "predictedClass": -1,
                "probabilities": [0.0, 0.0],
                "featureImportance": [],
                "inferenceTimeMs": 0.0,
            }
            print(json.dumps(error_response), flush=True)
            continue

        result = run_inference(model, input_data)
        print(json.dumps(result), flush=True)

    logger.info("Stdin closed. Shutting down.")


if __name__ == "__main__":
    main()
