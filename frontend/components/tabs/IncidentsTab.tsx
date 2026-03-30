"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Archive, Camera, Download, FileText, Filter, ShieldAlert, Siren, CheckCircle2, Navigation, Bell } from "lucide-react";

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

  // --- Feature State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // --- Filtering & Pagination ---
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inc.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inc.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "All" || inc.type === activeFilter || inc.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [incidents, searchQuery, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE));
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Set page back if out of bounds after filter
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // --- Actions ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showActionToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Type", "Vehicle", "Location", "Time", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredIncidents.map(inc => `"${inc.id}","${inc.type}","${inc.vehicle}","${inc.location}","${inc.time}","${inc.status}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `verge_incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showActionToast("CSV Exported successfully!");
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-50 bg-green-500/10 border border-green-500/20 text-green-400 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Active Incidents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time feed of logged violations, anomalies, and emergencies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              {activeFilter === "All" ? "Filter" : activeFilter}
            </button>
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col"
                >
                  {["All", "Logged", "Alert Sent", "Red Light Jump", "Over-speeding"].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => {
                        setActiveFilter(opt);
                        setShowFilterDropdown(false);
                      }}
                      className="px-4 py-2 text-sm text-left hover:bg-white/10 text-white transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
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
              <button onClick={() => showActionToast("All warnings & alerts acknowledged.")} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <span className="text-sm">Acknowledge All</span>
                <Archive className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => showActionToast("Summary report queued for generation.")} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <span className="text-sm">Generate Report</span>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => showActionToast("Units dispatched to closest high-risk nodes.")} className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                <span className="text-sm">Dispatch Units</span>
                <Navigation className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => showActionToast("Emergency Override Enabled.")} className="w-full flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors group">
                <span className="text-sm text-red-500 group-hover:text-red-400">Trigger Override</span>
                <Siren className="w-4 h-4 text-red-500 group-hover:text-red-400" />
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search incident ID, vehicle plate, or location..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredIncidents.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredIncidents.length)} of {filteredIncidents.length}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {paginatedIncidents.map((violation) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={violation.id} 
                    className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center gap-4"
                  >
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
                      <button 
                        onClick={() => showActionToast(`Viewing details for ${violation.id}...`)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </motion.div>
                ))}
                {paginatedIncidents.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No incidents match your search or filter.
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-center bg-white/[0.02]">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {"<"}
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                   <button 
                     key={i}
                     onClick={() => setCurrentPage(i + 1)}
                     className={`w-8 h-8 rounded-md flex items-center justify-center font-medium transition-colors ${
                       currentPage === i + 1 
                         ? "bg-blue-500 text-white" 
                         : "border border-white/10 hover:bg-white/10 text-muted-foreground"
                     }`}
                   >
                     {i + 1}
                   </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
