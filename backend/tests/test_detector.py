from collections import Counter
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


def test_build_incidents_feed_returns_sorted_incidents():
    first = detector.ViewAnalysis(
        view="view_1",
        video_path="/tmp/view_1.mp4",
        frames_processed=10,
        sampled_fps=5.0,
        average_vehicle_count=2.0,
        peak_vehicle_count=4,
        estimated_unique_vehicles=4,
        class_breakdown={"car": 4},
        weighted_average_load=2.0,
        weighted_peak_load=4.0,
        congestion_score=2.7,
        emergency_detected=False,
        emergency_counts={},
        strongest_emergency=None,
        priority_score=2.7,
        signal_state_counts={},
        dominant_signal_state=None,
        violations=[{"id": "A", "timestamp_seconds": 5.0}],
        annotated_video=None,
    )
    second = detector.ViewAnalysis(
        view="view_2",
        video_path="/tmp/view_2.mp4",
        frames_processed=10,
        sampled_fps=5.0,
        average_vehicle_count=2.0,
        peak_vehicle_count=4,
        estimated_unique_vehicles=4,
        class_breakdown={"car": 4},
        weighted_average_load=2.0,
        weighted_peak_load=4.0,
        congestion_score=2.7,
        emergency_detected=False,
        emergency_counts={},
        strongest_emergency=None,
        priority_score=2.7,
        signal_state_counts={},
        dominant_signal_state=None,
        violations=[{"id": "B", "timestamp_seconds": 9.0}],
        annotated_video=None,
    )

    incidents = detector._build_incidents_feed([first, second])

    assert [incident["id"] for incident in incidents] == ["B", "A"]


def test_extract_emergency_matches_uses_known_labels():
    class FakeTensor:
        def __init__(self, values):
            self._values = values

        def int(self):
            return FakeTensor([int(value) for value in self._values])

        def tolist(self):
            return self._values

    result = type(
        "Result",
        (),
        {
            "boxes": type(
                "Boxes",
                (),
                {
                    "cls": FakeTensor([0, 1]),
                    "conf": FakeTensor([0.82, 0.41]),
                },
            )(),
            "names": {0: "ambulance", 1: "car"},
        },
    )()

    counts, strongest = detector._extract_emergency_matches(result, frame_index=48, fps=24.0)

    assert counts == Counter({"ambulance": 1})
    assert strongest is not None
    assert strongest.label == "ambulance"
    assert strongest.timestamp_seconds == 2.0
