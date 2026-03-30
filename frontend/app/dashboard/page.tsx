"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import VergeTab from "@/components/tabs/VergeTab";
import IncidentsTab from "@/components/tabs/IncidentsTab";
import ParkingTab from "@/components/tabs/ParkingTab";
import ReportsTab from "@/components/tabs/ReportsTab";
import StatsTab from "@/components/tabs/StatsTab";
import SettingsTab from "@/components/tabs/SettingsTab";

const DASHBOARD_TABS = ["Verge", "Incidents", "Parking", "Reports", "Stats", "Settings"] as const;

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

      const tabIndex = Number.parseInt(event.key, 10);
      if (Number.isNaN(tabIndex) || tabIndex < 1 || tabIndex > DASHBOARD_TABS.length) {
        return;
      }

      setActiveTab(DASHBOARD_TABS[tabIndex - 1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
          <nav className="flex items-center gap-2 text-sm font-medium overflow-x-auto whitespace-nowrap hide-scrollbar">
            {DASHBOARD_TABS.map((tab, index) => (
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
                <span className="ml-2 text-[10px] text-white/35">{index + 1}</span>
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

          <button className="relative text-muted-foreground hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black animate-pulse"></span>
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
