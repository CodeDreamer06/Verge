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


def test_extract_plate_crop_uses_scene_model_only():
    frame = np.ones((16, 16, 3), dtype=np.uint8)

    class FakeTensor:
        def __init__(self, values):
            self._values = values

        def int(self):
            return FakeTensor([int(value) for value in self._values])

        def tolist(self):
            return self._values

    class FakeBoxes:
        cls = FakeTensor([0])
        xyxy = FakeTensor([[2, 3, 10, 9]])
        conf = FakeTensor([0.87])

    class FakeSceneModel:
        def predict(self, frame, conf: float, verbose: bool, imgsz: int):
            assert frame.shape == (16, 16, 3)
            assert conf == 0.2
            assert verbose is False
            assert imgsz == 640
            return [type("Result", (), {"boxes": FakeBoxes(), "names": {0: "license plate"}})()]

    crop, confidence = detector._extract_plate_crop(frame, FakeSceneModel(), conf_threshold=0.1, inference_size=640)

    assert crop is not None
    assert crop.shape == (6, 8, 3)
    assert confidence == 0.87
