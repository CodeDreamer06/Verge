from __future__ import annotations

from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
ASSETS_DIR = BACKEND_ROOT / "assets"
MODELS_DIR = ASSETS_DIR / "models"
DEFAULT_MODEL_NAME = "yolov8n.pt"
DEFAULT_MODEL_PATH = MODELS_DIR / DEFAULT_MODEL_NAME

VEHICLE_CLASS_IDS = [1, 2, 3, 5, 7]
VEHICLE_CLASS_NAMES = {
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}
VEHICLE_WEIGHTS = {
    "bicycle": 0.4,
    "car": 1.0,
    "motorcycle": 0.6,
    "bus": 2.5,
    "truck": 2.0,
}
