"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Users, Car, Zap, Clock, ShieldCheck, Leaf, Wind, Activity } from "lucide-react";

export default function StatsTab() {
  const [timeframe, setTimeframe] = useState<"Day" | "Week" | "Month">("Week");

  const timeframeData = {
    Day: [
      { label: "6AM", value: 15, color: "bg-blue-500" },
      { label: "9AM", value: 85, color: "bg-blue-400" },
      { label: "12PM", value: 60, color: "bg-blue-500" },
      { label: "3PM", value: 55, color: "bg-blue-500" },
      { label: "6PM", value: 95, color: "bg-blue-400" },
      { label: "9PM", value: 40, color: "bg-blue-600" },
      { label: "12AM", value: 10, color: "bg-blue-600" },
    ],
    Week: [
      { label: "Mon", value: 65, color: "bg-blue-500" },
      { label: "Tue", value: 45, color: "bg-blue-500" },
      { label: "Wed", value: 80, color: "bg-blue-400" },
      { label: "Thu", value: 55, color: "bg-blue-500" },
      { label: "Fri", value: 95, color: "bg-blue-400" },
      { label: "Sat", value: 30, color: "bg-blue-600" },
      { label: "Sun", value: 25, color: "bg-blue-600" },
    ],
    Month: [
      { label: "Week1", value: 210, color: "bg-blue-500" },
      { label: "Week2", value: 240, color: "bg-blue-400" },
      { label: "Week3", value: 190, color: "bg-blue-500" },
      { label: "Week4", value: 260, color: "bg-blue-400" },
    ],
  };

  const chartData = timeframeData[timeframe];
  const maxVal = Math.max(...chartData.map((d) => d.value));

  const countSummary = {
    Day: "68,432",
    Week: "412,391",
    Month: "1,842,504"
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics & Environmental Stats</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical traffic data, environmental metrics, and system performance.
          </p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          {(["Day", "Week", "Month"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-colors ${
                timeframe === period ? "bg-white/20 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Car, label: `Vehicles Context (${timeframe})`, value: countSummary[timeframe], trend: "+12.5%", isUp: true },
          { icon: Clock, label: "Avg Wait Time", value: "42s", trend: "-18.2%", isUp: true },
          { icon: ShieldCheck, label: "Violations Prevented", value: "8,432", trend: "+5.4%", isUp: true },
          { icon: Zap, label: "AI Preemptions", value: "145", trend: "-2.1%", isUp: false }
        ].map((stat, i) => (
          <motion.div
            key={i + timeframe} // Force animation on timeframe change
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider truncate">{stat.label}</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white truncate">{stat.value}</div>
            <div className={`text-xs font-medium flex items-center gap-1 ${stat.isUp ? 'text-green-400' : 'text-red-400'}`}>
              {stat.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.trend} vs last period
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-white" />
              Traffic Volume ({timeframe})
            </h3>
            <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-full">
              Total: {countSummary[timeframe]}
            </span>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 mt-4">
            <AnimatePresence mode="popLayout">
              {chartData.map((bar, i) => (
                <motion.div
                  key={bar.label + timeframe}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "100%", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-col items-center gap-2 flex-1 group"
                >
                  <div className="text-xs text-white/opacity-0 group-hover:opacity-100 transition-opacity font-mono bg-black/50 px-2 py-1 rounded mb-1 border border-white/10">
                    {bar.value}k
                  </div>
                  <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden flex flex-col justify-end h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(bar.value / maxVal) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`w-full ${bar.color} rounded-t-md opacity-80 group-hover:opacity-100 transition-opacity`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground uppercase font-medium mt-1">{bar.label}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium flex items-center gap-2 text-white">
              <Wind className="w-4 h-4 text-emerald-400" />
              Environmental Impact
            </h3>
            <div className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
              Live Monitoring
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Leaf className="w-12 h-12 text-green-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Air Quality Index (AQI)</span>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold tabular-nums text-white">42</span>
                <span className="text-sm font-medium text-green-400 mb-1">Good</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-green-500 w-[15%]" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Monitored in 12 heavy traffic zones</p>
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-12 h-12 text-red-500" />
              </div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Carbon Emissions</span>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold tabular-nums text-white">2.4</span>
                <span className="text-sm font-medium text-muted-foreground mb-1">tons</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden flex gap-0.5">
                <div className="h-full bg-red-400/80 w-[40%]" />
                <div className="h-full bg-orange-400/80 w-[20%]" />
                <div className="h-full bg-yellow-400/80 w-[30%]" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 flex gap-1">
                <TrendingDown className="w-3 h-3 text-green-400" />
                <span className="text-green-400 font-medium">12%</span> drop due to AI signal sync
              </p>
            </div>
          </div>
          
          <div className="mt-2 bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-4">
            <Leaf className="w-6 h-6 text-blue-400 shrink-0" />
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-medium text-white">Green Phase Optimization active</h4>
              <p className="text-xs text-muted-foreground">
                AI signal preemption currently saving approximately 18kg of CO2 per intersection every hour.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
