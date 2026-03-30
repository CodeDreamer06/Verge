from __future__ import annotations

import argparse
import json
from pathlib import Path

from .detector import analyze_videos
from .model_store import ensure_model


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verge traffic detection backend CLI.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    download_parser = subparsers.add_parser("download-model", help="Download the default pretrained traffic detector.")
    download_parser.add_argument(
        "--model-name",
        default="yolov8n.pt",
        help="Ultralytics model filename to download.",
    )

    analyze_parser = subparsers.add_parser("analyze", help="Analyze one or more CCTV videos.")
    analyze_parser.add_argument("--video", action="append", required=True, help="Absolute or relative path to a video.")
    analyze_parser.add_argument("--output-dir", default="outputs/latest", help="Directory for JSON summary and exports.")
    analyze_parser.add_argument("--conf-threshold", type=float, default=0.25, help="Detection confidence threshold.")
    analyze_parser.add_argument("--frame-stride", type=int, default=3, help="Process every Nth frame.")
    analyze_parser.add_argument("--cycle-time", type=int, default=120, help="Total traffic light cycle time in seconds.")
    analyze_parser.add_argument("--min-green", type=int, default=15, help="Minimum green time per view.")
    analyze_parser.add_argument("--max-green", type=int, default=75, help="Maximum green time per view.")
    analyze_parser.add_argument("--save-annotated", action="store_true", help="Write annotated output videos.")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "download-model":
        model_path = ensure_model(model_name=args.model_name)
        print(model_path)
        return

    result = analyze_videos(
        video_paths=[Path(path).resolve() for path in args.video],
        output_dir=Path(args.output_dir).resolve(),
        conf_threshold=args.conf_threshold,
        frame_stride=args.frame_stride,
        cycle_time=args.cycle_time,
        min_green=args.min_green,
        max_green=args.max_green,
        save_annotated=args.save_annotated,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
