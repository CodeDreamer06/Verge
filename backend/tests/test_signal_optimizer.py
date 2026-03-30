from traffic_monitor.signal_optimizer import ViewScore, allocate_green_times, apply_priority_override
from traffic_monitor.detector import _count_detections


def test_allocate_green_times_respects_bounds_and_cycle():
    allocations = allocate_green_times(
        view_scores=[
            ViewScore(label="view_1", congestion_score=12),
            ViewScore(label="view_2", congestion_score=6),
            ViewScore(label="view_3", congestion_score=2),
        ],
        cycle_time=120,
        min_green=15,
        max_green=75,
    )

    assert sum(allocations.values()) == 120
    assert allocations["view_1"] > allocations["view_2"] > allocations["view_3"]
    assert min(allocations.values()) >= 15
    assert max(allocations.values()) <= 75


def test_allocate_green_times_even_split_when_scores_are_zero():
    allocations = allocate_green_times(
        view_scores=[
            ViewScore(label="view_1", congestion_score=0),
            ViewScore(label="view_2", congestion_score=0),
            ViewScore(label="view_3", congestion_score=0),
            ViewScore(label="view_4", congestion_score=0),
        ],
        cycle_time=120,
        min_green=15,
        max_green=60,
    )

    assert allocations == {
        "view_1": 30,
        "view_2": 30,
        "view_3": 30,
        "view_4": 30,
    }


def test_allocate_green_times_single_view_uses_full_cycle():
    allocations = allocate_green_times(
        view_scores=[ViewScore(label="view_1", congestion_score=0)],
        cycle_time=120,
        min_green=15,
        max_green=75,
    )

    assert allocations == {"view_1": 120}


def test_apply_priority_override_promotes_emergency_view_to_front():
    view_scores = [
        ViewScore(label="view_1", congestion_score=1005),
        ViewScore(label="view_2", congestion_score=12),
        ViewScore(label="view_3", congestion_score=9),
        ViewScore(label="view_4", congestion_score=6),
    ]
    allocations = allocate_green_times(
        view_scores=view_scores,
        cycle_time=120,
        min_green=15,
        max_green=75,
    )

    prioritized = apply_priority_override(
        view_scores=view_scores,
        allocations=allocations,
        cycle_time=120,
        min_green=15,
        max_green=75,
        priority_label="view_1",
    )

    assert sum(prioritized.values()) == 120
    assert prioritized["view_1"] == 75
    assert all(seconds >= 15 for label, seconds in prioritized.items() if label != "view_1")


class _Boxes:
    def __init__(self, classes):
        self.cls = _ClassList(classes)


class _ClassList:
    def __init__(self, values):
        self.values = values

    def int(self):
        return self

    def tolist(self):
        return self.values


class _Result:
    def __init__(self, classes):
        self.boxes = _Boxes(classes)


def test_vehicle_class_weights_raise_load_for_larger_vehicles():
    cars_count, cars_weight = _count_detections(_Result([2, 2, 2]))
    mixed_count, mixed_weight = _count_detections(_Result([5, 7, 2]))

    assert cars_count == mixed_count == 3
    assert mixed_weight > cars_weight


def test_weighted_load_translates_to_longer_green_allocations():
    allocations = allocate_green_times(
        view_scores=[
            ViewScore(label="cars_only", congestion_score=3.0),
            ViewScore(label="bus_truck_mix", congestion_score=5.5),
        ],
        cycle_time=80,
        min_green=15,
        max_green=55,
    )

    assert allocations["bus_truck_mix"] > allocations["cars_only"]
