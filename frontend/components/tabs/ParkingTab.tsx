"use client";

import { motion } from "framer-motion";
import { Car, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ParkingTab() {
  const parkingSpots = Array.from({ length: 48 }).map((_, i) => {
    // Randomize parking spot state: 0 = available, 1 = occupied, 2 = overstay
    const rand = Math.random();
    let status = "available";
    if (rand > 0.6) status = "occupied";
    if (rand > 0.9) status = "overstay";
    return { id: `P-${i + 1}`, status };
  });

  const availableCount = parkingSpots.filter(s => s.status === "available").length;
  const occupiedCount = parkingSpots.filter(s => s.status === "occupied" || s.status === "overstay").length;
  const overstayCount = parkingSpots.filter(s => s.status === "overstay").length;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Parking Spot Watches & Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of parking availability and overstay violations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs font-medium uppercase tracking-wider">Available Spots</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">{availableCount}</div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Car className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium uppercase tracking-wider">Occupied Spots</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">{occupiedCount}</div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium uppercase tracking-wider">Overstays (Alerts)</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-white">{overstayCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            Spot Status Grid
          </h3>
          <div className="flex items-center gap-4 text-xs font-medium uppercase">
            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500/80" /> Available</span>
            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500/80" /> Occupied</span>
            <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500/80 animate-pulse" /> Overstay</span>
          </div>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-3 mt-4">
          {parkingSpots.map((spot, i) => (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              key={spot.id}
              className={`aspect-square rounded-xl border flex items-center justify-center font-mono text-xs font-bold transition-all relative overflow-hidden group hover:ring-2 hover:ring-white/50 ${
                spot.status === "available" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                spot.status === "occupied" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                "bg-red-500/10 border-red-500/50 text-red-500"
              }`}
            >
              {spot.status === "overstay" && (
                <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
              )}
              {spot.id}
              
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <span className="text-[10px] text-white uppercase tracking-widest">{spot.status}</span>
                {spot.status === "overstay" && <span className="text-[10px] text-red-400 mt-1">Ticket +$50</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
