"use client";

import React, { useState, useEffect } from "react";
import { Search, Phone, Mail, User, Image as ImageIcon, ShieldAlert, Shield } from "lucide-react";

interface SearchHeroProps {
  onSearch: (query: string, type: string) => void;
  isSearching: boolean;
}

const MILESTONES = [
  "Initializing SOCMINT Shield v2 Engine...",
  "Sweeping 20 platforms in parallel (Tier 1 APIs + HTTP probes)...",
  "Fetching GitHub, Reddit, HackerNews, Dev.to, GitLab data...",
  "Running HTTP existence checks on 14 Tier-2 platforms...",
  "Checking Indian Kanoon & MCA21 public registries...",
  "Running alias detection (Levenshtein + writing style)...",
  "Shadow account prober scanning handle variants...",
  "Computing 5-factor Behavioral Risk Score (BRS)...",
  "Preserving digital evidence chain of custody..."
];

export default function SearchHero({ onSearch, isSearching }: SearchHeroProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("username");
  const [milestoneIndex, setMilestoneIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      setMilestoneIndex(0);
      interval = setInterval(() => {
        setMilestoneIndex((prev) => {
          if (prev < MILESTONES.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), searchType);
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case "username": return "Enter social media handle (e.g. torvalds, github, vercel)...";
      case "phone": return "Enter suspect mobile number (e.g. +91 98765 43210)...";
      case "email": return "Enter suspect email address (e.g. suspect@proton.me)...";
      case "name": return "Enter suspect real name (e.g. Vikram Rathore)...";
      case "face": return "Drag & drop suspect face photo here...";
      default: return "Search...";
    }
  };

  const searchOptions = [
    { id: "username", label: "Username", icon: Search },
    { id: "phone", label: "Phone Number", icon: Phone },
    { id: "email", label: "Email Address", icon: Mail },
    { id: "name", label: "Real Name", icon: User },
    { id: "face", label: "Face Upload", icon: ImageIcon }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8">
      {/* Visual Identity Logo */}
      <div className="flex items-center gap-3 mb-6 animate-pulse-fast">
        <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl glow-blue">
          <ShieldAlert className="w-10 h-10 text-blue-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-bold tracking-tight text-white font-mono">
            SOCMINT<span className="text-blue-500">SHIELD</span>
          </span>
          <span className="text-xs tracking-wider uppercase text-blue-400 font-semibold">
            Suspect Intelligence & Profiling Engine
          </span>
        </div>
      </div>

      <div className="w-full max-w-3xl glass-panel p-8 rounded-2xl border border-blue-500/20 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

        {!isSearching ? (
          <>
            <h2 className="text-xl font-semibold text-center text-white mb-6 font-mono">
              Start Tactical Open-Source Profile Sweep
            </h2>

            {/* Input Type Selector Tabs */}
            <div className="grid grid-cols-5 gap-2 mb-6 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {searchOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSearchType(opt.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg text-xs font-medium transition-all ${
                      searchType === opt.id
                        ? "bg-blue-600 text-white shadow-lg glow-blue"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {searchType === "face" ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-blue-500/60 transition-all rounded-xl p-8 bg-slate-950/30 cursor-pointer"
                     onClick={() => onSearch("github", "face")}>
                  <ImageIcon className="w-12 h-12 text-slate-500 mb-3 animate-bounce" />
                  <p className="text-sm font-medium text-slate-300">Drag and drop face profile picture here</p>
                  <p className="text-xs text-slate-500 mt-1">Prototype mode: click to run a live public sweep using a typed handle.</p>
                </div>
              ) : (
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={getPlaceholder()}
                    className="w-full pl-5 pr-12 py-4 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none text-white text-base font-mono shadow-inner placeholder:text-slate-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg glow-blue"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              )}
            </form>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>Section 65B Admissible Evidence Capture</span>
              </div>
              <div>DPDP Act 2023 Compliant (Public OSINT Only)</div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-24 h-24 mb-6">
              {/* Spinning Scanner Rings */}
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-cyan-500 border-l-transparent animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-cyan-400 border-b-transparent border-l-blue-400 animate-spin [animation-duration:1.2s]"></div>
              <div className="absolute inset-4 rounded-full border border-dashed border-blue-500/30 animate-pulse"></div>
              <ShieldAlert className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 font-mono">
              Profiling Suspect Digital Footprint
            </h3>
            
            <div className="h-6 overflow-hidden relative w-full max-w-md text-center">
              <span className="text-sm text-blue-400 font-semibold font-mono animate-pulse">
                {MILESTONES[milestoneIndex]}
              </span>
            </div>

            {/* Milestones Progress Bar */}
            <div className="w-full max-w-md bg-slate-950 rounded-full h-1.5 mt-6 overflow-hidden border border-slate-900">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-700" 
                style={{ width: `${((milestoneIndex + 1) / MILESTONES.length) * 100}%` }}
              ></div>
            </div>
            
            <div className="text-[11px] text-slate-500 font-mono mt-4">
              Step {milestoneIndex + 1} of {MILESTONES.length} Completed
            </div>
          </div>
        )}
      </div>

      {/* Demo helper tags */}
      {!isSearching && (
        <div className="mt-8 text-center bg-slate-950/40 border border-slate-800/40 p-4 rounded-xl max-w-2xl">
          <p className="text-xs text-slate-400 font-mono mb-3">Quick queries — click to fill & run (live public OSINT):</p>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            <button 
              onClick={() => { setQuery("torvalds"); setSearchType("username"); }}
              className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-blue-400 hover:text-blue-300 font-mono hover:bg-slate-850"
            >
              torvalds
            </button>
            <button 
              onClick={() => { setQuery("github"); setSearchType("username"); }}
              className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-blue-400 hover:text-blue-300 font-mono hover:bg-slate-850"
            >
              github
            </button>
            <button 
              onClick={() => { setQuery("vercel"); setSearchType("username"); }}
              className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-blue-400 hover:text-blue-300 font-mono hover:bg-slate-850"
            >
              vercel
            </button>
          </div>
          <div className="border-t border-slate-800 pt-3">
            <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wide">Demo mode — hackathon subjects with full mock dossiers:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => onSearch("shadowtrader99", "username")}
                className="text-xs px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 font-mono hover:bg-rose-500/15 flex items-center gap-1.5 font-semibold"
              >
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                Demo: shadowtrader99
              </button>
              <button
                onClick={() => onSearch("sneha_fintech", "username")}
                className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300 font-mono hover:bg-amber-500/15 flex items-center gap-1.5 font-semibold"
              >
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Demo: sneha_fintech
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
