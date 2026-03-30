"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { LoaderCircle, RefreshCw, Upload, Video } from "lucide-react";

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
  annotated_video: string | null;
  annotated_video_url?: string;
};

type AnalysisResponse = {
  run_id: string;
  model_path: string;
  cycle_time_seconds: number;
  summary_url: string;
  recommended_green_times_seconds: Record<string, number>;
  views: ViewSummary[];
};

const VIDEO_SLOTS = [
  { key: "north", label: "North View" },
  { key: "east", label: "East View" },
  { key: "south", label: "South View" },
  { key: "west", label: "West View" },
] as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_TRAFFIC_API_URL ?? "http://127.0.0.1:8000";

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

  const selectedFiles = useMemo(
    () => VIDEO_SLOTS.map((slot) => files[slot.key]).filter((file): file is File => Boolean(file)),
    [files],
  );

  const canSubmit = selectedFiles.length === VIDEO_SLOTS.length && !isSubmitting;

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
            Upload the north, east, south, and west views. The Python service runs YOLO analysis, writes the JSON summary, and returns four annotated feeds for the dashboard.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
          API: <span className="font-mono text-cyan-300">{API_BASE_URL}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {VIDEO_SLOTS.map((slot) => (
            <label
              key={slot.key}
              className="group flex min-h-40 cursor-pointer flex-col justify-between rounded-3xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-cyan-300/40 hover:bg-black/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{slot.label}</span>
                <Video className="h-4 w-4 text-cyan-300/80" />
              </div>
              <div className="space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-cyan-300">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-white/85">{files[slot.key]?.name ?? "Choose a video file"}</p>
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

      {result ? (
        <div className="mt-6 space-y-6">
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
                    <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
                      congestion {view.congestion_score}
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
                </div>
              ))}
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
                    <p className="mt-1 text-xs text-white/45">{Object.entries(view.class_breakdown).map(([label, count]) => `${label}: ${count}`).join(" · ") || "No vehicles detected"}</p>
                  </div>
                  {view.annotated_video_url ? (
                    <video className="aspect-video w-full bg-black" src={view.annotated_video_url} controls preload="metadata" />
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
