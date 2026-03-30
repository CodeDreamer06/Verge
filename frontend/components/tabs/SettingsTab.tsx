"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Save, Server, Shield, BellRing, Eye, Database, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function SettingsTab() {
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('General');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-500 pb-12 max-w-4xl relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-50 bg-blue-500/10 border border-blue-500/20 text-blue-400 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">System Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system rules, notification preferences, and API keys.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                showToast("Settings saved successfully.");
              }, 1000);
            }}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-foreground hover:bg-white/90 text-background rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 flex flex-col gap-2">
          {['General', 'AI Models', 'Notifications', 'Data Retention', 'Access Control'].map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => setActiveSubTab(item)}
              className={`px-4 py-2 text-left text-sm font-medium rounded-lg transition-colors ${activeSubTab === item ? 'bg-white/10 text-white' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 flex flex-col gap-6">
          {activeSubTab === 'General' && (
            <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <Eye className="w-5 h-5 text-blue-400" />
              Vision Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Detection Confidence Threshold</h4>
                  <p className="text-xs text-muted-foreground mt-1">Minimum AI confidence to log a violation.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="50" max="99" defaultValue="85" className="w-32 accent-blue-500" />
                  <span className="text-sm font-mono bg-white/10 px-2 py-1 rounded-md text-white">85%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white">Auto-Blur Number Plates</h4>
                  <p className="text-xs text-muted-foreground mt-1">Privacy mode for non-violation vehicles.</p>
                </div>
                <button className="w-11 h-6 bg-blue-500 rounded-full relative transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform translate-x-5" />
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <BellRing className="w-5 h-5 text-emerald-400" />
              Alert Rules
            </h3>
            
            <div className="space-y-5">
              {[
                { label: 'Emergency Vehicle Preemption', desc: 'Auto-clear path for ambulances/fire trucks.' },
                { label: 'Severe Congestion SMS Alerts', desc: 'Notify operators when queue exceeds 500m.' },
                { label: 'Hardware Offline Warning', desc: 'Alert if any camera node drops connection.' }
              ].map((rule, idx) => (
                <div key={idx} className="flex items-start gap-4">
                   <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-black transition-all" />
                   <div>
                     <h4 className="text-sm font-medium text-white">{rule.label}</h4>
                     <p className="text-xs text-muted-foreground mt-1">{rule.desc}</p>
                   </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 border-red-500/30">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-4">
              <Shield className="w-5 h-5 text-red-400" />
              Danger Zone
            </h3>
            
            <div className="flex items-center justify-between pt-2">
               <div>
                  <h4 className="text-sm font-medium text-red-400">Restart Core Services</h4>
                  <p className="text-xs text-muted-foreground mt-1">Temporarily halts all AI detection queues.</p>
                </div>
                <button 
                  onClick={() => showToast("Restarting Core services... Please wait.")}
                  className="px-4 py-2 border border-red-500/50 hover:bg-red-500/10 text-red-500 rounded-lg text-sm font-medium transition-colors"
                >
                  Force Restart
                </button>
            </div>
          </motion.div>
          </>
          )}

          {activeSubTab === 'AI Models' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
              <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Server className="w-5 h-5 text-purple-400" />
                Inference Engines
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">YOLOv8 Real-time Feed</h4>
                    <p className="text-xs text-muted-foreground mt-1">Primary model for vehicle tracking.</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-md border border-green-500/30">Active</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <h4 className="text-sm font-medium text-white">LPR (License Plate Recognition)</h4>
                    <p className="text-xs text-muted-foreground mt-1">Secondary model for violations.</p>
                  </div>
                  <button className="w-11 h-6 bg-blue-500 rounded-full relative transition-colors">
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform translate-x-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab !== 'General' && activeSubTab !== 'AI Models' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/20 rounded-2xl bg-white/[0.02]">
              <Database className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-base font-medium text-white mb-2">{activeSubTab} Configuration</h3>
              <p className="text-sm text-muted-foreground">Settings for this section are currently running on default profiles.</p>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
