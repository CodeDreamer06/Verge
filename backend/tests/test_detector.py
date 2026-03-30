import sys
import types
from collections import Counter
from pathlib import Path

import numpy as np

from traffic_monitor import detector


def test_load_emergency_model_falls_back_when_clip_dependency_is_missing(monkeypatch):
    class BrokenWorldModel:
        def __init__(self, model_path: str):
            self.model_path = model_path

        def set_classes(self, classes):
            raise ModuleNotFoundError("No module named 'clip'")

    monkeypatch.setattr(detector, "YOLOWorld", BrokenWorldModel)

    model = detector._load_emergency_model(Path("/tmp/yolov8s-world.pt"))

    assert isinstance(model, detector._NullEmergencyModel)


def test_sanitize_plate_text_normalizes_viable_values():
    assert detector._sanitize_plate_text("ts09ep1234") == "TS09EP 1234"
    assert detector._sanitize_plate_text("ab12cd") == "AB 12CD"


def test_sanitize_plate_text_rejects_short_noise():
    assert detector._sanitize_plate_text("a1") == "Unknown"


def test_dominant_signal_state_uses_most_common_value():
    assert detector._dominant_signal_state(Counter({"red": 3, "green": 1})) == "red"


def test_load_plate_model_uses_yolov5_adapter_for_legacy_checkpoint(monkeypatch, tmp_path):
    legacy_checkpoint = tmp_path / "plate_detection.pt"
    legacy_checkpoint.write_bytes(b"weights")

    def reject_legacy_checkpoint(model_path: str):
        raise RuntimeError(
            "ERROR /tmp/plate_detection.pt appears to be an Ultralytics YOLOv5 model. "
            "This model is NOT forwards compatible with YOLOv8."
        )

    class FakePredictions:
        def __init__(self):
            self.pred = [types.SimpleNamespace(tolist=lambda: [[2.0, 3.0, 8.0, 9.0, 0.91, 0.0]])]
            self.names = {0: "license plate"}

    class FakeYoloV5Model:
        names = {0: "license plate"}

        def __call__(self, frame, size: int):
            assert size == 640
            assert frame.shape == (12, 12, 3)
            return FakePredictions()

    fake_module = types.SimpleNamespace(load=lambda model_path: FakeYoloV5Model())

    monkeypatch.setattr(detector, "PLATE_MODEL_PATH", legacy_checkpoint)
    monkeypatch.setattr(detector, "YOLO", reject_legacy_checkpoint)
    monkeypatch.setitem(sys.modules, "yolov5", fake_module)

    model = detector._load_plate_model()

    frame = np.ones((12, 12, 3), dtype=np.uint8)
    result = model.predict(frame, conf=0.4, imgsz=640)[0]
    crop, confidence = detector._pick_plate_crop(result, frame)

    assert isinstance(model, detector._YoloV5PlateAdapter)
    assert confidence == 0.91
    assert crop is not None


def test_load_plate_model_falls_back_when_yolov5_runtime_is_unavailable(monkeypatch, tmp_path):
    legacy_checkpoint = tmp_path / "plate_detection.pt"
    legacy_checkpoint.write_bytes(b"weights")

    monkeypatch.setattr(detector, "PLATE_MODEL_PATH", legacy_checkpoint)
    monkeypatch.setattr(
        detector,
        "YOLO",
        lambda model_path: (_ for _ in ()).throw(
            RuntimeError(
                "ERROR /tmp/plate_detection.pt appears to be an Ultralytics YOLOv5 model. "
                "This model is NOT forwards compatible with YOLOv8."
            )
        ),
    )
    monkeypatch.delitem(sys.modules, "yolov5", raising=False)

    real_import = __import__

    def fake_import(name, *args, **kwargs):
        if name == "yolov5":
            raise ImportError("No module named 'yolov5'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", fake_import)

    model = detector._load_plate_model()

    assert isinstance(model, detector._NullPlateModel)
