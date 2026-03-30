from __future__ import annotations

import shutil
from pathlib import Path

from ultralytics import YOLO

from .config import DEFAULT_MODEL_NAME, DEFAULT_MODEL_PATH, MODELS_DIR


def ensure_model(model_name: str = DEFAULT_MODEL_NAME, destination: Path | None = None) -> Path:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    target = destination or (MODELS_DIR / model_name)
    if target.exists():
        return target

    model = YOLO(model_name)
    source_path = Path(model.ckpt_path or model_name)
    if not source_path.exists():
        raise FileNotFoundError(f"Unable to locate downloaded model weights for {model_name}.")

    shutil.copy2(source_path, target)
    return target


def default_model_path() -> Path:
    return DEFAULT_MODEL_PATH

