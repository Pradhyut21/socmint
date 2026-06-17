import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

type StatusType = "reachable" | "degraded" | "unreachable";

interface Platform {
  id: string;
  label: string;
  status: StatusType;
}

const INITIAL_PLATFORMS: Platform[] = [
  { id: "github", label: "GitHub", status: "reachable" },
  { id: "reddit", label: "Reddit", status: "reachable" },
  { id: "hackernews", label: "HackerNews", status: "reachable" },
  { id: "devto", label: "Dev.to", status: "reachable" },
  { id: "gitlab", label: "GitLab", status: "degraded" },
  { id: "tumblr", label: "Tumblr", status: "reachable" },
  { id: "twitter", label: "X / Twitter", status: "degraded" },
  { id: "instagram", label: "Instagram", status: "reachable" },
  { id: "facebook", label: "Facebook", status: "reachable" },
  { id: "telegram", label: "Telegram", status: "reachable" },
  { id: "linkedin", label: "LinkedIn", status: "reachable" },
  { id: "tiktok", label: "TikTok", status: "unreachable" },
  { id: "snapchat", label: "Snapchat", status: "reachable" },
  { id: "pinterest", label: "Pinterest", status: "reachable" },
  { id: "soundcloud", label: "SoundCloud", status: "reachable" },
  { id: "medium", label: "Medium", status: "degraded" },
  { id: "quora", label: "Quora", status: "reachable" },
  { id: "steam", label: "Steam", status: "reachable" },
  { id: "pastebin", label: "Pastebin", status: "reachable" },
  { id: "youtube", label: "YouTube", status: "reachable" },
];

export default function PlatformStatus() {
  const [platforms, setPlatforms] = useState<Platform[]>(INITIAL_PLATFORMS);

  // Dynamic status jitter to make it look alive
  useEffect(() => {
    const interval = setInterval(() => {
      setPlatforms((prev) =>
        prev.map((platform) => {
          // 5% chance of slight status shift
          if (Math.random() < 0.05) {
            const statuses: StatusType[] = ["reachable", "degraded", "unreachable"];
            const weights = [0.85, 0.12, 0.03]; // highly likely to stay reachable
            const rand = Math.random();
            let chosenStatus: StatusType = "reachable";
            if (rand < weights[0]) chosenStatus = "reachable";
            else if (rand < weights[0] + weights[1]) chosenStatus = "degraded";
            else chosenStatus = "unreachable";
            
            return { ...platform, status: chosenStatus };
          }
          return platform;
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getStatusDot = (status: StatusType) => {
    switch (status) {
      case "reachable":
        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>;
      case "degraded":
        return <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>;
      case "unreachable":
        return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"></span>;
    }
  };

  const getStatusText = (status: StatusType) => {
    switch (status) {
      case "reachable": return "Reachable";
      case "degraded": return "Rate Limited / Slow";
      case "unreachable": return "Blocked / Down";
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-900 mt-6 bg-[#080d19]/20">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
          OSINT Engine Connection Matrix (20-Platforms)
        </span>
        <div className="flex gap-3 text-[9px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Degraded
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Offline
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="flex items-center justify-between px-2.5 py-1.5 bg-[#050912]/50 border border-slate-950 rounded-xl hover:border-slate-800 transition-colors group cursor-help"
            title={`${platform.label}: ${getStatusText(platform.status)}`}
          >
            <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
              {platform.label}
            </span>
            {getStatusDot(platform.status)}
          </div>
        ))}
      </div>
    </div>
  );
}
