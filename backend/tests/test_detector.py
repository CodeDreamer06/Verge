from pathlib import Path

from collections import Counter

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
