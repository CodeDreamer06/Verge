"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { LogOut, Settings, User, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

import VergeTab from "@/components/tabs/VergeTab";
import IncidentsTab from "@/components/tabs/IncidentsTab";
import ParkingTab from "@/components/tabs/ParkingTab";
import ReportsTab from "@/components/tabs/ReportsTab";
import StatsTab from "@/components/tabs/StatsTab";
import SettingsTab from "@/components/tabs/SettingsTab";

const DASHBOARD_TABS = ["Verge", "Incidents", "Parking", "Reports", "Stats", "Settings"] as const;

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Verge");
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      ) {
        return;
      }

      if (event.key === "0") {
        router.push("/");
        return;
      }

      const tabIndex = Number.parseInt(event.key, 10);
      if (Number.isNaN(tabIndex) || tabIndex < 1 || tabIndex > DASHBOARD_TABS.length) {
        return;
      }

      setActiveTab(DASHBOARD_TABS[tabIndex - 1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

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
          <nav className="flex items-center gap-2 text-sm font-medium overflow-x-auto whitespace-nowrap hide-scrollbar">
            {DASHBOARD_TABS.map((tab) => (
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
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden lg:flex items-center text-sm tabular-nums text-muted-foreground bg-white/5 px-3 py-1.5 rounded-md border border-white/5">
            <Clock className="w-4 h-4 mr-2 opacity-50" />
            {time}
          </div>

          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className={`relative transition-colors ${showNotifications ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></span>
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-4 w-80 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right ring-1 ring-white/5"
                >
                  <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="font-medium text-sm text-white">Notifications</h3>
                    <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Mark all read</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto hide-scrollbar flex flex-col">
                    <div className="p-3 hover:bg-white/[0.03] transition-colors flex gap-3 border-b border-white/5 cursor-pointer">
                      <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-white/90 font-medium">Emergency Override Active</p>
                        <p className="text-xs text-muted-foreground">Jubilee Hills Checkpost - Ambulance approaching</p>
                        <span className="text-[10px] text-muted-foreground font-medium">Just now</span>
                      </div>
                    </div>
                    <div className="p-3 hover:bg-white/[0.03] transition-colors flex gap-3 border-b border-white/5 cursor-pointer">
                      <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-white/90 font-medium">Congestion Alert</p>
                        <p className="text-xs text-muted-foreground">Heavy traffic detected at Madhapur junction</p>
                        <span className="text-[10px] text-muted-foreground font-medium">5m ago</span>
                      </div>
                    </div>
                    <div className="p-3 hover:bg-white/[0.03] transition-colors flex gap-3 cursor-pointer">
                      <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-white/90 font-medium">Daily Report Generated</p>
                        <p className="text-xs text-muted-foreground">Traffic analytics for yesterday are ready</p>
                        <span className="text-[10px] text-muted-foreground font-medium">1h ago</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={profileRef}>
            <div 
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="w-8 h-8 rounded-full border-[2px] border-white/20 overflow-hidden cursor-pointer hover:border-white/50 transition-colors"
            >
              <Image
                src="/testimonial-avatar.png"
                alt="Profile"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-4 w-56 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right ring-1 ring-white/5"
                >
                  <div className="p-4 border-b border-white/10 flex flex-col gap-1 bg-white/[0.02]">
                    <span className="font-semibold text-sm text-white">Brooklyn Simmons</span>
                    <span className="text-xs text-muted-foreground">Admin / Operator</span>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    <button className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2">
                       <User className="w-4 h-4" /> Profile
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTab("Settings");
                        setShowProfile(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                    >
                       <Settings className="w-4 h-4" /> Preferences
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-2" />
                    <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                       <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === "Verge" && <VergeTab key="verge" />}
          {activeTab === "Incidents" && <IncidentsTab key="incidents" />}
          {activeTab === "Parking" && <ParkingTab key="parking" />}
          {activeTab === "Reports" && <ReportsTab key="reports" />}
          {activeTab === "Stats" && <StatsTab key="stats" />}
          {activeTab === "Settings" && <SettingsTab key="settings" />}
        </AnimatePresence>
      </main>
    </div>
  );
}
