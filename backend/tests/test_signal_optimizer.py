from traffic_monitor.signal_optimizer import ViewScore, allocate_green_times


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
