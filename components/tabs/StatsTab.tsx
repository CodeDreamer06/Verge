"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Users, Car, Zap, Clock, ShieldCheck } from "lucide-react";

export default function StatsTab() {
  const barData = [
    { label: "Mon", value: 65, color: "bg-blue-500" },
    { label: "Tue", value: 45, color: "bg-blue-500" },
    { label: "Wed", value: 80, color: "bg-blue-400" },
    { label: "Thu", value: 55, color: "bg-blue-500" },
    { label: "Fri", value: 95, color: "bg-blue-400" },
    { label: "Sat", value: 30, color: "bg-blue-600" },
    { label: "Sun", value: 25, color: "bg-blue-600" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics & Stats</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Historical data, traffic trends, and system performance metrics.
          </p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button className="px-3 py-1.5 text-xs font-medium bg-white/10 text-white rounded-md shadow-sm transition-colors">7D</button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors rounded-md">1M</button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors rounded-md">3M</button>
          <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors rounded-md">YTD</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Car, label: "Total Vehicles", value: "1.2M", trend: "+12.5%", isUp: true },
          { icon: Clock, label: "Avg Wait Time", value: "42s", trend: "-18.2%", isUp: true },
          { icon: ShieldCheck, label: "Violations Prevented", value: "8,432", trend: "+5.4%", isUp: true },
          { icon: Zap, label: "AI Preemptions", value: "145", trend: "-2.1%", isUp: false }
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">{stat.value}</div>
            <div className={`text-xs font-medium flex items-center gap-1 ${stat.isUp ? 'text-green-400' : 'text-red-400'}`}>
              {stat.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.trend} vs last period
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-white" />
              Traffic Volume by Day
            </h3>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 h-48 mt-4">
            {barData.map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="text-xs text-white/opacity-0 group-hover:opacity-100 transition-opacity font-mono bg-black/50 px-2 py-1 rounded mb-1 border border-white/10">
                  {bar.value}k
                </div>
                <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden flex flex-col justify-end h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${bar.value}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    className={`w-full ${bar.color} rounded-t-md opacity-80 group-hover:opacity-100 transition-opacity`}
                  />
                </div>
                <div className="text-xs text-muted-foreground uppercase font-medium mt-1">{bar.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              Violation Heatmap (by hour)
            </h3>
          </div>
          <div className="flex-1 grid grid-cols-12 grid-rows-7 gap-1">
            {Array.from({ length: 7 }).map((_, row) => (
              Array.from({ length: 12 }).map((_, col) => {
                const intensity = Math.random();
                const bgClass =
                  intensity > 0.8 ? "bg-red-500/80" :
                  intensity > 0.6 ? "bg-orange-500/80" :
                  intensity > 0.4 ? "bg-yellow-500/60" :
                  intensity > 0.2 ? "bg-white/20" : "bg-white/5";
                
                return (
                  <motion.div
                    key={`${row}-${col}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: (row * 12 + col) * 0.005 }}
                    className={`rounded-sm ${bgClass} hover:ring-2 ring-white/50 cursor-crosshair transition-all`}
                    title={`Val: ${Math.floor(intensity * 100)}`}
                  />
                );
              })
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase mt-2 px-1">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
