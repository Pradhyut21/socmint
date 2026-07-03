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
    if (suspect.reasoningSteps && suspect.reasoningSteps.length > 0) {
      platforms.add("Shield Engine");
    }
    return Array.from(platforms);
  };

  // Merge posts and investigation steps into a single chronological timeline (Feature 6)
  const timelineItems = [
    ...(suspect.posts || []).map(p => ({
      type: "post",
      id: p.id,
      platform: p.platform,
      postedAt: p.postedAt || p.timestamp || suspect.capturedAt,
      content: p.content,
      locationName: p.locationName,
      geolat: p.geolat,
      geolng: p.geolng,
      flagLevel: p.flagLevel,
      flagReason: p.flagReason,
      capturedAt: p.capturedAt
    })),
    ...(suspect.reasoningSteps || []).map((step, idx) => {
      const datePart = suspect.capturedAt ? suspect.capturedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const isoTime = `${datePart}T${step.timestamp}.000Z`;
      return {
        type: "investigation",
        id: `step-${idx}-${step.timestamp}`,
        platform: "Shield Engine",
        postedAt: isoTime,
        content: `[RECONSTRUCTION ENGINE] Engaged: ${step.module}\nInput Vector: "${step.input}"\nOutput Result: "${step.output}"\nDuration: ${step.durationMs}ms\nConfidence Delta: +${step.confidenceDelta}%`,
        locationName: undefined,
        geolat: undefined,
        geolng: undefined,
        flagLevel: step.confidenceDelta > 0 ? "SUSPICIOUS" : "NORMAL",
        flagReason: `Confidence increased: "${step.evidenceGenerated}"`,
        capturedAt: isoTime
      };
    })
  ].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  // Filter items based on UI controls
  const filteredItems = timelineItems.filter((item) => {
    const matchesPlatform = filterPlatform === "all" || item.platform.toLowerCase() === filterPlatform.toLowerCase();
    const matchesRisk = filterRisk === "all" || item.flagLevel === filterRisk;
    const matchesSearch = searchQuery.trim() === "" || 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.locationName && item.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesPlatform && matchesRisk && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Filters & Search Header */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        
        {/* Search bar inside timeline */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords or geotags in timeline..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:border-blue-500/40 focus:ring-0 outline-none text-ink font-mono placeholder:text-slate-400"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex items-center gap-4 flex-wrap">
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono text-slate-600">Platform</span>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-ink py-1.5 px-3 focus:outline-none focus:border-blue-500/40"
            >
              <option value="all">All Platforms</option>
              {getUniquePlatforms().map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-600">Risk Severity</span>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-ink py-1.5 px-3 focus:outline-none focus:border-blue-500/40"
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
      {timelineItems.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 shadow-sm font-mono">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-700">No public events or posts registered for this suspect profile.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 shadow-sm font-mono">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-700">No events matched the active filters.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6">
          {filteredItems.map((post) => (
            <div key={post.id} className="relative group">
              
              {/* Timeline marker node dot */}
              <div className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-white border-2 flex items-center justify-center shadow-md transition-colors ${
                post.type === "investigation"
                  ? "border-purple-650 group-hover:border-purple-500"
                  : "border-blue-600 group-hover:border-cyan-500"
              }`}></div>

              {/* Timeline content card */}
              <div className={`glass-panel p-5 rounded-2xl border shadow-sm transition-all ${
                post.type === "investigation"
                  ? "border-purple-200 hover:border-purple-300 bg-purple-50/10"
                  : "border-slate-200 hover:border-slate-300"
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  
                  {/* Platform & timestamp */}
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                      post.type === "investigation"
                        ? "bg-purple-100 text-purple-750 border border-purple-200"
                        : getPlatformColor(post.platform)
                    }`}>
                      {post.type === "investigation" ? "🔍" : getPlatformIcon(post.platform)} {post.platform.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimestamp(post.postedAt)}
                    </span>
                  </div>

                  {/* Risk Tag */}
                  {getRiskBadge(post.flagLevel)}

                </div>

                {/* Post content */}
                <p className="text-xs text-ink font-semibold leading-relaxed font-mono whitespace-pre-wrap select-all">
                  {post.content}
                </p>

                {/* Location tagging details */}
                {post.locationName && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold font-mono text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded w-max">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Geotag: {post.locationName}</span>
                    <span className="text-slate-600">({post.geolat?.toFixed(4)}, {post.geolng?.toFixed(4)})</span>
                  </div>
                )}

                {/* AI Explanation Banner */}
                {post.flagReason && (
                  <div className={`mt-4 p-3 rounded-xl border text-[10px] font-mono leading-relaxed ${
                    post.flagLevel === "HIGH_RISK" 
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-amber-50 border border-amber-200 text-amber-800"
                  }`}>
                    <span className="font-bold uppercase mr-1">
                      {post.type === "investigation" ? "Engine Details:" : "AI Risk Reasoning:"}
                    </span>
                    {post.flagReason}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                  <span className="text-[9px] text-slate-500 font-mono">
                    Captured at {new Date(post.capturedAt || suspect.capturedAt || new Date().toISOString()).toLocaleTimeString("en-IN")} IST from public source
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
