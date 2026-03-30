# Verge

Verge is a two-part smart traffic monitoring project:

- A **Next.js frontend** with a polished landing page and an operator dashboard for traffic, incidents, parking, reports, analytics, and settings.
- A **Python backend** that analyzes up to four CCTV videos with YOLO models, detects traffic load and emergency vehicles, and returns signal timing recommendations plus annotated outputs.

## Quick README

### What It Is

Verge is a demo-ready urban traffic operations system. The frontend presents a city-scale traffic control UI, while the backend performs actual video analysis for uploaded junction footage.

### What It Does

- Accepts **1 to 4 uploaded traffic videos** through the backend API.
- Runs **vehicle detection** and **emergency-vehicle detection** using YOLO models.
- Computes **weighted congestion scores** and **recommended green-light timings**.
- Produces a **signal sequence**, **analysis summary JSON**, and optional **annotated videos**.
- Displays a **marketing landing page** and a **multi-tab dashboard** in the frontend.
- Stores analyzed incidents in browser storage so the **Incidents** tab can reflect backend results.

### Fast Start

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs at `http://localhost:3000`.

#### Backend

```bash
cd backend
uv sync
uv run verge-traffic serve --host 0.0.0.0 --port 8000
```

Backend runs at `http://127.0.0.1:8000`.

### Default Integration

The frontend expects:

```env
NEXT_PUBLIC_TRAFFIC_API_URL=http://127.0.0.1:8000
```

---

## Full README

## Table of Contents

- [Overview](#overview)
- [Repository Layout](#repository-layout)
- [Architecture](#architecture)
- [Frontend](#frontend)
- [Backend](#backend)
- [Data Flow](#data-flow)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [CLI Reference](#cli-reference)
- [Outputs](#outputs)
- [Tests](#tests)
- [Dependencies](#dependencies)
- [Current Limitations](#current-limitations)

## Overview

Verge combines a presentation-heavy operator interface with a functional traffic-analysis backend.

At the product level, the project is framed as an AI traffic optimization platform for:

- live intersection monitoring
- congestion forecasting
- emergency signal preemption
- incident tracking
- parking visibility
- historical analytics
- reporting and operator settings

At the code level, the project currently consists of:

- a **frontend prototype with one real backend integration path**
- a **backend that performs actual uploaded-video analysis**

That distinction matters:

- The **Junction Upload Console** in the dashboard is wired to the backend.
- Much of the rest of the dashboard uses **demo data, client-side state, and UI simulations** to represent intended product capabilities.

## Repository Layout

```text
verge/
├── README.md
├── backend/
│   ├── app/traffic_monitor/
│   │   ├── api.py
│   │   ├── cli.py
│   │   ├── config.py
│   │   ├── detector.py
│   │   ├── model_store.py
│   │   └── signal_optimizer.py
│   ├── assets/models/
│   ├── tests/
│   ├── pyproject.toml
│   └── uv.lock
└── frontend/
    ├── app/
    ├── components/
    ├── lib/
    ├── public/
    ├── package.json
    ├── next.config.ts
    └── .env.example
```

## Architecture

### High-Level Split

#### Frontend

- Built with **Next.js 16**, **React 19**, and **TypeScript**
- Uses **Framer Motion** for animation-heavy interactions
- Uses **Lucide React** for iconography
- Uses **Tailwind CSS v4** plus custom global CSS
- Contains:
  - landing page
  - dashboard shell
  - feature tabs
  - traffic upload console

#### Backend

- Built with **Python 3.11+**
- Uses **FastAPI** for HTTP endpoints
- Uses **Uvicorn** to serve the API
- Uses **Ultralytics YOLO** / **YOLOWorld** models for analysis
- Uses **OpenCV** for video reading and annotated video writing
- Exposes:
  - `GET /health`
  - `POST /analyze`
  - static output hosting under `/outputs/...`

### End-to-End Flow

1. The frontend upload console collects four synchronized junction views.
2. It posts them to the backend as multipart form data.
3. The backend stores the uploads temporarily.
4. The detector analyzes each view, optionally in parallel.
5. Verge computes:
   - per-view counts
   - class breakdowns
   - congestion scores
   - emergency detections
   - recommended green times
   - signal sequence
6. The backend writes a `traffic_summary.json` file and annotated videos.
7. The frontend renders the returned result and writes incident data into browser local storage.
8. The Incidents tab reads that local storage and updates its table.

## Frontend

The frontend lives in `frontend/`.

### Routes

#### `/`

The landing page is a cinematic marketing surface with:

- animated hero copy
- parallax-like scroll effects
- a remote autoplaying background video
- feature cards
- product positioning for smart-city traffic control
- a CTA into the dashboard

#### `/dashboard`

The dashboard is an operator-focused interface with:

- sticky top navigation
- live clock
- keyboard shortcuts
- notification and profile dropdowns
- six main tabs

Keyboard behavior currently includes:

- `0` to return to the home page
- `1` through `6` to switch dashboard tabs in order

### Dashboard Tabs

#### 1. Verge

This is the primary traffic operations tab. It includes:

- top KPI cards for:
  - vehicle detection
  - queue length estimation
  - congestion forecasting
- a stylized **TrafficMonitor** component with hard-coded bounding boxes over a traffic image
- a traffic flow map visualization
- alerts and violation summaries from shared demo data
- the **Junction Upload Console**, which is the main real integration point to the backend

#### Junction Upload Console

This component is the most functional part of the frontend/backend connection.

It:

- requires **all four views**:
  - north
  - east
  - south
  - west
- previews selected videos in the browser
- submits them to `POST /analyze`
- shows processing progress states
- stores returned incidents in local storage under `verge-active-incidents`
- simulates the returned signal plan with:
  - active phase tracking
  - playback speed controls
  - rotating junction phases
- uses `NEXT_PUBLIC_TRAFFIC_API_URL` to find the backend

The upload console expects this response shape from the backend:

- run ID
- model paths
- cycle time
- summary URL
- incident list
- recommended green times
- priority mode
- priority view
- signal sequence
- per-view summaries

#### 2. Incidents

The Incidents tab:

- starts from shared demo violation data
- replaces that data with backend-produced incidents when local storage is updated
- supports:
  - search
  - simple filtering
  - pagination
  - CSV export
  - quick action toasts
- calculates a derived severity breakdown in the client

This tab is partially real:

- the rendering and export logic are real
- the incident records only become backend-driven after a successful upload analysis

#### 3. Parking

The Parking tab is a UI simulation for parking spot monitoring.

It shows:

- counts of available, occupied, and overstay spots
- a 48-cell spot grid
- hover states and overstay highlighting

Important detail:

- spot states are generated with `Math.random()` at render time, so this tab is currently **demo-only and non-persistent**

#### 4. Reports

The Reports tab is currently a presentation layer for reporting features. It includes:

- report cards for weekly, monthly, and real-time reporting concepts
- recent artifacts list
- buttons for generating or downloading reports

At present, these controls are **UI only** and are not backed by a report-generation service.

#### 5. Stats

The Stats tab is a client-rendered analytics view with selectable timeframes:

- Day
- Week
- Month

It includes:

- traffic volume charts
- KPI cards
- environmental impact cards
- violation distribution bars
- queue length trend visualization

These analytics are currently **mocked in component state** rather than sourced from the backend.

#### 6. Settings

The Settings tab exposes configurable-looking controls for:

- vision settings
- alert rules
- AI models
- notifications
- data retention
- access control

Current behavior:

- the controls are interactive in the browser
- save/restart actions show toasts
- there is no persisted backend configuration layer behind them yet

### Shared Frontend Data

`frontend/lib/data.ts` provides shared demo content such as:

- alert cards
- seed violation records
- the `ViolationRecord` type used by frontend incident displays and backend results

### Styling and UX Characteristics

The frontend design emphasizes:

- dark UI
- glassmorphism panels
- blurred overlays
- animated KPI cards
- motion-heavy interactions
- serif/sans typography pairing using:
  - `Inter`
  - `Instrument Serif`

## Backend

The backend lives in `backend/`.

### Core Capabilities

The backend performs actual video analysis for uploaded or CLI-provided traffic footage.

It supports:

- analyzing **1 to 4 videos**
- detecting vehicle classes:
  - bicycle
  - car
  - motorcycle
  - bus
  - truck
- detecting emergency classes:
  - ambulance
  - fire truck
  - police car
  - police motorcycle
  - emergency vehicle
- computing weighted congestion/load metrics
- prioritizing views with emergency detections
- allocating green-light durations within min/max bounds
- exporting JSON summaries
- exporting annotated videos when enabled

### Backend Modules

#### `api.py`

Defines the FastAPI app and HTTP behavior:

- configures CORS for local frontend origins
- mounts backend output files under `/outputs`
- exposes `/health`
- exposes `/analyze`
- writes uploads into a per-run upload directory
- cleans up temporary uploads after analysis
- serializes result payloads with output URLs

Default API-side analysis settings:

- max uploads: `4`
- frame stride: `6`
- emergency frame stride: `24`
- inference image size: `416`

#### `cli.py`

Provides the `verge-traffic` command with three subcommands:

- `download-model`
- `serve`
- `analyze`

This allows local use without the web UI.

#### `config.py`

Defines backend paths and modeling constants, including:

- asset directories
- upload and output directories
- default and emergency model names
- supported vehicle class IDs and names
- per-class weighting values used in congestion scoring
- emergency class labels
- emergency priority score boost

#### `model_store.py`

Handles model availability:

- ensures model directories exist
- downloads model weights through Ultralytics if missing
- copies resolved checkpoints into local asset storage

#### `signal_optimizer.py`

Implements signal timing logic:

- proportional green-time allocation by congestion score
- even split fallback when scores are zero
- single-view full-cycle allocation
- emergency priority override that reserves maximum feasible green time for the priority view

#### `detector.py`

This is the analysis engine. It:

- loads the primary traffic model
- loads the emergency model, falling back safely if optional dependencies are missing
- analyzes views sequentially or in parallel
- reads frames with OpenCV
- optionally resizes frames for inference
- uses YOLO tracking when available
- counts supported vehicle classes
- computes weighted load using class-specific weights
- samples emergency detection on a separate frame stride
- writes annotated videos when requested
- emits a structured summary for each view

### Backend Result Structure

Each analysis produces:

- `model_path`
- `emergency_model_path`
- `cycle_time_seconds`
- `views`
- `incidents`
- `recommended_green_times_seconds`
- `priority_mode`
- `priority_view`
- `signal_sequence`
- `summary_path` in CLI/local file results

Each view summary includes:

- view label
- original video path
- sampled frame count
- sampled FPS
- average vehicle count
- peak vehicle count
- estimated unique vehicles
- class breakdown
- weighted average load
- weighted peak load
- congestion score
- emergency detected flag
- emergency counts
- strongest emergency event
- priority score
- signal state counts
- dominant signal state
- violations
- annotated video path when enabled

Note on incidents:

- the backend has a real incident aggregation path
- current test coverage proves sorting and aggregation behavior
- but the present detector implementation does not yet appear to populate rich violation events during frame analysis, so incident output may be empty depending on the run

## Data Flow

### Frontend to Backend

The upload console posts a multipart form with repeated `videos` fields.

Optional form fields supported by the API:

- `cycle_time`
- `min_green`
- `max_green`
- `frame_stride`
- `conf_threshold`

The current frontend only sends the video files and relies on backend defaults.

### Backend Processing

For each view, Verge currently:

1. opens the video
2. samples frames according to `frame_stride`
3. runs vehicle inference
4. periodically runs emergency inference
5. accumulates weighted congestion metrics
6. computes green-time recommendations
7. writes outputs

### Backend to Frontend

The API response includes:

- direct URLs to summary and annotated video assets
- recommended green allocations
- signal order
- view-level stats
- incidents

The frontend then:

- renders those results in the upload console
- stores incidents in local storage
- triggers a custom `verge-incidents-updated` browser event

## Local Development

## Prerequisites

- Node.js for the frontend
- npm for frontend package management
- Python 3.11+
- `uv` for backend environment management

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Backend Setup

```bash
cd backend
uv sync
uv run verge-traffic download-model
uv run verge-traffic serve --host 0.0.0.0 --port 8000
```

Open `http://127.0.0.1:8000/health` to verify the API is up.

## Full Local Run

Run backend:

```bash
cd backend
uv run verge-traffic serve --host 0.0.0.0 --port 8000
```

Run frontend in another shell:

```bash
cd frontend
npm run dev
```

Then:

1. open `http://localhost:3000/dashboard`
2. go to the **Verge** tab
3. upload all four traffic videos in the **Junction Upload Console**
4. submit for analysis
5. inspect the simulated signal plan and incident feed

## API Reference

## `GET /health`

Response:

```json
{
  "status": "ok"
}
```

## `POST /analyze`

Analyzes 1 to 4 uploaded videos.

### Request

Content type:

```text
multipart/form-data
```

Fields:

- `videos`: one to four files
- `cycle_time`: integer, default `120`
- `min_green`: integer, default `15`
- `max_green`: integer, default `75`
- `frame_stride`: integer, default `6`
- `conf_threshold`: float, default `0.25`

### Response

Representative structure:

```json
{
  "run_id": "20260331-120000-ab12cd34",
  "model_path": "/abs/path/to/yolov8n.pt",
  "emergency_model_path": "/abs/path/to/yolov8s-world.pt",
  "cycle_time_seconds": 120,
  "summary_url": "http://127.0.0.1:8000/outputs/<run_id>/traffic_summary.json",
  "incidents": [],
  "recommended_green_times_seconds": {
    "view_1": 30,
    "view_2": 30,
    "view_3": 30,
    "view_4": 30
  },
  "priority_mode": "balanced",
  "priority_view": null,
  "signal_sequence": ["view_1", "view_2", "view_3", "view_4"],
  "views": []
}
```

### Errors

- `400` if no videos are uploaded
- `400` if more than four videos are uploaded
- `500` if analysis fails unexpectedly

## CLI Reference

All CLI commands are run from `backend/`.

## Download Model

```bash
uv run verge-traffic download-model
```

Optional:

```bash
uv run verge-traffic download-model --model-name yolov8n.pt
```

## Run API Server

```bash
uv run verge-traffic serve --host 127.0.0.1 --port 8000
```

## Analyze Videos from the CLI

Single video:

```bash
uv run verge-traffic analyze --video /absolute/path/to/view1.mp4
```

Multiple views:

```bash
uv run verge-traffic analyze \
  --video /absolute/path/to/north.mp4 \
  --video /absolute/path/to/east.mp4 \
  --video /absolute/path/to/south.mp4 \
  --video /absolute/path/to/west.mp4 \
  --output-dir /absolute/path/to/results \
  --save-annotated
```

Available CLI analysis flags:

- `--video`
- `--output-dir`
- `--conf-threshold`
- `--frame-stride`
- `--cycle-time`
- `--min-green`
- `--max-green`
- `--save-annotated`

## Outputs

Backend runs write outputs under `backend/outputs/<run_id>/` for API usage or under the chosen CLI output directory.

Typical artifacts:

- `traffic_summary.json`
- `view_1_annotated.mp4`
- `view_2_annotated.mp4`
- `view_3_annotated.mp4`
- `view_4_annotated.mp4`

The API serves them back through:

- `/outputs/<run_id>/traffic_summary.json`
- `/outputs/<run_id>/<annotated-video>.mp4`

## Tests

Backend test coverage currently includes:

- API health endpoint
- emergency model fallback behavior
- incident feed sorting
- emergency match extraction
- green-time allocation constraints
- priority override behavior
- class-weight effects on load scoring

Run tests with:

```bash
cd backend
uv run pytest
```

There is no dedicated frontend automated test suite in this repository at the moment.

## Dependencies

### Frontend

Primary frontend dependencies:

- `next`
- `react`
- `react-dom`
- `framer-motion`
- `lucide-react`
- `@fontsource/inter`
- `@fontsource/instrument-serif`
- `recharts`

Tooling:

- `typescript`
- `tailwindcss`
- `@biomejs/biome`

### Backend

Primary backend dependencies:

- `fastapi`
- `uvicorn`
- `ultralytics`
- `opencv-python-headless`
- `numpy`
- `python-multipart`
- `lap`
- `clip`

Dev dependencies:

- `pytest`
- `httpx`

## Current Limitations

- The frontend dashboard is partly a **high-fidelity prototype** and partly a real integration surface.
- The upload workflow is the strongest functional bridge between frontend and backend.
- Many dashboard panels still use **static or simulated data**.
- Parking, reports, stats, and most settings are not backed by persistent services.
- The upload console requires **all four views** in the current frontend implementation, even though the backend supports 1 to 4 videos.
- Backend incident aggregation exists, but rich violation generation is not fully populated in the current detector code path.
- CORS is configured for local frontend origins only.
- Model inference can be computationally heavy depending on hardware and video size.

## Summary

Verge already contains:

- a visually complete smart-city traffic dashboard
- a usable video-analysis backend
- a working upload-to-analysis-to-results loop
- test coverage for core backend logic

What it does not yet contain is a fully productionized end-to-end operations platform. Several operator experiences are currently represented as polished UI concepts rather than connected services.
