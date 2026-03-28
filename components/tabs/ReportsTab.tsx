"use client";

import { motion } from "framer-motion";
import { Download, FileText, Calendar, ChevronDown, CheckCircle2 } from "lucide-react";

export default function ReportsTab() {
  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">System Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate, view, and schedule automated analytics reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
            <FileText className="w-4 h-4" />
            Create Custom Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full group-hover:bg-indigo-500/30 transition-colors" />
          <h3 className="text-lg font-medium text-white mb-2 relative z-10">Weekly Summary</h3>
          <p className="text-sm text-white/70 mb-6 relative z-10">
            Comprehensive overview of vehicle flow, congestion periods, and total violations.
          </p>
          <div className="flex items-center justify-between relative z-10 text-sm">
            <span className="text-indigo-300 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Last 7 Days</span>
            <button className="text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors font-medium">Auto-Scheduled</button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full group-hover:bg-emerald-500/30 transition-colors" />
          <h3 className="text-lg font-medium text-white mb-2 relative z-10">Intersection Efficiency</h3>
          <p className="text-sm text-white/70 mb-6 relative z-10">
            Wait times, queue lengths, and adaptive signal timing ROI.
          </p>
          <div className="flex items-center justify-between relative z-10 text-sm">
            <span className="text-emerald-300 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Monthly</span>
            <button className="text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors font-medium">Generate Now</button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-[50px] rounded-full group-hover:bg-rose-500/30 transition-colors" />
          <h3 className="text-lg font-medium text-white mb-2 relative z-10">Incident & Safety</h3>
          <p className="text-sm text-white/70 mb-6 relative z-10">
            Breakdown of traffic violation types, critical incidents, and response times.
          </p>
          <div className="flex items-center justify-between relative z-10 text-sm">
            <span className="text-rose-300 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Real-time</span>
            <button className="text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors font-medium">Live View</button>
          </div>
        </motion.div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-4">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-base font-medium text-white">Recent Artifacts</h3>
          <button className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-2">
            Sort by Date <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { name: "Verge_Weekly_Mar_Week4.pdf", size: "2.4 MB", date: "Mar 28, 2026", type: "PDF" },
            { name: "Intersection_Efficiency_Q1.csv", size: "840 KB", date: "Mar 25, 2026", type: "CSV" },
            { name: "Safety_Audit_Jubilee_Hills.pdf", size: "5.1 MB", date: "Mar 20, 2026", type: "PDF" },
            { name: "Raw_Telemetry_Export_Mar19.json", size: "12.8 MB", date: "Mar 19, 2026", type: "JSON" },
          ].map((file, idx) => (
            <div key={idx} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors cursor-pointer">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{file.size} • Prepared on {file.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-md hidden sm:flex">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready
                </div>
                <button className="w-8 h-8 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
