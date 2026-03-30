"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, LoaderCircle, Play, RefreshCw, Siren, Upload, Video } from "lucide-react";

type EmergencyEvent = {
  label: string;
  confidence: number;
  frame_index: number;
  timestamp_seconds: number;
};

type ViewSummary = {
  view: string;
  video_path: string;
  frames_processed: number;
  sampled_fps: number;
  average_vehicle_count: number;
  peak_vehicle_count: number;
  estimated_unique_vehicles: number;
  class_breakdown: Record<string, number>;
  weighted_average_load: number;
  weighted_peak_load: number;
  congestion_score: number;
  emergency_detected: boolean;
  emergency_counts: Record<string, number>;
  strongest_emergency: EmergencyEvent | null;
  priority_score: number;
  annotated_video: string | null;
  annotated_video_url?: string;
};

type AnalysisResponse = {
  run_id: string;
  model_path: string;
  emergency_model_path: string;
  cycle_time_seconds: number;
  summary_url: string;
  recommended_green_times_seconds: Record<string, number>;
  priority_mode: "balanced" | "emergency_override";
  priority_view: string | null;
  signal_sequence: string[];
  views: ViewSummary[];
};

const VIDEO_SLOTS = [
  { key: "north", label: "North View" },
  { key: "east", label: "East View" },
  { key: "south", label: "South View" },
  { key: "west", label: "West View" },
] as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_TRAFFIC_API_URL ?? "http://127.0.0.1:8000";
const PLAYBACK_SPEEDS = [1, 2, 3, 5] as const;
const PROCESSING_STEPS = [
  {
    title: "Uploading CCTV feeds",
    detail: "Pushing the selected files to the traffic-analysis service.",
  },
  {
    title: "Detecting lane traffic",
    detail: "Running the base YOLO pass for cars, buses, trucks, and lane load.",
  },
  {
    title: "Scanning emergency vehicles",
    detail: "Checking for ambulance, fire truck, police car, and related priority classes.",
  },
  {
    title: "Computing signal plan",
    detail: "Combining congestion and emergency priority into the final green-light sequence.",
  },
] as const;

export default function TrafficUploadPanel() {
  const [files, setFiles] = useState<Record<string, File | null>>({
    north: null,
    east: null,
    south: null,
    west: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<(typeof PLAYBACK_SPEEDS)[number]>(1);
  const [simulationSeconds, setSimulationSeconds] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string | null>>({
    north: null,
    east: null,
    south: null,
    west: null,
  });
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const selectedFiles = useMemo(
    () => VIDEO_SLOTS.map((slot) => files[slot.key]).filter((file): file is File => Boolean(file)),
    [files],
  );

  const canSubmit = selectedFiles.length === VIDEO_SLOTS.length && !isSubmitting;
  const uploadPreviews = useMemo(
    () =>
      VIDEO_SLOTS.map((slot) => ({
        ...slot,
        file: files[slot.key],
        previewUrl: previewUrls[slot.key],
      })),
    [files, previewUrls],
  );
  const cyclePhases = useMemo(() => {
    if (!result) {
      return [];
    }
    const orderedViews =
      result.signal_sequence.length > 0
        ? result.signal_sequence
            .map((viewKey) => result.views.find((view) => view.view === viewKey))
            .filter((view): view is ViewSummary => Boolean(view))
        : result.views;
    return orderedViews.map((view) => ({
      view: view.view,
      seconds: result.recommended_green_times_seconds[view.view] ?? 0,
    }));
  }, [result]);
  const processingStepIndex = Math.min(
    PROCESSING_STEPS.length - 1,
    Math.floor(processingSeconds / 4),
  );
  const estimatedProgress = Math.min(94, 18 + processingSeconds * 6);
  const priorityViewSummary = useMemo(
    () => result?.views.find((view) => view.view === result.priority_view) ?? null,
    [result],
  );

  const activeSignal = useMemo(() => {
    if (!result || cyclePhases.length === 0) {
      return null;
    }
    const cycleDuration = result.cycle_time_seconds || 1;
    const cyclePosition = simulationSeconds % cycleDuration;
    let elapsed = 0;
    for (const phase of cyclePhases) {
      elapsed += phase.seconds;
      if (cyclePosition < elapsed) {
        return {
          currentView: phase.view,
          secondsRemaining: Math.ceil(elapsed - cyclePosition),
        };
      }
    }
    const lastPhase = cyclePhases[cyclePhases.length - 1];
    return lastPhase ? { currentView: lastPhase.view, secondsRemaining: lastPhase.seconds } : null;
  }, [cyclePhases, result, simulationSeconds]);

  useEffect(() => {
    if (!result) {
      return;
    }
    const interval = window.setInterval(() => {
      setSimulationSeconds((current) => current + 0.2 * playbackSpeed);
    }, 200);
    return () => window.clearInterval(interval);
  }, [playbackSpeed, result]);

  useEffect(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (!video) {
        return;
      }
      video.playbackRate = playbackSpeed;
    });
  }, [playbackSpeed, result]);

  useEffect(() => {
    const nextUrls: Record<string, string | null> = {
      north: null,
      east: null,
      south: null,
      west: null,
    };
    const previousUrls: string[] = [];

    setPreviewUrls((current) => {
      previousUrls.push(...Object.values(current).filter((value): value is string => Boolean(value)));
      for (const slot of VIDEO_SLOTS) {
        const file = files[slot.key];
        nextUrls[slot.key] = file ? URL.createObjectURL(file) : null;
      }
      return nextUrls;
    });

    return () => {
      for (const url of previousUrls) {
        URL.revokeObjectURL(url);
      }
      for (const url of Object.values(nextUrls)) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, [files]);

  useEffect(() => {
    if (!isSubmitting) {
      setProcessingSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setProcessingSeconds((Date.now() - startedAt) / 1000);
    }, 200);
    return () => window.clearInterval(interval);
  }, [isSubmitting]);

  const updateFile = (slotKey: string, file: File | null) => {
    setFiles((current) => ({ ...current, [slotKey]: file }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    for (const slot of VIDEO_SLOTS) {
      const file = files[slot.key];
      if (file) {
        formData.append("videos", file, file.name);
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as AnalysisResponse | { detail?: string };
      if (!response.ok) {
        throw new Error("detail" in payload ? payload.detail || "Analysis failed." : "Analysis failed.");
      }
      setResult(payload as AnalysisResponse);
      setSimulationSeconds(0);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Analysis failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300/80">Junction Upload Console</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">Feed four CCTV clips into the detector</h3>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Upload the north, east, south, and west views. The Python service runs the base YOLO traffic pass plus an emergency-vehicle scan, writes the JSON summary, and returns annotated feeds for the dashboard.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
          API: <span className="font-mono text-cyan-300">{API_BASE_URL}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {uploadPreviews.map((slot) => (
            <label
              key={slot.key}
              className="group flex min-h-40 cursor-pointer flex-col justify-between rounded-3xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-cyan-300/40 hover:bg-black/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{slot.label}</span>
                <Video className="h-4 w-4 text-cyan-300/80" />
              </div>
              <div className="space-y-3">
                {slot.previewUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                    <video
                      className="h-24 w-full object-cover"
                      src={slot.previewUrl}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black via-black/50 to-transparent px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                      <span>Preview ready</span>
                      <span>{slot.file ? formatBytes(slot.file.size) : ""}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-cyan-300">
                    <Upload className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-white/85">{slot.file?.name ?? "Choose a video file"}</p>
                  <p className="mt-1 text-xs text-white/45">MP4 preferred. One synchronized view per slot.</p>
                </div>
              </div>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => updateFile(slot.key, event.target.files?.[0] ?? null)}
              />
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-white/60">
            {selectedFiles.length}/4 videos ready
            {result ? <span className="ml-3 text-cyan-300">Latest run: {result.run_id}</span> : null}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFiles({ north: null, east: null, south: null, west: null });
                setError(null);
                setResult(null);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isSubmitting ? "Analyzing..." : "Analyze Junction"}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      {isSubmitting ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(8,47,73,0.65),rgba(5,10,20,0.85))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">Live Processing</p>
              <h4 className="mt-2 text-lg font-semibold text-white">Traffic and emergency analysis is running</h4>
              <p className="mt-2 max-w-2xl text-sm text-white/65">
                The detector is still working. This panel mirrors the current pipeline stages so the operator knows where the run is spending time.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Elapsed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{processingSeconds.toFixed(1)}s</p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
              animate={{ width: `${estimatedProgress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            {PROCESSING_STEPS.map((step, index) => {
              const isActive = index === processingStepIndex;
              const isComplete = index < processingStepIndex;
              return (
                <div
                  key={step.title}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isActive
                      ? "border-cyan-300/40 bg-cyan-300/10"
                      : isComplete
                        ? "border-emerald-300/30 bg-emerald-400/10"
                        : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{step.title}</p>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : isActive ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-cyan-200" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-white/25" />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-white/55">{step.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {uploadPreviews.map((slot) => (
              <div key={`${slot.key}-status`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{slot.label}</p>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                    queued
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-white/55">{slot.file?.name ?? "No file"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-6">
          {result.priority_mode === "emergency_override" && priorityViewSummary ? (
            <div className="rounded-3xl border border-red-400/30 bg-[linear-gradient(180deg,rgba(239,68,68,0.16),rgba(127,29,29,0.16))] p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-red-300/20 bg-red-500/15 p-3 text-red-100">
                    <Siren className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-red-100/70">Emergency Override</p>
                    <h4 className="mt-2 text-lg font-semibold text-white">
                      {priorityViewSummary.view.replace("_", " ").toUpperCase()} has immediate green-light priority
                    </h4>
                    <p className="mt-2 text-sm text-red-50/75">
                      Strongest match: {priorityViewSummary.strongest_emergency?.label ?? "emergency vehicle"} at{" "}
                      {Math.round((priorityViewSummary.strongest_emergency?.confidence ?? 0) * 100)}% confidence.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
                  First in sequence: <span className="font-semibold text-emerald-300">{result.priority_view}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Signal Recommendation</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">Green-light split for the latest run</h4>
                </div>
                <a href={result.summary_url} target="_blank" rel="noreferrer" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Open summary.json
                </a>
              </div>
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                Sequence:{" "}
                <span className="font-medium text-white">
                  {result.signal_sequence.map((view) => view.replace("_", " ").toUpperCase()).join(" -> ")}
                </span>
                <span className="ml-3 text-cyan-200">
                  {result.views.filter((view) => view.emergency_detected).length} emergency views flagged
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(result.recommended_green_times_seconds).map(([view, seconds]) => (
                  <div key={view} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span className="uppercase tracking-[0.2em]">{view.replace("_", " ")}</span>
                      <span>{seconds}s green</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-200"
                        style={{ width: `${Math.min((seconds / result.cycle_time_seconds) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              {result.views.map((view) => (
                <div key={view.view} className="rounded-3xl border border-white/10 bg-black/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{view.view.replace("_", " ")}</p>
                      <h5 className="mt-1 text-base font-semibold text-white">{view.estimated_unique_vehicles} vehicles tracked</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      {view.emergency_detected ? (
                        <div className="rounded-full border border-red-300/25 bg-red-500/10 px-3 py-1 text-xs text-red-100">
                          emergency detected
                        </div>
                      ) : null}
                      <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
                        congestion {view.congestion_score}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Average count</p>
                      <p className="mt-2 text-xl font-semibold text-white">{view.average_vehicle_count}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Peak count</p>
                      <p className="mt-2 text-xl font-semibold text-white">{view.peak_vehicle_count}</p>
                    </div>
                  </div>
                  {view.emergency_detected ? (
                    <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-50/80">
                      <p className="font-medium text-red-100">
                        {Object.entries(view.emergency_counts)
                          .map(([label, count]) => `${label}: ${count}`)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-red-50/60">
                        Best frame at {view.strongest_emergency?.timestamp_seconds ?? 0}s with{" "}
                        {Math.round((view.strongest_emergency?.confidence ?? 0) * 100)}% confidence.
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(255,255,255,0.03))] p-5">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/70">Signal Demo</p>
                <h4 className="mt-2 text-lg font-semibold text-white">Four-way traffic light simulation</h4>
                <p className="mt-2 text-sm text-white/60">
                  Demo speed controls affect both the signal cycle preview and the annotated video playback rate.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      playbackSpeed === speed
                        ? "border-amber-200 bg-amber-200 text-black"
                        : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/70">
              Active green:{" "}
              <span className="font-semibold text-emerald-300">
                {activeSignal?.currentView.replace("_", " ").toUpperCase() ?? "N/A"}
              </span>
              {activeSignal ? <span className="ml-3 text-white/50">{activeSignal.secondsRemaining}s remaining</span> : null}
              {result.priority_mode === "emergency_override" ? (
                <span className="ml-3 inline-flex items-center gap-2 text-red-100">
                  <AlertTriangle className="h-4 w-4" />
                  Emergency override enabled
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {result.views.map((view) => {
                const isActive = activeSignal?.currentView === view.view;
                return (
                  <div
                    key={`${view.view}-signal`}
                    className={`rounded-3xl border p-4 transition-colors ${
                      isActive ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{view.view.replace("_", " ")}</p>
                        <p className="mt-2 text-sm text-white/70">
                          green {result.recommended_green_times_seconds[view.view] ?? 0}s
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {view.emergency_detected ? <Siren className="h-4 w-4 text-red-200" /> : null}
                        <Play className={`h-4 w-4 ${isActive ? "text-emerald-300" : "text-white/35"}`} />
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-3">
                      <span className={`h-5 w-5 rounded-full ${!isActive ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.65)]" : "bg-red-500/25"}`} />
                      <span className={`h-5 w-5 rounded-full ${isActive ? "bg-amber-300/30" : "bg-amber-300/15"}`} />
                      <span className={`h-5 w-5 rounded-full ${isActive ? "bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.7)]" : "bg-emerald-400/20"}`} />
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${isActive ? "bg-emerald-300" : "bg-white/20"}`}
                        style={{
                          width: `${Math.min(((result.recommended_green_times_seconds[view.view] ?? 0) / result.cycle_time_seconds) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Annotated Feeds</p>
                <h4 className="mt-2 text-lg font-semibold text-white">All processed junction views</h4>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {result.views.map((view) => (
                <div key={`${view.view}-video`} className="overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-medium text-white">{view.view.replace("_", " ").toUpperCase()}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {Object.entries(view.class_breakdown)
                        .map(([label, count]) => `${label}: ${count}`)
                        .join(" · ") || "No vehicles detected"}
                    </p>
                    {view.emergency_detected ? (
                      <p className="mt-2 text-xs text-red-100/75">
                        Emergency classes:{" "}
                        {Object.entries(view.emergency_counts)
                          .map(([label, count]) => `${label}: ${count}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {view.annotated_video_url ? (
                    <video
                      ref={(element) => {
                        videoRefs.current[view.view] = element;
                      }}
                      className="aspect-video w-full bg-black"
                      src={view.annotated_video_url}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-sm text-white/40">Annotated video unavailable</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
