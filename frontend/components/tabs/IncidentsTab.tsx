"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Archive, Camera, Download, FileText, Filter, ShieldAlert, Siren } from "lucide-react";

import { VIOLATIONS, type ViolationRecord } from "@/lib/data";

const INCIDENTS_STORAGE_KEY = "verge-active-incidents";

export default function IncidentsTab() {
  const [incidents, setIncidents] = useState<ViolationRecord[]>(VIOLATIONS);

  useEffect(() => {
    const syncIncidents = () => {
      const raw = window.localStorage.getItem(INCIDENTS_STORAGE_KEY);
      if (!raw) {
        setIncidents(VIOLATIONS);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as ViolationRecord[];
        setIncidents(parsed.length > 0 ? parsed : VIOLATIONS);
      } catch {
        setIncidents(VIOLATIONS);
      }
    };

    syncIncidents();
    window.addEventListener("storage", syncIncidents);
    window.addEventListener("verge-incidents-updated", syncIncidents as EventListener);
    return () => {
      window.removeEventListener("storage", syncIncidents);
      window.removeEventListener("verge-incidents-updated", syncIncidents as EventListener);
    };
  }, []);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0 };
    for (const incident of incidents) {
      if (incident.type === "Red Light Jump") {
        counts.critical += 1;
      } else if (incident.type === "Over-speeding") {
        counts.high += 1;
      } else {
        counts.medium += 1;
      }
    }
    return counts;
  }, [incidents]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Active Incidents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time feed of logged violations, anomalies, and emergencies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5"
          >
            <h3 className="text-sm font-medium text-white mb-4">Severity Breakdown</h3>
            <div className="space-y-4">
              <SeverityRow label="Critical" count={severityCounts.critical} tone="red" total={incidents.length} />
              <SeverityRow label="High" count={severityCounts.high} tone="orange" total={incidents.length} />
              <SeverityRow label="Medium" count={severityCounts.medium} tone="yellow" total={incidents.length} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1"
          >
            <h3 className="text-sm font-medium text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <span className="text-sm">Acknowledge All</span>
                <Archive className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <span className="text-sm">Generate Report</span>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="md:col-span-3 flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex-1">
            <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/[0.02]">
              <div className="flex-1 max-w-md relative">
                <input
                  type="text"
                  placeholder="Search incident ID, vehicle plate, or location..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                Showing 1-{Math.min(10, incidents.length)} of {incidents.length}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {incidents.slice(0, 10).map((violation) => (
                <div key={violation.id} className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 sm:w-1/4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {renderIncidentIcon(violation.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{violation.type}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{violation.id}</p>
                    </div>
                  </div>

                  <div className="sm:w-1/4">
                    <p className="text-sm text-white/90">{violation.location}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{violation.time}</p>
                  </div>

                  <div className="sm:w-1/4">
                    <div className="inline-flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Vehicle</span>
                      <span className="text-sm font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                        {violation.vehicle}
                      </span>
                    </div>
                  </div>

                  <div className="sm:w-1/4 flex items-center justify-between">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                        violation.status === "Logged"
                          ? "text-green-400 bg-green-400/10"
                          : violation.status === "Alert Sent"
                            ? "text-blue-400 bg-blue-400/10"
                            : "text-yellow-400 bg-yellow-400/10"
                      }`}
                    >
                      {violation.status}
                    </span>
                    <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 flex justify-center bg-white/[0.02]">
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50" disabled>
                  {"<"}
                </button>
                <button className="w-8 h-8 rounded-md flex items-center justify-center bg-blue-500 text-white font-medium">1</button>
                <button className="w-8 h-8 rounded-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">2</button>
                <button className="w-8 h-8 rounded-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">3</button>
                <span className="px-2 text-muted-foreground">...</span>
                <button className="w-8 h-8 rounded-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                  {">"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityRow({
  label,
  count,
  tone,
  total,
}: {
  label: string;
  count: number;
  tone: "red" | "orange" | "yellow";
  total: number;
}) {
  const textTone = tone === "red" ? "text-red-400" : tone === "orange" ? "text-orange-400" : "text-yellow-400";
  const bgTone = tone === "red" ? "bg-red-400" : tone === "orange" ? "bg-orange-400" : "bg-yellow-400";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={textTone}>{label}</span>
        <span className="text-white font-medium">{count}</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div className={`${bgTone} h-1.5 rounded-full`} style={{ width: `${progressWidth(count, total)}%` }}></div>
      </div>
    </div>
  );
}

function progressWidth(count: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.max((count / total) * 100, count > 0 ? 8 : 0);
}

function renderIncidentIcon(type: string) {
  if (type === "Red Light Jump") {
    return <Camera className="w-5 h-5 text-red-400" />;
  }
  if (type === "No Helmet") {
    return <ShieldAlert className="w-5 h-5 text-orange-400" />;
  }
  if (type === "Over-speeding") {
    return <Siren className="w-5 h-5 text-yellow-400" />;
  }
  return <AlertTriangle className="w-5 h-5 text-purple-400" />;
}
