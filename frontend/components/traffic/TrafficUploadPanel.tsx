"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, LoaderCircle, MapPin, Video, Upload, Activity, Zap, Siren, Target, BarChart3, Clock, ShieldAlert } from "lucide-react";

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
    detail: "Pushing selected files to traffic-analysis node.",
  },
  {
    title: "Detecting lane traffic",
    detail: "YOLO pass for vehicles and lane load.",
  },
  {
    title: "Scanning emergency vehicles",
    detail: "Priority class detection (ambulance, fire truck).",
  },
  {
    title: "Computing signal plan",
    detail: "Synthesizing congestion and priority.",
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
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Junction Upload Console</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Feed synchronized CCTV clips into the detection and signaling node.
          </p>
        </div>
        <div className="flex bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-white/70 font-mono">{API_BASE_URL}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium flex items-center gap-2 text-white">
            <Video className="w-4 h-4 text-blue-400" />
            Feed Synchronization
          </h3>
          <span className="text-xs font-semibold text-white bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
            {selectedFiles.length}/4 Feeds Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {uploadPreviews.map((slot, i) => (
            <motion.label
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={slot.key}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 transition-all hover:border-blue-500/50 hover:bg-black/60 flex flex-col gap-4 min-h-[160px]"
            >
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-blue-400 transition-colors">{slot.label}</span>
                {slot.file ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <MapPin className="h-4 w-4 text-white/20" />}
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center text-center z-10 h-full">
                {slot.previewUrl ? (
                  <div className="absolute inset-0 z-0">
                    <video
                      className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                      src={slot.previewUrl}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 text-left">
                      <p className="text-[10px] uppercase font-mono text-emerald-300 font-bold truncate">{slot.file?.name}</p>
                      <p className="text-[10px] text-white/50">{slot.file ? formatBytes(slot.file.size) : ""}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/40 group-hover:text-blue-300 transition-colors">
                    <Upload className="h-6 w-6" />
                    <p className="text-xs">Drag & Drop or Click</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => updateFile(slot.key, event.target.files?.[0] ?? null)}
              />
            </motion.label>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between border-t border-white/10 mt-2">
          <div className="text-sm text-muted-foreground">
            {result && <span className="flex items-center gap-2">Latest pipeline run: <span className="text-blue-400 font-mono">{result.run_id}</span></span>}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFiles({ north: null, east: null, south: null, west: null });
                setError(null);
                setResult(null);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Reset All
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white px-5 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isSubmitting ? "Processing Sequence..." : "Run AI Analysis"}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </motion.div>
      ) : null}

      {isSubmitting ? (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-6 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-medium text-white">YOLO Inference & Signal Optimization</h4>
                  <p className="text-xs text-muted-foreground">Synthesizing multiple live feeds to calculate optimal traffic phasing.</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Elapsed Time</p>
                <p className="text-2xl font-semibold font-mono text-white tabular-nums">{processingSeconds.toFixed(1)}s</p>
             </div>
          </div>

          <div className="relative h-2 rounded-full bg-black/40 border border-white/5 overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 bottom-0 bg-blue-500"
              animate={{ width: `${estimatedProgress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {PROCESSING_STEPS.map((step, index) => {
              const isActive = index === processingStepIndex;
              const isComplete = index < processingStepIndex;
              return (
                <div
                  key={step.title}
                  className={`rounded-xl border p-4 transition-all duration-300 ${
                    isActive
                      ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      : isComplete
                        ? "border-green-500/20 bg-green-500/5 text-white/50"
                        : "border-white/5 bg-black/20 text-white/30"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                       <p className={`text-xs font-semibold ${isActive ? "text-blue-400" : isComplete ? "text-green-400" : ""}`}>{step.title}</p>
                       {isComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        ) : isActive ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-400" />
                        ) : null}
                    </div>
                     <p className={`text-[10px] leading-relaxed ${isActive ? "text-blue-200/70" : "text-white/40"}`}>{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      <AnimatePresence>
      {result ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {result.priority_mode === "emergency_override" && priorityViewSummary ? (
            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-transparent p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
                 <Siren className="w-32 h-32 text-red-500" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-red-500/20 p-3 ring-1 ring-red-500/50 animate-pulse">
                    <Siren className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-red-50 flex items-center gap-2">Emergency Override Initiated</h4>
                    <p className="text-sm text-red-200/80 mt-1">
                      <span className="font-bold text-red-100 uppercase">{priorityViewSummary.view.replace("_", " ")}</span> has immediate green-light priority.
                       Detected <span className="font-medium bg-red-500/20 px-1 py-0.5 rounded">{priorityViewSummary.strongest_emergency?.label}</span> at {Math.round((priorityViewSummary.strongest_emergency?.confidence ?? 0) * 100)}% confidence.
                    </p>
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-lg hidden md:flex items-center gap-3">
                  <span className="text-xs uppercase font-bold text-red-300 tracking-wider">Priority Sequence: </span>
                  <span className="text-sm font-semibold text-white uppercase bg-red-500/20 px-2 py-1 rounded">{result.priority_view}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                     <Target className="w-4 h-4 text-emerald-400" />
                     Generated Signal Plan
                   </h3>
                   <a href={result.summary_url} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-wider font-semibold bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md text-blue-400 hover:text-blue-300 transition-colors">
                     View JSON
                   </a>
                 </div>
                 
                 <div className="space-y-3">
                   {Object.entries(result.recommended_green_times_seconds).map(([view, seconds]) => (
                      <div key={view} className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-3 hover:border-white/10 transition-colors">
                        <div className="relative z-10 flex justify-between items-center text-sm font-medium">
                          <span className="uppercase tracking-widest text-[11px] text-muted-foreground">{view.replace("_", " ")}</span>
                          <span className="text-white bg-white/10 px-2 py-0.5 rounded text-xs shrink-0">{seconds}s</span>
                        </div>
                        <div className="absolute left-0 bottom-0 h-0.5 bg-emerald-500/50 transition-all" style={{ width: `${Math.min((seconds / result.cycle_time_seconds) * 100, 100)}%` }} />
                      </div>
                   ))}
                   <div className="pt-3 border-t border-white/5 mt-3 flex justify-between items-center">
                     <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Total Cycle</p>
                     <p className="text-sm text-white font-mono bg-white/5 px-2 py-0.5 rounded">{result.cycle_time_seconds}s</p>
                   </div>
                 </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Detection Profiling
                  </h3>
                </div>
                <div className="space-y-2">
                  {result.views.map(view => (
                    <div key={view.view} className="flex justify-between items-center p-2.5 rounded-xl bg-black/20 border border-transparent hover:border-white/10 transition-colors group">
                       <span className="text-[11px] uppercase tracking-wider font-medium text-white/70 group-hover:text-white transition-colors">{view.view.replace("_", " ")}</span>
                       <div className="flex gap-2 text-[10px] font-medium">
                          <span className="bg-white/10 text-white/90 px-2 py-1 rounded" title="Total Vehicles">{view.estimated_unique_vehicles} tot</span>
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded" title="Congestion Score">lvl {view.congestion_score}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                     <Clock className="w-4 h-4 text-amber-400" />
                     Live Simulation
                   </h3>
                   <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                      {PLAYBACK_SPEEDS.map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => setPlaybackSpeed(speed)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${playbackSpeed === speed ? "bg-white/20 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
                        >
                          {speed}x
                        </button>
                      ))}
                   </div>
                 </div>
                 
                 <div className="flex items-center justify-between mb-6 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Phase</span>
                       <span className="text-emerald-400 font-bold uppercase text-sm bg-emerald-500/10 px-2 py-0.5 rounded">
                          {activeSignal?.currentView.replace("_", " ") ?? "N/A"}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70 font-mono">
                       <Clock className="w-3.5 h-3.5 text-white/40" />
                       {activeSignal?.secondsRemaining}s
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.views.map((view) => {
                      const isActive = activeSignal?.currentView === view.view;
                      return (
                        <div key={view.view} className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-500 flex flex-col items-center justify-center gap-4 ${isActive ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-white/5 bg-black/40"}`}>
                           <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{view.view.replace("_", " ")}</span>
                           <div className="flex items-center gap-3 bg-black/60 p-2 rounded-full border border-white/5 relative z-10">
                             <div className={`w-3.5 h-3.5 rounded-full transition-all ${!isActive ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-red-500/20"}`} />
                             <div className={`w-3.5 h-3.5 rounded-full transition-all ${isActive ? "bg-amber-400/20" : "bg-amber-400/10"}`} />
                             <div className={`w-3.5 h-3.5 rounded-full transition-all ${isActive ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "bg-emerald-400/20"}`} />
                           </div>
                           
                           {isActive && <div className="absolute inset-0 bg-emerald-500/5 blur-xl pointer-events-none" />}
                        </div>
                      );
                    })}
                 </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
                 <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                   <Video className="w-4 h-4 text-blue-400" />
                   Annotated Outputs
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.views.map((view) => (
                      <div key={`${view.view}-video`} className="overflow-hidden rounded-xl border border-white/10 bg-black/50 relative group">
                        {view.annotated_video_url ? (
                          <video
                            ref={(element) => {
                              videoRefs.current[view.view] = element;
                            }}
                            className="w-full aspect-video object-cover"
                            src={view.annotated_video_url}
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground bg-black/60">
                            <Video className="w-6 h-6 text-white/20" />
                            No output generated
                          </div>
                        )}
                        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start">
                           <span className="text-[10px] font-bold uppercase text-white tracking-widest">{view.view.replace("_", " ")}</span>
                           {view.emergency_detected && (
                             <div className="bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-red-400" />
                                <span className="text-[9px] uppercase font-bold text-red-200">Alert</span>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

            </div>
          </div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
