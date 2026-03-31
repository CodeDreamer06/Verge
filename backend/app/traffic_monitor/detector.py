from __future__ import annotations

import os
import json
import logging
import shutil
import subprocess
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from collections import Counter
from dataclasses import asdict, dataclass
from math import ceil
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

logger = logging.getLogger(__name__)
PROGRESS_LOG_INTERVAL_FRAMES = 120
MAX_PARALLEL_VIEW_WORKERS = 2


@dataclass(slots=True)
class EmergencyEvent:
    label: str
    confidence: float
    frame_index: int
    timestamp_seconds: float


class _NullEmergencyModel:
    def predict(self, *args, **kwargs):
        return [_NullEmergencyResult()]


class _NullEmergencyResult:
    boxes = None
    names: dict[int, str] = {}


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
    signal_state_counts: dict[str, int]
    dominant_signal_state: str | None
    violations: list[dict]
    annotated_video: str | None = None


@dataclass(slots=True)
class _ViewTask:
    video_path: str
    output_dir: str
    view_label: str
    conf_threshold: float
    frame_stride: int
    emergency_frame_stride: int
    save_annotated: bool
    inference_size: int
    use_tracking: bool
    model_path: str
    emergency_model_path: str


@dataclass(slots=True)
class TimingComparison:
    static_green_times_seconds: dict[str, int]
    estimated_average_wait_static_seconds: float
    estimated_average_wait_adaptive_seconds: float
    estimated_average_wait_saved_seconds: float
    estimated_total_delay_reduction_per_cycle_seconds: float


def analyze_videos(
    video_paths: list[Path],
    output_dir: Path,
    model_path: Path | None = None,
    conf_threshold: float = 0.25,
    frame_stride: int = 3,
    emergency_frame_stride: int | None = None,
    cycle_time: int = 120,
    min_green: int = 15,
    max_green: int = 75,
    save_annotated: bool = False,
    inference_size: int = 640,
    use_tracking: bool = True,
) -> dict:
    started_at = time.perf_counter()
    if not video_paths:
        raise ValueError("At least one video path is required.")
    if min_green > max_green:
        raise ValueError("min_green cannot be greater than max_green.")
    if frame_stride < 1:
        raise ValueError("frame_stride must be at least 1.")
    if emergency_frame_stride is not None and emergency_frame_stride < 1:
        raise ValueError("emergency_frame_stride must be at least 1.")

    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Starting traffic analysis videos=%d output_dir=%s frame_stride=%d emergency_frame_stride=%s conf=%.2f inference_size=%d tracking=%s annotated=%s",
        len(video_paths),
        output_dir,
        frame_stride,
        emergency_frame_stride,
        conf_threshold,
        inference_size,
        use_tracking,
        save_annotated,
    )
    resolved_model = ensure_model(destination=model_path) if model_path else ensure_model()
    emergency_model_path = ensure_model(model_name=EMERGENCY_MODEL_NAME)
    logger.info("Resolved models vehicle=%s emergency=%s", resolved_model, emergency_model_path)
    analyses = _analyze_views(
        video_paths=video_paths,
        output_dir=output_dir,
        resolved_model=resolved_model,
        emergency_model_path=emergency_model_path,
        conf_threshold=conf_threshold,
        frame_stride=frame_stride,
        emergency_frame_stride=emergency_frame_stride or frame_stride,
        save_annotated=save_annotated,
        inference_size=inference_size,
        use_tracking=use_tracking,
    )
    view_scores = [ViewScore(label=analysis.view, congestion_score=analysis.priority_score) for analysis in analyses]

    incidents = _build_incidents_feed(analyses)

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
    timing_comparison = _build_timing_comparison(
        analyses=analyses,
        adaptive_allocations=recommended_green_times,
        cycle_time=cycle_time,
        min_green=min_green,
        max_green=max_green,
    )

    result = {
        "model_path": str(resolved_model),
        "emergency_model_path": str(emergency_model_path),
        "cycle_time_seconds": cycle_time,
        "views": [asdict(analysis) for analysis in analyses],
        "incidents": incidents,
        "recommended_green_times_seconds": recommended_green_times,
        "priority_mode": "emergency_override" if priority_view else "balanced",
        "priority_view": priority_view,
        "signal_sequence": signal_sequence,
        "comparison_to_static": asdict(timing_comparison),
    }
    summary_path = output_dir / "traffic_summary.json"
    summary_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    result["summary_path"] = str(summary_path)
    logger.info("Traffic analysis finished summary=%s total=%.2fs", summary_path, time.perf_counter() - started_at)
    return result


def _analyze_views(
    video_paths: list[Path],
    output_dir: Path,
    resolved_model: Path,
    emergency_model_path: Path,
    conf_threshold: float,
    frame_stride: int,
    emergency_frame_stride: int,
    save_annotated: bool,
    inference_size: int,
    use_tracking: bool,
) -> list[ViewAnalysis]:
    tasks = [
        _ViewTask(
            video_path=str(video_path),
            output_dir=str(output_dir),
            view_label=f"view_{index}",
            conf_threshold=conf_threshold,
            frame_stride=frame_stride,
            emergency_frame_stride=emergency_frame_stride,
            save_annotated=save_annotated,
            inference_size=inference_size,
            use_tracking=use_tracking,
            model_path=str(resolved_model),
            emergency_model_path=str(emergency_model_path),
        )
        for index, video_path in enumerate(video_paths, start=1)
    ]
    max_workers = _determine_parallel_view_workers(len(tasks))
    logger.info("Using parallel view workers=%d", max_workers)

    if max_workers <= 1:
        return [_analyze_view_task(task) for task in tasks]

    analyses_by_label: dict[str, ViewAnalysis] = {}
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_task = {executor.submit(_analyze_view_task, task): task for task in tasks}
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            analysis = future.result()
            analyses_by_label[analysis.view] = analysis
            logger.info(
                "Completed view=%s source=%s frames=%d avg_vehicles=%.2f peak=%d violations=%d emergencies=%s",
                analysis.view,
                task.video_path,
                analysis.frames_processed,
                analysis.average_vehicle_count,
                analysis.peak_vehicle_count,
                len(analysis.violations),
                analysis.emergency_detected,
            )

    return [analyses_by_label[f"view_{index}"] for index in range(1, len(tasks) + 1)]


def _determine_parallel_view_workers(task_count: int) -> int:
    if task_count <= 1:
        return 1
    cpu_total = os.cpu_count() or 1
    return max(1, min(task_count, MAX_PARALLEL_VIEW_WORKERS, cpu_total))


def _analyze_view_task(task: _ViewTask) -> ViewAnalysis:
    model_init_started = time.perf_counter()
    model = YOLO(task.model_path)
    emergency_model = _load_emergency_model(Path(task.emergency_model_path))
    logger.info("Initialized worker models view=%s in %.2fs", task.view_label, time.perf_counter() - model_init_started)
    return _analyze_single_video(
        model=model,
        emergency_model=emergency_model,
        video_path=Path(task.video_path),
        output_dir=Path(task.output_dir),
        view_label=task.view_label,
        conf_threshold=task.conf_threshold,
        frame_stride=task.frame_stride,
        emergency_frame_stride=task.emergency_frame_stride,
        save_annotated=task.save_annotated,
        inference_size=task.inference_size,
        use_tracking=task.use_tracking,
    )


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
    emergency_frame_stride: int,
    save_annotated: bool,
    inference_size: int,
    use_tracking: bool,
) -> ViewAnalysis:
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    started_at = time.perf_counter()
    logger.info("Starting view analysis view=%s video=%s", view_label, video_path)

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 0.0
    raw_annotated_path = output_dir / f"{view_label}_annotated_raw.mp4"
    final_annotated_path = output_dir / f"{view_label}_annotated.mp4"
    writer = None

    total_count = 0
    total_weighted_count = 0.0
    peak_count = 0
    peak_weighted = 0.0
    sampled_frames = 0
    tracked_ids: set[tuple[str, int]] = set()
    class_breakdown: Counter[str] = Counter()
    emergency_counts: Counter[str] = Counter()
    strongest_emergency: EmergencyEvent | None = None
    violations: list[dict] = []
    frame_index = 0

    try:
        while True:
            if frame_stride > 1:
                should_stop = False
                for _ in range(frame_stride - 1):
                    if not capture.grab():
                        should_stop = True
                        break
                    frame_index += 1
                if should_stop:
                    break

            ok, frame = capture.read()
            if not ok:
                break

            frame_index += 1

            inference_frame = _resize_frame_for_inference(frame, inference_size)
            results = _predict_vehicles(
                model=model,
                frame=inference_frame,
                conf_threshold=conf_threshold,
                use_tracking=use_tracking,
                inference_size=inference_size,
            )
            result = results[0]
            vehicle_count, weighted_count = _count_detections(result)

            total_count += vehicle_count
            total_weighted_count += weighted_count
            peak_count = max(peak_count, vehicle_count)
            peak_weighted = max(peak_weighted, weighted_count)
            sampled_frames += 1

            if frame_index % emergency_frame_stride == 0:
                emergency_result = emergency_model.predict(
                    inference_frame,
                    conf=conf_threshold,
                    verbose=False,
                    imgsz=inference_size,
                )[0]
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

            if sampled_frames and sampled_frames % PROGRESS_LOG_INTERVAL_FRAMES == 0:
                logger.info(
                    "View progress view=%s sampled_frames=%d frame_index=%d avg_vehicles=%.2f violations=%d emergencies=%d elapsed=%.2fs",
                    view_label,
                    sampled_frames,
                    frame_index,
                    total_count / sampled_frames,
                    len(violations),
                    sum(emergency_counts.values()),
                    time.perf_counter() - started_at,
                )

            boxes = result.boxes
            if boxes is not None and boxes.cls is not None:
                classes = boxes.cls.int().tolist()
                ids = boxes.id.int().tolist() if boxes.id is not None else [None] * len(classes)
                coords = boxes.xyxy.tolist() if boxes.xyxy is not None else []
                confidences = boxes.conf.tolist() if boxes.conf is not None else [0.0] * len(classes)
                frame_counts: Counter[str] = Counter()
                for class_id, track_id, xyxy, confidence in zip(classes, ids, coords, confidences, strict=False):
                    class_name = VEHICLE_CLASS_NAMES.get(class_id)
                    if not class_name:
                        continue
                    if not use_tracking or track_id is None:
                        frame_counts[class_name] += 1
                        continue
                    token = (class_name, int(track_id))
                    if token not in tracked_ids:
                        tracked_ids.add(token)
                        class_breakdown[class_name] += 1
                if frame_counts:
                    for class_name, count in frame_counts.items():
                        class_breakdown[class_name] = max(class_breakdown[class_name], count)

            if save_annotated:
                annotated_frame = result.plot()
                if writer is None:
                    writer = _build_writer(
                        raw_annotated_path,
                        _sampled_fps(fps=fps, frame_stride=frame_stride),
                        annotated_frame.shape[1],
                        annotated_frame.shape[0],
                    )
                if writer is not None:
                    writer.write(annotated_frame)
    finally:
        capture.release()
        if writer is not None:
            finalize_started = time.perf_counter()
            writer.release()
            _finalize_annotated_video(raw_annotated_path, final_annotated_path)
            logger.info(
                "Finalized annotated video view=%s target=%s elapsed=%.2fs",
                view_label,
                final_annotated_path,
                time.perf_counter() - finalize_started,
            )

    average_vehicle_count = (total_count / sampled_frames) if sampled_frames else 0.0
    weighted_average_load = (total_weighted_count / sampled_frames) if sampled_frames else 0.0
    estimated_unique = sum(class_breakdown.values()) if use_tracking and class_breakdown else peak_count
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
        signal_state_counts={},
        dominant_signal_state=None,
        violations=violations,
        annotated_video=annotated_video,
    )


def _resize_frame_for_inference(frame, inference_size: int):
    if inference_size <= 0:
        return frame

    height, width = frame.shape[:2]
    longest_edge = max(height, width)
    if longest_edge <= inference_size:
        return frame

    scale = inference_size / float(longest_edge)
    target_width = max(1, ceil(width * scale))
    target_height = max(1, ceil(height * scale))
    return cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)


def _build_incidents_feed(analyses: list[ViewAnalysis]) -> list[dict]:
    incidents = [violation for analysis in analyses for violation in analysis.violations]
    incidents.sort(key=lambda incident: incident["timestamp_seconds"], reverse=True)
    return incidents


def _predict_vehicles(
    model: YOLO,
    frame,
    conf_threshold: float,
    use_tracking: bool,
    inference_size: int,
):
    if use_tracking:
        try:
            return model.track(
                frame,
                persist=True,
                conf=conf_threshold,
                classes=VEHICLE_CLASS_IDS,
                verbose=False,
                tracker="bytetrack.yaml",
                imgsz=inference_size,
            )
        except ModuleNotFoundError:
            pass

    return model.predict(
        frame,
        conf=conf_threshold,
        classes=VEHICLE_CLASS_IDS,
        verbose=False,
        imgsz=inference_size,
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


def _sampled_fps(fps: float, frame_stride: int) -> float:
    if fps <= 0:
        return 15.0
    return max(fps / max(frame_stride, 1), 1.0)


def _load_emergency_model(model_path: Path):
    try:
        if YOLOWorld is not None:
            model = YOLOWorld(str(model_path))
            model.set_classes(EMERGENCY_CLASS_NAMES)
            return model

        model = YOLO(str(model_path))
        if hasattr(model, "set_classes"):
            model.set_classes(EMERGENCY_CLASS_NAMES)
        return model
    except ModuleNotFoundError as error:
        logger.warning("Emergency model disabled because an optional dependency is missing: %s", error)
        return _NullEmergencyModel()


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


def _build_timing_comparison(
    analyses: list[ViewAnalysis],
    adaptive_allocations: dict[str, int],
    cycle_time: int,
    min_green: int,
    max_green: int,
) -> TimingComparison:
    view_scores = [ViewScore(label=analysis.view, congestion_score=analysis.priority_score) for analysis in analyses]
    static_allocations = allocate_green_times(
        view_scores=[ViewScore(label=score.label, congestion_score=1.0) for score in view_scores],
        cycle_time=cycle_time,
        min_green=min_green,
        max_green=max_green,
    )
    static_wait = _estimate_average_wait_seconds(analyses, static_allocations, cycle_time)
    adaptive_wait = _estimate_average_wait_seconds(analyses, adaptive_allocations, cycle_time)
    total_delay_reduction = _estimate_total_delay_reduction_per_cycle_seconds(
        analyses,
        static_allocations,
        adaptive_allocations,
        cycle_time,
    )
    return TimingComparison(
        static_green_times_seconds=static_allocations,
        estimated_average_wait_static_seconds=static_wait,
        estimated_average_wait_adaptive_seconds=adaptive_wait,
        estimated_average_wait_saved_seconds=round(max(static_wait - adaptive_wait, 0.0), 2),
        estimated_total_delay_reduction_per_cycle_seconds=total_delay_reduction,
    )


def _estimate_average_wait_seconds(
    analyses: list[ViewAnalysis],
    allocations: dict[str, int],
    cycle_time: int,
) -> float:
    total_load = sum(max(analysis.weighted_average_load, 0.0) for analysis in analyses)
    if total_load <= 0:
        return 0.0

    total_wait = 0.0
    for analysis in analyses:
        red_time = max(cycle_time - allocations.get(analysis.view, 0), 0)
        total_wait += max(analysis.weighted_average_load, 0.0) * red_time
    return round(total_wait / total_load, 2)


def _estimate_total_delay_reduction_per_cycle_seconds(
    analyses: list[ViewAnalysis],
    static_allocations: dict[str, int],
    adaptive_allocations: dict[str, int],
    cycle_time: int,
) -> float:
    reduction = 0.0
    for analysis in analyses:
        load = max(analysis.weighted_average_load, 0.0)
        static_red = max(cycle_time - static_allocations.get(analysis.view, 0), 0)
        adaptive_red = max(cycle_time - adaptive_allocations.get(analysis.view, 0), 0)
        reduction += load * max(static_red - adaptive_red, 0)
    return round(reduction, 2)


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
        "-preset",
        "veryfast",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        str(final_path),
    ]

    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        raw_path.unlink(missing_ok=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        raw_path.replace(final_path)
