from __future__ import annotations

import json
import shutil
import subprocess
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
from ultralytics import YOLO

from .config import (
    EMERGENCY_CLASS_NAMES,
    EMERGENCY_MODEL_NAME,
    EMERGENCY_PRIORITY_SCORE,
    VEHICLE_CLASS_IDS,
    VEHICLE_CLASS_NAMES,
    VEHICLE_WEIGHTS,
)
from .model_store import ensure_model
from .signal_optimizer import ViewScore, allocate_green_times, apply_priority_override

try:
    from ultralytics import YOLOWorld
except ImportError:  # pragma: no cover - depends on installed ultralytics version
    YOLOWorld = None


@dataclass(slots=True)
class EmergencyEvent:
    label: str
    confidence: float
    frame_index: int
    timestamp_seconds: float


@dataclass(slots=True)
class ViewAnalysis:
    view: str
    video_path: str
    frames_processed: int
    sampled_fps: float
    average_vehicle_count: float
    peak_vehicle_count: int
    estimated_unique_vehicles: int
    class_breakdown: dict[str, int]
    weighted_average_load: float
    weighted_peak_load: float
    congestion_score: float
    emergency_detected: bool
    emergency_counts: dict[str, int]
    strongest_emergency: EmergencyEvent | None
    priority_score: float
    annotated_video: str | None = None


def analyze_videos(
    video_paths: list[Path],
    output_dir: Path,
    model_path: Path | None = None,
    conf_threshold: float = 0.25,
    frame_stride: int = 3,
    cycle_time: int = 120,
    min_green: int = 15,
    max_green: int = 75,
    save_annotated: bool = False,
) -> dict:
    if not video_paths:
        raise ValueError("At least one video path is required.")
    if min_green > max_green:
        raise ValueError("min_green cannot be greater than max_green.")

    output_dir.mkdir(parents=True, exist_ok=True)
    resolved_model = ensure_model(destination=model_path) if model_path else ensure_model()
    emergency_model_path = ensure_model(model_name=EMERGENCY_MODEL_NAME)
    model = YOLO(str(resolved_model))
    emergency_model = _load_emergency_model(emergency_model_path)

    analyses: list[ViewAnalysis] = []
    view_scores: list[ViewScore] = []

    for index, video_path in enumerate(video_paths, start=1):
        analysis = _analyze_single_video(
            model=model,
            emergency_model=emergency_model,
            video_path=video_path,
            output_dir=output_dir,
            view_label=f"view_{index}",
            conf_threshold=conf_threshold,
            frame_stride=frame_stride,
            save_annotated=save_annotated,
        )
        analyses.append(analysis)
        view_scores.append(ViewScore(label=analysis.view, congestion_score=analysis.priority_score))

    base_green_times = allocate_green_times(
        view_scores=view_scores,
        cycle_time=cycle_time,
        min_green=min_green,
        max_green=max_green,
    )
    priority_view = _pick_priority_view(analyses)
    recommended_green_times = apply_priority_override(
        view_scores=view_scores,
        allocations=base_green_times,
        cycle_time=cycle_time,
        min_green=min_green,
        max_green=max_green,
        priority_label=priority_view,
    )
    signal_sequence = _build_signal_sequence(analyses, recommended_green_times, priority_view)

    result = {
        "model_path": str(resolved_model),
        "emergency_model_path": str(emergency_model_path),
        "cycle_time_seconds": cycle_time,
        "views": [asdict(analysis) for analysis in analyses],
        "recommended_green_times_seconds": recommended_green_times,
        "priority_mode": "emergency_override" if priority_view else "balanced",
        "priority_view": priority_view,
        "signal_sequence": signal_sequence,
    }
    summary_path = output_dir / "traffic_summary.json"
    summary_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    result["summary_path"] = str(summary_path)
    return result


def cleanup_paths(paths: list[Path]) -> None:
    for path in paths:
        if not path.exists():
            continue
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
        else:
            path.unlink(missing_ok=True)


def _analyze_single_video(
    model: YOLO,
    emergency_model,
    video_path: Path,
    output_dir: Path,
    view_label: str,
    conf_threshold: float,
    frame_stride: int,
    save_annotated: bool,
) -> ViewAnalysis:
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 0.0
    frame_width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    frame_height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    raw_annotated_path = output_dir / f"{view_label}_annotated_raw.mp4"
    final_annotated_path = output_dir / f"{view_label}_annotated.mp4"
    writer = _build_writer(raw_annotated_path, fps, frame_width, frame_height) if save_annotated else None

    total_count = 0
    total_weighted_count = 0.0
    peak_count = 0
    peak_weighted = 0.0
    sampled_frames = 0
    tracked_ids: set[tuple[str, int]] = set()
    class_breakdown: Counter[str] = Counter()
    emergency_counts: Counter[str] = Counter()
    strongest_emergency: EmergencyEvent | None = None
    frame_index = 0

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break

            frame_index += 1
            if frame_stride > 1 and frame_index % frame_stride != 0:
                continue

            try:
                results = model.track(
                    frame,
                    persist=True,
                    conf=conf_threshold,
                    classes=VEHICLE_CLASS_IDS,
                    verbose=False,
                    tracker="bytetrack.yaml",
                )
            except ModuleNotFoundError:
                results = model.predict(
                    frame,
                    conf=conf_threshold,
                    classes=VEHICLE_CLASS_IDS,
                    verbose=False,
                )
            result = results[0]
            vehicle_count, weighted_count = _count_detections(result)

            total_count += vehicle_count
            total_weighted_count += weighted_count
            peak_count = max(peak_count, vehicle_count)
            peak_weighted = max(peak_weighted, weighted_count)
            sampled_frames += 1

            emergency_result = emergency_model.predict(frame, conf=conf_threshold, verbose=False)[0]
            emergency_matches, frame_strongest = _extract_emergency_matches(
                emergency_result,
                frame_index=frame_index,
                fps=fps,
            )
            emergency_counts.update(emergency_matches)
            if frame_strongest and (
                strongest_emergency is None or frame_strongest.confidence > strongest_emergency.confidence
            ):
                strongest_emergency = frame_strongest

            boxes = result.boxes
            if boxes is not None and boxes.cls is not None:
                classes = boxes.cls.int().tolist()
                ids = boxes.id.int().tolist() if boxes.id is not None else [None] * len(classes)
                for class_id, track_id in zip(classes, ids, strict=False):
                    class_name = VEHICLE_CLASS_NAMES.get(class_id)
                    if not class_name:
                        continue
                    if track_id is None:
                        continue
                    token = (class_name, int(track_id))
                    if token not in tracked_ids:
                        tracked_ids.add(token)
                        class_breakdown[class_name] += 1

            if writer is not None:
                writer.write(result.plot())
    finally:
        capture.release()
        if writer is not None:
            writer.release()
            _finalize_annotated_video(raw_annotated_path, final_annotated_path)

    average_vehicle_count = (total_count / sampled_frames) if sampled_frames else 0.0
    weighted_average_load = (total_weighted_count / sampled_frames) if sampled_frames else 0.0
    estimated_unique = sum(class_breakdown.values()) if class_breakdown else peak_count
    if not class_breakdown and peak_count > 0:
        class_breakdown["vehicle_estimate"] = peak_count

    congestion_score = round((weighted_average_load * 0.65) + (peak_weighted * 0.35), 3)
    emergency_detected = bool(emergency_counts)
    priority_score = congestion_score + (EMERGENCY_PRIORITY_SCORE if emergency_detected else 0.0)
    annotated_video = str(final_annotated_path) if save_annotated else None

    return ViewAnalysis(
        view=view_label,
        video_path=str(video_path),
        frames_processed=sampled_frames,
        sampled_fps=round((fps / frame_stride) if frame_stride > 0 else fps, 2),
        average_vehicle_count=round(average_vehicle_count, 3),
        peak_vehicle_count=peak_count,
        estimated_unique_vehicles=estimated_unique,
        class_breakdown=dict(class_breakdown),
        weighted_average_load=round(weighted_average_load, 3),
        weighted_peak_load=round(peak_weighted, 3),
        congestion_score=congestion_score,
        emergency_detected=emergency_detected,
        emergency_counts=dict(emergency_counts),
        strongest_emergency=strongest_emergency,
        priority_score=round(priority_score, 3),
        annotated_video=annotated_video,
    )


def _count_detections(result) -> tuple[int, float]:
    boxes = result.boxes
    if boxes is None or boxes.cls is None:
        return 0, 0.0

    classes = boxes.cls.int().tolist()
    names = [VEHICLE_CLASS_NAMES.get(class_id) for class_id in classes]
    valid_names = [name for name in names if name]
    weighted = sum(VEHICLE_WEIGHTS[name] for name in valid_names)
    return len(valid_names), float(weighted)


def _build_writer(target_path: Path, fps: float, frame_width: int, frame_height: int):
    if not frame_width or not frame_height:
        return None
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    safe_fps = fps if fps > 0 else 15.0
    return cv2.VideoWriter(str(target_path), fourcc, safe_fps, (frame_width, frame_height))


def _load_emergency_model(model_path: Path):
    if YOLOWorld is not None:
        model = YOLOWorld(str(model_path))
        model.set_classes(EMERGENCY_CLASS_NAMES)
        return model

    model = YOLO(str(model_path))
    if hasattr(model, "set_classes"):
        model.set_classes(EMERGENCY_CLASS_NAMES)
    return model


def _extract_emergency_matches(result, frame_index: int, fps: float) -> tuple[Counter[str], EmergencyEvent | None]:
    boxes = result.boxes
    if boxes is None or boxes.cls is None:
        return Counter(), None

    names = getattr(result, "names", {})
    counts: Counter[str] = Counter()
    strongest: EmergencyEvent | None = None
    classes = boxes.cls.int().tolist()
    confidences = boxes.conf.tolist() if boxes.conf is not None else [0.0] * len(classes)

    for class_id, confidence in zip(classes, confidences, strict=False):
        label = names.get(class_id) if isinstance(names, dict) else None
        if not label:
            continue
        normalized = str(label).lower()
        if normalized not in EMERGENCY_CLASS_NAMES:
            continue

        counts[normalized] += 1
        candidate = EmergencyEvent(
            label=normalized,
            confidence=round(float(confidence), 3),
            frame_index=frame_index,
            timestamp_seconds=round((frame_index / fps), 2) if fps > 0 else 0.0,
        )
        if strongest is None or candidate.confidence > strongest.confidence:
            strongest = candidate

    return counts, strongest


def _pick_priority_view(analyses: list[ViewAnalysis]) -> str | None:
    emergency_views = [analysis for analysis in analyses if analysis.emergency_detected]
    if not emergency_views:
        return None
    emergency_views.sort(
        key=lambda analysis: (
            analysis.strongest_emergency.confidence if analysis.strongest_emergency else 0.0,
            analysis.weighted_peak_load,
            analysis.congestion_score,
        ),
        reverse=True,
    )
    return emergency_views[0].view


def _build_signal_sequence(
    analyses: list[ViewAnalysis],
    allocations: dict[str, int],
    priority_view: str | None,
) -> list[str]:
    order = [analysis.view for analysis in analyses if analysis.view in allocations]
    if priority_view and priority_view in order:
        order = [priority_view, *[view for view in order if view != priority_view]]

    trailing = sorted(
        [view for view in order if view != priority_view],
        key=lambda view: allocations.get(view, 0),
        reverse=True,
    )
    return [priority_view, *trailing] if priority_view else trailing


def _finalize_annotated_video(raw_path: Path, final_path: Path) -> None:
    if not raw_path.exists():
        return

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(raw_path),
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(final_path),
    ]

    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        raw_path.unlink(missing_ok=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        raw_path.replace(final_path)
