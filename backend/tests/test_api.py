from fastapi.testclient import TestClient

from traffic_monitor.api import app
from traffic_monitor import api


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_serialize_result_includes_static_comparison():
    request = client.build_request("GET", "/")
    result = {
        "model_path": "/tmp/model.pt",
        "emergency_model_path": "/tmp/emergency.pt",
        "cycle_time_seconds": 120,
        "incidents": [],
        "recommended_green_times_seconds": {"view_1": 45, "view_2": 30, "view_3": 25, "view_4": 20},
        "priority_mode": "balanced",
        "priority_view": None,
        "signal_sequence": ["view_1", "view_2", "view_3", "view_4"],
        "comparison_to_static": {
            "static_green_times_seconds": {"view_1": 30, "view_2": 30, "view_3": 30, "view_4": 30},
            "estimated_average_wait_static_seconds": 90.0,
            "estimated_average_wait_adaptive_seconds": 72.5,
            "estimated_average_wait_saved_seconds": 17.5,
            "estimated_total_delay_reduction_per_cycle_seconds": 144.0,
        },
        "views": [],
    }

    payload = api._serialize_result(request, "run-123", result)

    assert payload["comparison_to_static"]["estimated_average_wait_saved_seconds"] == 17.5
