"use client";

import React, { useState } from "react";
import { SuspectProfile, Post } from "../lib/types";
import { Clock, Filter, AlertTriangle, AlertOctagon, CheckCircle2, MapPin, Search } from "lucide-react";

interface TimelineViewProps {
  suspect: SuspectProfile;
}

export default function TimelineView({ suspect }: TimelineViewProps) {
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return "Unknown Date";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "Unknown Date";
    return d.toLocaleString("en-IN", { timeZone: "IST", dateStyle: "medium", timeStyle: "short" }) + " IST";
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "telegram": return "TG";
      case "twitter": return "X";
      case "instagram": return "IG";
      case "github": return "GH";
      case "linkedin": return "IN";
      case "reddit": return "RD";
      default: return "OSINT";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "telegram": return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      case "twitter": return "bg-slate-300/10 text-slate-300 border border-slate-700/20";
      case "instagram": return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      case "github": return "bg-violet-500/10 text-violet-400 border border-violet-500/20";
      case "linkedin": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "reddit": return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      default: return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getRiskBadge = (level?: string) => {
    switch (level || "NORMAL") {
      case "NORMAL":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" /> NORMAL
          </span>
        );
      case "SUSPICIOUS":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> SUSPICIOUS
          </span>
        );
      case "HIGH_RISK":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded animate-pulse glow-red">
            <AlertOctagon className="w-3.5 h-3.5" /> HIGH RISK
          </span>
        );
      default:
        return null;
    }
  };

  const getUniquePlatforms = () => {
    const platforms = new Set<string>();
    (suspect.posts || []).forEach((p) => platforms.add(p.platform));
    return Array.from(platforms);
  };

  // Filter posts based on UI controls
  const filteredPosts = (suspect.posts || []).filter((post) => {
    const matchesPlatform = filterPlatform === "all" || post.platform === filterPlatform;
    const matchesRisk = filterRisk === "all" || post.flagLevel === filterRisk;
    const matchesSearch = searchQuery.trim() === "" || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.locationName && post.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesPlatform && matchesRisk && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Filters & Search Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
        
        {/* Search bar inside timeline */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords or geotags in timeline..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-900 focus:border-blue-500/40 focus:ring-0 outline-none text-white font-mono placeholder:text-slate-500"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex items-center gap-4 flex-wrap">
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono text-slate-400">Platform</span>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="bg-slate-950 border border-slate-900 rounded-lg text-[11px] font-mono text-slate-300 py-1.5 px-3 focus:outline-none focus:border-blue-500/40"
            >
              <option value="all">All Platforms</option>
              {getUniquePlatforms().map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Risk Severity</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-slate-950 border border-slate-900 rounded-lg text-[11px] font-mono text-slate-300 py-1.5 px-3 focus:outline-none focus:border-blue-500/40"
            >
              <option value="all">All Risk Levels</option>
              <option value="NORMAL">Normal</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="HIGH_RISK">High Risk</option>
            </select>
          </div>

        </div>

      </div>

      {/* Timeline List */}
      {(suspect.posts || []).length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 font-mono">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No public posts registered for this suspect profile.</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 font-mono">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No public posts matched the active filters.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-900 pl-6 ml-4 space-y-6">
          {filteredPosts.map((post) => (
            <div key={post.id} className="relative group">
              
              {/* Timeline marker node dot */}
              <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-blue-500 flex items-center justify-center shadow-lg group-hover:border-cyan-400 transition-colors"></div>

              {/* Timeline content card */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  
                  {/* Platform & timestamp */}
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${getPlatformColor(post.platform)}`}>
                      {getPlatformIcon(post.platform)} {post.platform.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimestamp(post.postedAt || post.timestamp)}
                    </span>
                  </div>

                  {/* Risk Tag */}
                  {getRiskBadge(post.flagLevel)}

                </div>

                {/* Post content */}
                <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap select-all">
                  {post.content}
                </p>

                {/* Location tagging details */}
                {post.locationName && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-1 rounded w-max">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Geotag: {post.locationName}</span>
                    <span className="text-slate-500">({post.geolat?.toFixed(4)}, {post.geolng?.toFixed(4)})</span>
                  </div>
                )}

                {/* AI Explanation Banner */}
                {post.flagReason && (
                  <div className={`mt-4 p-3 rounded-xl border text-[10px] font-mono leading-relaxed ${
                    post.flagLevel === "HIGH_RISK" 
                      ? "bg-rose-500/5 border-rose-500/25 text-rose-300"
                      : "bg-amber-500/5 border-amber-500/25 text-amber-300"
                  }`}>
                    <span className="font-bold uppercase mr-1">AI Risk Reasoning:</span>
                    {post.flagReason}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-900 text-right">
                  <span className="text-[9px] text-slate-600 font-mono">
                    Captured at {new Date(post.capturedAt || suspect.capturedAt).toLocaleTimeString("en-IN")} IST from public source
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
