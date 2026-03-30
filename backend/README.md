# Verge Backend CLI

CLI backend for analyzing one or more CCTV traffic videos with a pre-trained YOLO model and generating signal timing recommendations.

## Setup

```bash
cd /Users/abhinav/Projects/verge/backend
uv sync
```

## Download The Pre-Trained Model

```bash
uv run verge-traffic download-model
```

This downloads the official COCO-pretrained `yolov8n.pt` detector into `assets/models/`.

## Run The API

```bash
uv run verge-traffic serve --host 0.0.0.0 --port 8000
```

Available endpoints:

- `GET /health`
- `POST /analyze` with 1 to 4 multipart `videos` files

The API keeps annotated outputs and the JSON summary under `outputs/<run_id>/` and serves them back under `/outputs/<run_id>/...`.

## Analyze Traffic Videos

Single view:

```bash
uv run verge-traffic analyze --video /absolute/path/to/view1.mp4
```

Four views of the same junction:

```bash
uv run verge-traffic analyze \
  --video /absolute/path/to/north.mp4 \
  --video /absolute/path/to/east.mp4 \
  --video /absolute/path/to/south.mp4 \
  --video /absolute/path/to/west.mp4 \
  --output-dir /absolute/path/to/results
```

Optional annotated exports:

```bash
uv run verge-traffic analyze \
  --video /absolute/path/to/view1.mp4 \
  --save-annotated \
  --output-dir /absolute/path/to/results
```

The CLI writes a JSON summary with:

- per-view vehicle counts
- class-wise totals
- congestion scores
- recommended green-light durations for the provided views
