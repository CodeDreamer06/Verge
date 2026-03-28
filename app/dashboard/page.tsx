"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  Camera,
  Car,
  Clock,
  FileText,
  ShieldAlert,
  Siren,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Mock Data
const ALERTS = [
  {
    id: 1,
    type: "Emergency",
    title: "Ambulance approaching Intersect 42",
    time: "Just now",
    icon: Siren,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    id: 2,
    type: "Violation",
    title: "Red Light Jump - Cam 12",
    time: "2m ago",
    icon: Camera,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    id: 3,
    type: "Warning",
    title: "High Congestion Predicted - Main St.",
    time: "5m ago",
    icon: AlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    id: 4,
    type: "Violation",
    title: "No Helmet Detected - Cam 04",
    time: "12m ago",
    icon: ShieldAlert,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const VIOLATIONS = [
  {
    id: "V-8291",
    type: "Red Light Jump",
    vehicle: "TS 09 EP 1234",
    location: "Junction 7",
    time: "10:42 AM",
    status: "Logged",
  },
  {
    id: "V-8292",
    type: "No Helmet",
    vehicle: "TS 07 BP 9012",
    location: "Jubilee Hills Checkpost",
    time: "10:38 AM",
    status: "Alert Sent",
  },
  {
    id: "V-8293",
    type: "Over-speeding",
    vehicle: "TS 08 XY 5566",
    location: "Highway Link",
    time: "10:15 AM",
    status: "Logged",
  },
  {
    id: "V-8294",
    type: "Wrong Way",
    vehicle: "Unknown",
    location: "Sector 4",
    time: "09:50 AM",
    status: "Manual Review",
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Verge");
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-white/20">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 transition-transform group-hover:scale-105">
              <Image
                src="/verge-logo.png"
                alt="Verge Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Verge
            </span>
          </Link>

          {/* Tabs */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            {["Verge", "Incidents", "Reports", "Stats", "Settings"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab
                      ? "text-white"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden lg:flex items-center text-sm tabular-nums text-muted-foreground bg-white/5 px-3 py-1.5 rounded-md border border-white/5">
            <Clock className="w-4 h-4 mr-2 opacity-50" />
            {time}
          </div>

          <button className="relative text-muted-foreground hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
          </button>

          <div className="w-8 h-8 rounded-full border-[2px] border-white/20 overflow-hidden cursor-pointer hover:border-white/50 transition-colors">
            <Image
              src="/testimonial-avatar.png"
              alt="Profile"
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-400" />
                  Vehicle Detection
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Detect cars, buses, trucks & overlay bounding boxes in
                  real-time.
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-semibold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                24,591
              </div>
              <div className="text-xs text-green-400 flex items-center bg-green-400/10 px-2 py-1 rounded-md">
                <TrendingUp className="w-3 h-3 mr-1" />
                +14%
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-400" />
                  Queue Length Estimation
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Continuous estimation of vehicles & queue size by lane.
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-semibold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                42
                <span className="text-lg text-muted-foreground font-normal">
                  .2m
                </span>
              </div>
              <div className="text-xs text-emerald-400 flex items-center bg-emerald-400/10 px-2 py-1 rounded-md">
                Avg Queue
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 relative overflow-hidden group"
          >
            {/* decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none group-hover:bg-purple-500/20 transition-colors" />

            <div className="flex items-start justify-between mb-4 relative z-10">
              <div>
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Congestion Forecasting
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI forecasting to predict upcoming traffic surges dynamically.
                </p>
              </div>
            </div>
            <div className="flex gap-2 relative z-10">
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-green-500 w-[60%]" />
              </div>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-yellow-500 w-[80%]" />
              </div>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-red-500 w-[30%]" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider relative z-10">
              <span>Low</span>
              <span>Med</span>
              <span>High</span>
            </div>
          </motion.div>
        </div>

        {/* Middle Section: Video Feeds & Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Camera Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium tracking-tight">
                Live Intersections
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md transition-colors border border-white/5">
                  Cam 07
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors">
                  Cam 12
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors">
                  Cam 42
                </button>
              </div>
            </div>

            <div className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl group ring-1 ring-white/5">
              {/* Background Video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
              />

              {/* Simulated Bounding Boxes Overlay (Static for effect) */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  animate={{ x: [0, 5, -2, 0], y: [0, -2, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute top-[35%] left-[45%] w-24 h-16 border-2 border-green-500/80 bg-green-500/10 rounded-sm"
                >
                  <span className="absolute -top-5 left-[-2px] bg-green-500/80 text-black text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                    Bus 88%
                  </span>
                </motion.div>

                <motion.div
                  animate={{ x: [0, -10, -20], y: [0, 5, 10] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute top-[60%] left-[30%] w-20 h-14 border-2 border-blue-500/80 bg-blue-500/10 rounded-sm"
                >
                  <span className="absolute -top-5 left-[-2px] bg-blue-500/80 text-black text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                    Car 94%
                  </span>
                </motion.div>

                <motion.div
                  animate={{ x: [0, 15, 30], y: [0, 10, 20] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                  className="absolute top-[50%] left-[70%] w-16 h-12 border-2 border-red-500/80 bg-red-500/10 rounded-sm"
                >
                  <span className="absolute -top-5 left-[-2px] bg-red-500/80 text-black text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                    Car 91%
                  </span>
                </motion.div>

                <div className="absolute top-[28%] left-[25%] w-6 h-12 border-2 border-yellow-500/80 bg-yellow-500/10 rounded-sm">
                  <span className="absolute -top-5 left-[-2px] bg-yellow-500/80 text-black text-[10px] font-bold px-1.5 py-0.5">
                    Person
                  </span>
                </div>
              </div>

              {/* HUD Overlay */}
              <div className="absolute top-4 left-4 liquid-glass px-4 py-2 rounded-lg flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold">
                    Cam ID
                  </span>
                  <span className="text-white font-mono font-medium">
                    07-NORTH
                  </span>
                </div>
              </div>

              {/* Emergency Override Alert (Dynamic) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 1.5,
                }}
                className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400"
              >
                <Siren className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Emergency Override
                </span>
              </motion.div>

              {/* Bottom Stats Bar */}
              <div className="absolute bottom-4 inset-x-4 liquid-glass px-4 py-3 rounded-lg flex items-center justify-between">
                <div className="flex gap-6 text-xs font-medium text-white/80">
                  <span>
                    Res: <span className="text-white">1920×1080</span>
                  </span>
                  <span>
                    FPS: <span className="text-white">60</span>
                  </span>
                  <span>
                    Latency: <span className="text-white">120ms</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                    AI Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Traffic Flow & Alerts */}
          <div className="space-y-6">
            {/* Traffic Flow Map Component */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium tracking-tight">
                  Traffic Flow
                </h2>
                <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />{" "}
                    High
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 border border-yellow-500/20" />{" "}
                    Med
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 border border-green-500/20" />{" "}
                    Low
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-2 h-[260px] relative overflow-hidden group">
                {/* Abstract Map using SVGs to represent flow */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mixing-blend-screen pointer-events-none" />
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-1 opacity-[0.03] pointer-events-none">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="border border-white" />
                  ))}
                </div>

                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 400 300"
                  className="absolute inset-0"
                >
                  {/* Sub-roads */}
                  <path
                    d="M 50,0 Q 100,150 50,300"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />
                  <path
                    d="M 0,220 Q 200,200 400,250"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />

                  {/* Main Arteries */}
                  {/* Low Traffic */}
                  <path
                    d="M 0,100 L 400,100"
                    fill="none"
                    stroke="rgba(34,197,94,0.6)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                  />
                  {/* Med Traffic */}
                  <path
                    d="M 180,0 L 220,100 L 200,300"
                    fill="none"
                    stroke="rgba(234,179,8,0.7)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]"
                  />
                  {/* High Traffic - Pulsing Red */}
                  <path
                    d="M 320,0 Q 280,150 350,300"
                    fill="none"
                    stroke="rgba(239,68,68,0.8)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse"
                  />

                  {/* Hotspots */}
                  <circle
                    cx="212"
                    cy="100"
                    r="10"
                    fill="rgba(239,68,68,0.2)"
                    stroke="rgba(239,68,68,0.8)"
                    strokeWidth="2"
                    className="animate-ping"
                  />
                  <circle cx="212" cy="100" r="4" fill="#fff" />

                  <circle cx="295" cy="140" r="4" fill="#fff" />
                  <circle cx="340" cy="270" r="4" fill="#fff" />

                  <text
                    x="230"
                    y="90"
                    fill="white"
                    fontSize="12"
                    className="font-sans font-medium opacity-80"
                  >
                    Jubilee Checkpost
                  </text>
                </svg>

                {/* Fake map controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                  <button className="w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-md flex items-center justify-center border border-white/10 text-white transition-colors">
                    +
                  </button>
                  <button className="w-8 h-8 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-md flex items-center justify-center border border-white/10 text-white transition-colors">
                    -
                  </button>
                </div>
              </div>
            </div>

            {/* Live Activity & Alerts */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-white" />
                  Live Activity
                </h3>
                <button className="text-xs text-muted-foreground hover:text-white transition-colors">
                  See all
                </button>
              </div>

              <div className="space-y-3">
                {ALERTS.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors cursor-default"
                  >
                    <div
                      className={`mt-0.5 p-2 rounded-lg ${alert.bg} ${alert.color}`}
                    >
                      <alert.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alert.type}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {alert.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Rule Monitoring Layer */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-medium tracking-tight">
                AI Traffic Rule Monitoring
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Automatic logging of common violations & red-light jumpers.
              </p>
            </div>
            <button className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-4 py-2 rounded-lg border border-blue-400/20 hover:bg-blue-400/20">
              <FileText className="w-4 h-4" />
              Export Report
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/[0.02] border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">
                      Incident ID
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider">
                      Violation Type
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider">
                      Vehicle Plate
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">
                      Status
                    </th>
                    <th className="px-6 py-4 font-semibold tracking-wider w-[100px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {VIOLATIONS.map((violation) => (
                    <tr
                      key={violation.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-white">
                        {violation.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white text-xs font-medium">
                          {violation.type === "Red Light Jump" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          )}
                          {violation.type === "No Helmet" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          )}
                          {violation.type === "Over-speeding" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          )}
                          {violation.type === "Wrong Way" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          )}
                          {violation.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-muted-foreground">
                        {violation.vehicle}
                      </td>
                      <td className="px-6 py-4 text-white/80">
                        {violation.location}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {violation.time}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-md ${
                            violation.status === "Logged"
                              ? "text-green-400 bg-green-400/10"
                              : violation.status === "Alert Sent"
                                ? "text-blue-400 bg-blue-400/10"
                                : "text-yellow-400 bg-yellow-400/10"
                          }`}
                        >
                          {violation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-muted-foreground hover:text-white transition-colors">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
