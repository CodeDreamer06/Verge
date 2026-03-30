from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
from collections import Counter
from dataclasses import asdict, dataclass
from math import ceil
from pathlib import Path
from uuid import uuid4

import cv2
from ultralytics import YOLO

from .config import (
    DEFAULT_SPEED_LIMIT_KPH,
    EMERGENCY_CLASS_NAMES,
    EMERGENCY_MODEL_NAME,
    EMERGENCY_PRIORITY_SCORE,
    KNOWN_SIGNAL_STATES,
    MIN_PLATE_TEXT_LENGTH,
    PLATE_CLASS_NAMES,
    STOP_LINE_RATIO,
    TRAFFIC_LIGHT_CLASS_NAMES,
    VEHICLE_CLASS_IDS,
    VEHICLE_CLASS_NAMES,
    VEHICLE_REAL_WIDTH_METERS,
    VEHICLE_WEIGHTS,
)
from .model_store import ensure_model
from .signal_optimizer import ViewScore, allocate_green_times, apply_priority_override

try:
    from ultralytics import YOLOWorld
except ImportError:  # pragma: no cover - depends on installed ultralytics version
    YOLOWorld = None

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class EmergencyEvent:
    label: str
    confidence: float
    frame_index: int
    timestamp_seconds: float


@dataclass(slots=True)
class ViolationEvent:
    id: str
    type: str
    vehicle: str
    location: str
    time: str
    status: str
    view: str
    frame_index: int
    timestamp_seconds: float
    confidence: float
    vehicle_type: str
    speed_kph: float | None = None
    signal_state: str | None = None
    plate_confidence: float | None = None


@dataclass(slots=True)
class TrackSnapshot:
    frame_index: int
    center_x: float
    center_y: float
    bbox_width: float
    class_name: str
    speed_kph: float | None
    crossed_stop_line: bool


class _NullEmergencyModel:
    def predict(self, *args, **kwargs):
        return [_NullEmergencyResult()]


class _NullEmergencyResult:
    boxes = None
    names: dict[int, str] = {}


class _NullOcrReader:
    def readtext(self, *args, **kwargs):
        return []


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
    violations: list[ViolationEvent]
    annotated_video: str | None = None


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
    if not video_paths:
        raise ValueError("At least one video path is required.")
    if min_green > max_green:
        raise ValueError("min_green cannot be greater than max_green.")
    if frame_stride < 1:
        raise ValueError("frame_stride must be at least 1.")
    if emergency_frame_stride is not None and emergency_frame_stride < 1:
        raise ValueError("emergency_frame_stride must be at least 1.")

    output_dir.mkdir(parents=True, exist_ok=True)
    resolved_model = ensure_model(destination=model_path) if model_path else ensure_model()
    emergency_model_path = ensure_model(model_name=EMERGENCY_MODEL_NAME)
    scene_model = _load_scene_model(emergency_model_path)
    ocr_reader = _load_ocr_reader()
    model = YOLO(str(resolved_model))
    emergency_model = _load_emergency_model(emergency_model_path)

    analyses: list[ViewAnalysis] = []
    view_scores: list[ViewScore] = []

    for index, video_path in enumerate(video_paths, start=1):
        analysis = _analyze_single_video(
            model=model,
            emergency_model=emergency_model,
            scene_model=scene_model,
            ocr_reader=ocr_reader,
            video_path=video_path,
            output_dir=output_dir,
            view_label=f"view_{index}",
            conf_threshold=conf_threshold,
            frame_stride=frame_stride,
            emergency_frame_stride=emergency_frame_stride or frame_stride,
            save_annotated=save_annotated,
            inference_size=inference_size,
            use_tracking=use_tracking,
        )
        analyses.append(analysis)
        view_scores.append(ViewScore(label=analysis.view, congestion_score=analysis.priority_score))

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
    scene_model,
    ocr_reader,
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
    signal_state_counts: Counter[str] = Counter()
    strongest_emergency: EmergencyEvent | None = None
    violations: list[ViolationEvent] = []
    emitted_violation_keys: set[tuple[str, int]] = set()
    track_history: dict[int, TrackSnapshot] = {}
    frame_index = 0
    sampled_emergency_frames = 0
    dominant_signal_state: str | None = None

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

            scene_result = scene_model.predict(
                inference_frame,
                conf=max(conf_threshold, 0.2),
                verbose=False,
                imgsz=inference_size,
            )[0]
            signal_state = _estimate_signal_state(scene_result, inference_frame)
            if signal_state in KNOWN_SIGNAL_STATES:
                signal_state_counts[signal_state] += 1
                dominant_signal_state = signal_state

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
                sampled_emergency_frames += 1
                if frame_strongest and (
                    strongest_emergency is None or frame_strongest.confidence > strongest_emergency.confidence
                ):
                    strongest_emergency = frame_strongest

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
                    speed_kph, crossed_stop_line = _track_vehicle_motion(
                        track_history=track_history,
                        track_id=int(track_id),
                        xyxy=xyxy,
                        frame_index=frame_index,
                        fps=fps,
                        frame_height=inference_frame.shape[0],
                        class_name=class_name,
                    )
                    if signal_state == "red" and crossed_stop_line:
                        event_key = ("Red Light Jump", int(track_id))
                        if event_key not in emitted_violation_keys:
                            emitted_violation_keys.add(event_key)
                            vehicle_crop = _extract_crop(inference_frame, xyxy)
                            plate_text, plate_confidence = _read_plate_text(
                                frame=vehicle_crop,
                                scene_model=scene_model,
                                ocr_reader=ocr_reader,
                                conf_threshold=conf_threshold,
                                inference_size=inference_size,
                            )
                            violations.append(
                                _make_violation_event(
                                    event_type="Red Light Jump",
                                    view_label=view_label,
                                    frame_index=frame_index,
                                    fps=fps,
                                    confidence=confidence,
                                    vehicle_type=class_name,
                                    plate_text=plate_text,
                                    plate_confidence=plate_confidence,
                                    signal_state=signal_state,
                                )
                            )
                    if speed_kph and speed_kph >= DEFAULT_SPEED_LIMIT_KPH:
                        event_key = ("Over-speeding", int(track_id))
                        if event_key not in emitted_violation_keys:
                            emitted_violation_keys.add(event_key)
                            vehicle_crop = _extract_crop(inference_frame, xyxy)
                            plate_text, plate_confidence = _read_plate_text(
                                frame=vehicle_crop,
                                scene_model=scene_model,
                                ocr_reader=ocr_reader,
                                conf_threshold=conf_threshold,
                                inference_size=inference_size,
                            )
                            violations.append(
                                _make_violation_event(
                                    event_type="Over-speeding",
                                    view_label=view_label,
                                    frame_index=frame_index,
                                    fps=fps,
                                    confidence=confidence,
                                    vehicle_type=class_name,
                                    plate_text=plate_text,
                                    plate_confidence=plate_confidence,
                                    speed_kph=speed_kph,
                                    signal_state=signal_state,
                                )
                            )
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
            writer.release()
            _finalize_annotated_video(raw_annotated_path, final_annotated_path)

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
        signal_state_counts=dict(signal_state_counts),
        dominant_signal_state=_dominant_signal_state(signal_state_counts) or dominant_signal_state,
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


def _load_scene_model(model_path: Path):
    try:
        if YOLOWorld is None:
            return _NullEmergencyModel()
        model = YOLOWorld(str(model_path))
        model.set_classes([*EMERGENCY_CLASS_NAMES, *TRAFFIC_LIGHT_CLASS_NAMES, *PLATE_CLASS_NAMES])
        return model
    except ModuleNotFoundError as error:
        logger.warning("Scene model disabled because an optional dependency is missing: %s", error)
        return _NullEmergencyModel()


def _load_ocr_reader():
    try:
        import easyocr

        return easyocr.Reader(["en"], gpu=False, verbose=False)
    except Exception as error:  # pragma: no cover - optional runtime dependency
        logger.warning("OCR reader unavailable: %s", error)
        return _NullOcrReader()


def _track_vehicle_motion(
    track_history: dict[int, TrackSnapshot],
    track_id: int,
    xyxy: list[float],
    frame_index: int,
    fps: float,
    frame_height: int,
    class_name: str,
) -> tuple[float | None, bool]:
    x1, y1, x2, y2 = [float(value) for value in xyxy]
    center_x = (x1 + x2) / 2.0
    center_y = (y1 + y2) / 2.0
    bbox_width = max(x2 - x1, 1.0)
    current_crossed = frame_height > 0 and (center_y / frame_height) >= STOP_LINE_RATIO

    speed_kph: float | None = None
    crossed_stop_line = False
    previous = track_history.get(track_id)
    if previous is not None and fps > 0:
        frame_delta = max(frame_index - previous.frame_index, 1)
        seconds = frame_delta / fps
        pixels_per_meter = bbox_width / max(VEHICLE_REAL_WIDTH_METERS.get(class_name, 1.8), 0.5)
        distance_pixels = ((center_x - previous.center_x) ** 2 + (center_y - previous.center_y) ** 2) ** 0.5
        if pixels_per_meter > 0 and seconds > 0:
            meters_per_second = (distance_pixels / pixels_per_meter) / seconds
            speed_kph = round(meters_per_second * 3.6, 2)
        crossed_stop_line = not previous.crossed_stop_line and current_crossed

    track_history[track_id] = TrackSnapshot(
        frame_index=frame_index,
        center_x=center_x,
        center_y=center_y,
        bbox_width=bbox_width,
        class_name=class_name,
        speed_kph=speed_kph,
        crossed_stop_line=current_crossed,
    )
    return speed_kph, crossed_stop_line


def _estimate_signal_state(scene_result, frame) -> str | None:
    boxes = scene_result.boxes
    if boxes is None or boxes.cls is None or boxes.xyxy is None:
        return None

    names = getattr(scene_result, "names", {})
    states: Counter[str] = Counter()
    for class_id, xyxy in zip(boxes.cls.int().tolist(), boxes.xyxy.tolist(), strict=False):
        label = names.get(class_id) if isinstance(names, dict) else None
        if str(label).lower() != "traffic light":
            continue
        crop = _extract_crop(frame, xyxy)
        state = _classify_traffic_light_crop(crop)
        if state:
            states[state] += 1
    return _dominant_signal_state(states)


def _classify_traffic_light_crop(crop) -> str | None:
    if crop.size == 0:
        return None
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    red_mask = cv2.inRange(hsv, (0, 80, 80), (12, 255, 255)) | cv2.inRange(hsv, (160, 80, 80), (180, 255, 255))
    yellow_mask = cv2.inRange(hsv, (18, 80, 80), (40, 255, 255))
    green_mask = cv2.inRange(hsv, (40, 50, 50), (95, 255, 255))
    counts = {
        "red": int(cv2.countNonZero(red_mask)),
        "yellow": int(cv2.countNonZero(yellow_mask)),
        "green": int(cv2.countNonZero(green_mask)),
    }
    label, pixels = max(counts.items(), key=lambda item: item[1])
    return label if pixels > 6 else None


def _dominant_signal_state(states: Counter[str]) -> str | None:
    if not states:
        return None
    return states.most_common(1)[0][0]


def _extract_crop(frame, xyxy: list[float]):
    x1, y1, x2, y2 = [int(max(value, 0)) for value in xyxy]
    x2 = min(x2, frame.shape[1])
    y2 = min(y2, frame.shape[0])
    return frame[y1:y2, x1:x2]


def _read_plate_text(frame, scene_model, ocr_reader, conf_threshold: float, inference_size: int) -> tuple[str, float | None]:
    if frame.size == 0:
        return "Unknown", None

    plate_crop, plate_confidence = _extract_plate_crop(
        frame=frame,
        scene_model=scene_model,
        conf_threshold=conf_threshold,
        inference_size=inference_size,
    )
    ocr_target = plate_crop if plate_crop is not None else frame
    text, confidence = _ocr_plate_text(ocr_reader, ocr_target)
    return text, plate_confidence if plate_confidence is not None else confidence


def _extract_plate_crop(frame, scene_model, conf_threshold: float, inference_size: int):
    result = scene_model.predict(frame, conf=max(conf_threshold, 0.2), verbose=False, imgsz=inference_size)[0]
    crop, confidence = _pick_plate_crop(result, frame)
    if crop is not None:
        return crop, confidence
    return None, None


def _pick_plate_crop(result, frame):
    boxes = result.boxes
    if boxes is None or boxes.cls is None or boxes.xyxy is None:
        return None, None
    names = getattr(result, "names", {})
    confidences = boxes.conf.tolist() if boxes.conf is not None else [0.0] * len(boxes.cls)
    candidates: list[tuple[float, object]] = []
    for class_id, confidence, xyxy in zip(boxes.cls.int().tolist(), confidences, boxes.xyxy.tolist(), strict=False):
        label = str(names.get(class_id, "")).lower()
        if "plate" not in label:
            continue
        candidates.append((float(confidence), xyxy))
    if not candidates:
        return None, None
    confidence, xyxy = max(candidates, key=lambda item: item[0])
    crop = _extract_crop(frame, xyxy)
    return (crop if crop.size else None), round(confidence, 3)


def _ocr_plate_text(ocr_reader, image) -> tuple[str, float | None]:
    if image.size == 0:
        return "Unknown", None
    try:
        results = ocr_reader.readtext(image, detail=1)
    except TypeError:
        results = ocr_reader.readtext(image)
    if not results:
        return "Unknown", None

    best_text = "Unknown"
    best_confidence: float | None = None
    for item in results:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        text = _sanitize_plate_text(str(item[1]))
        confidence = float(item[2]) if len(item) > 2 and isinstance(item[2], (int, float)) else None
        if text == "Unknown":
            continue
        if best_confidence is None or (confidence or 0.0) > best_confidence:
            best_text = text
            best_confidence = round(confidence, 3) if confidence is not None else None
    return best_text, best_confidence


def _sanitize_plate_text(value: str) -> str:
    normalized = re.sub(r"[^A-Z0-9]", "", value.upper())
    if len(normalized) < MIN_PLATE_TEXT_LENGTH:
        return "Unknown"
    if len(normalized) > 10:
        normalized = normalized[:10]
    if len(normalized) > 4:
        return f"{normalized[:-4]} {normalized[-4:]}"
    return normalized


def _make_violation_event(
    event_type: str,
    view_label: str,
    frame_index: int,
    fps: float,
    confidence: float,
    vehicle_type: str,
    plate_text: str,
    plate_confidence: float | None,
    speed_kph: float | None = None,
    signal_state: str | None = None,
) -> ViolationEvent:
    timestamp_seconds = round((frame_index / fps), 2) if fps > 0 else 0.0
    return ViolationEvent(
        id=f"V-{uuid4().hex[:6].upper()}",
        type=event_type,
        vehicle=plate_text,
        location=view_label.replace("_", " ").title(),
        time=_format_timestamp(timestamp_seconds),
        status="Alert Sent" if event_type == "Red Light Jump" else "Logged",
        view=view_label,
        frame_index=frame_index,
        timestamp_seconds=timestamp_seconds,
        confidence=round(float(confidence), 3),
        vehicle_type=vehicle_type,
        speed_kph=round(speed_kph, 2) if speed_kph is not None else None,
        signal_state=signal_state,
        plate_confidence=plate_confidence,
    )


def _build_incidents_feed(analyses: list[ViewAnalysis]) -> list[dict]:
    incidents = [asdict(violation) for analysis in analyses for violation in analysis.violations]
    incidents.sort(key=lambda incident: incident["timestamp_seconds"], reverse=True)
    return incidents


def _format_timestamp(timestamp_seconds: float) -> str:
    minutes = int(timestamp_seconds // 60)
    seconds = int(timestamp_seconds % 60)
    return f"{minutes:02d}:{seconds:02d}"


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
