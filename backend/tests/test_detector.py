from pathlib import Path

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
