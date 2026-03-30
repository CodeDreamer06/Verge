from __future__ import annotations

from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import OUTPUTS_DIR, UPLOADS_DIR
from .detector import analyze_videos, cleanup_paths

MAX_UPLOADS = 4
FAST_API_FRAME_STRIDE = 6
FAST_API_EMERGENCY_FRAME_STRIDE = 24
FAST_API_INFERENCE_SIZE = 416

app = FastAPI(title="Verge Traffic API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    request: Request,
    videos: list[UploadFile] = File(...),
    cycle_time: int = Form(120),
    min_green: int = Form(15),
    max_green: int = Form(75),
    frame_stride: int = Form(FAST_API_FRAME_STRIDE),
    conf_threshold: float = Form(0.25),
) -> dict:
    if not videos:
        raise HTTPException(status_code=400, detail="At least one video upload is required.")
    if len(videos) > MAX_UPLOADS:
        raise HTTPException(status_code=400, detail="A maximum of four videos is supported.")

    run_id = _build_run_id()
    upload_dir = UPLOADS_DIR / run_id
    output_dir = OUTPUTS_DIR / run_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[Path] = []
    try:
        for index, upload in enumerate(videos, start=1):
            suffix = Path(upload.filename or f"view_{index}.mp4").suffix or ".mp4"
            target = upload_dir / f"view_{index}{suffix}"
            target.write_bytes(await upload.read())
            saved_paths.append(target)

        result = analyze_videos(
            video_paths=saved_paths,
            output_dir=output_dir,
            conf_threshold=conf_threshold,
            frame_stride=frame_stride,
            emergency_frame_stride=max(frame_stride, FAST_API_EMERGENCY_FRAME_STRIDE),
            cycle_time=cycle_time,
            min_green=min_green,
            max_green=max_green,
            save_annotated=True,
            inference_size=FAST_API_INFERENCE_SIZE,
            use_tracking=True,
        )
    except Exception as exc:
        cleanup_paths([upload_dir, output_dir])
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        cleanup_paths([upload_dir])
        for upload in videos:
            await upload.close()

    return _serialize_result(request, run_id, result)


def _build_run_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{timestamp}-{uuid4().hex[:8]}"


def _serialize_result(request: Request, run_id: str, result: dict) -> dict:
    base_url = str(request.base_url).rstrip("/")
    views = []
    for view in result["views"]:
        view_data = dict(view)
        annotated_video = view_data.get("annotated_video")
        if annotated_video:
            path = Path(annotated_video)
            view_data["annotated_video_url"] = f"{base_url}/outputs/{run_id}/{path.name}"
        views.append(view_data)

    return {
        "run_id": run_id,
        "model_path": result["model_path"],
        "emergency_model_path": result["emergency_model_path"],
        "cycle_time_seconds": result["cycle_time_seconds"],
        "summary_url": f"{base_url}/outputs/{run_id}/traffic_summary.json",
        "incidents": result["incidents"],
        "recommended_green_times_seconds": result["recommended_green_times_seconds"],
        "priority_mode": result["priority_mode"],
        "priority_view": result["priority_view"],
        "signal_sequence": result["signal_sequence"],
        "views": views,
    }
