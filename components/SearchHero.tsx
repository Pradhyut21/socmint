"use client";

import React, { useState, useEffect } from "react";
import { Search, Phone, Mail, User, Image as ImageIcon, ShieldAlert, Shield, Coins, Layers, Zap, Plus, X, Camera } from "lucide-react";
import GlobeScanner from "./GlobeScanner";
import PlatformStatus from "./PlatformStatus";
import { DossierInput } from "../lib/types";

interface SearchHeroProps {
  onSearch: (query: string, type: string, dossier?: DossierInput) => void;
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

const DOSSIER_MILESTONES = [
  "Initializing Multi-Field Dossier Builder...",
  "Running parallel identity sweeps across all provided handles...",
  "AI discovering potential username variants...",
  "Sweeping 20 platforms per identity in parallel...",
  "Cross-referencing accounts across platforms...",
  "Merging profiles — deduplicating accounts & posts...",
  "Running HIBP breach check on provided email...",
  "Building unified geotag trail from all sources...",
  "Computing merged Behavioral Risk Score...",
  "Finalizing unified intelligence dossier..."
];

export default function SearchHero({ onSearch, isSearching }: SearchHeroProps) {
  // Common state
  const [searchMode, setSearchMode] = useState<"dossier" | "quick">("dossier");
  const [milestoneIndex, setMilestoneIndex] = useState(0);

  // Quick scan state
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("username");

  // Dossier state
  const [dossierUsernames, setDossierUsernames] = useState<string[]>([""]);
  const [dossierRealName, setDossierRealName] = useState("");
  const [dossierEmail, setDossierEmail] = useState("");
  const [dossierPhone, setDossierPhone] = useState("");
  const [dossierFaceData, setDossierFaceData] = useState<string>("");
  const [useDossierCamera, setUseDossierCamera] = useState(false);

  // Face upload state (shared)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [matchSuspect, setMatchSuspect] = useState("new_suspect");
  const [useCamera, setUseCamera] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dossierFileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const dossierVideoRef = React.useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImage(event.target.result as string);
          setUseCamera(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDossierFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDossierFaceData(event.target.result as string);
          setUseDossierCamera(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async (isDossier = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 400, height: 400 }
      });
      setMediaStream(stream);
      if (isDossier) {
        setUseDossierCamera(true);
      } else {
        setUseCamera(true);
        setUploadedImage(null);
      }
      setTimeout(() => {
        const ref = isDossier ? dossierVideoRef : videoRef;
        if (ref.current) {
          ref.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Unable to access system webcam. Please check permissions or upload a local image file.");
      console.error("Camera access failed", err);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setUseCamera(false);
    setUseDossierCamera(false);
  };

  const capturePhoto = (isDossier = false) => {
    const ref = isDossier ? dossierVideoRef : videoRef;
    if (ref.current) {
      const video = ref.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        if (isDossier) {
          setDossierFaceData(dataUrl);
        } else {
          setUploadedImage(dataUrl);
        }
        stopCamera();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      setMilestoneIndex(0);
      const activeMilestones = searchMode === "dossier" ? DOSSIER_MILESTONES : MILESTONES;
      interval = setInterval(() => {
        setMilestoneIndex((prev) => {
          if (prev < activeMilestones.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isSearching, searchMode]);

  // ─── Quick Scan handlers ──────────────────
  const handleQuickSubmit = (e: React.FormEvent) => {
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
      case "crypto": return "Enter suspect wallet address (e.g. BTC, ETH, LTC)...";
      default: return "Search...";
    }
  };

  const searchOptions = [
    { id: "username", label: "Username", icon: Search },
    { id: "phone", label: "Phone Number", icon: Phone },
    { id: "email", label: "Email Address", icon: Mail },
    { id: "name", label: "Real Name", icon: User },
    { id: "face", label: "Face Upload", icon: ImageIcon },
    { id: "crypto", label: "Crypto Wallet", icon: Coins }
  ];

  // ─── Dossier handlers ────────────────────
  const addUsernameField = () => {
    if (dossierUsernames.length < 8) {
      setDossierUsernames(prev => [...prev, ""]);
    }
  };

  const removeUsernameField = (index: number) => {
    if (dossierUsernames.length > 1) {
      setDossierUsernames(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateUsername = (index: number, value: string) => {
    setDossierUsernames(prev => prev.map((u, i) => i === index ? value : u));
  };

  const handleDossierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsernames = dossierUsernames
      .map(u => u.trim().replace(/^@/, ""))
      .filter(u => u.length > 0);

    const dossier: DossierInput = {
      usernames: cleanUsernames,
      realName: dossierRealName.trim(),
      email: dossierEmail.trim(),
      phone: dossierPhone.trim(),
      faceData: dossierFaceData,
    };

    const hasData = cleanUsernames.length > 0
      || dossier.realName.length > 0
      || dossier.email.length > 0
      || dossier.phone.length > 0
      || dossier.faceData.length > 0;

    if (!hasData) return;

    const primaryQuery = cleanUsernames[0] || dossier.realName || dossier.email || dossier.phone || "face-scan";
    onSearch(primaryQuery, "dossier", dossier);
  };

  const filledFieldCount = [
    dossierUsernames.some(u => u.trim().length > 0),
    dossierRealName.trim().length > 0,
    dossierEmail.trim().length > 0,
    dossierPhone.trim().length > 0,
    dossierFaceData.length > 0,
  ].filter(Boolean).length;

  const activeMilestones = searchMode === "dossier" ? DOSSIER_MILESTONES : MILESTONES;

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
            <h2 className="text-xl font-semibold text-center text-white mb-4 font-mono">
              Start Tactical Open-Source Profile Sweep
            </h2>

            {/* Mode Toggle */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <button
                onClick={() => setSearchMode("dossier")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                  searchMode === "dossier"
                    ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 border-blue-500/30 shadow-lg"
                    : "text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Full Dossier
              </button>
              <button
                onClick={() => setSearchMode("quick")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                  searchMode === "quick"
                    ? "bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 border-blue-500/30 shadow-lg"
                    : "text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Quick Scan
              </button>
            </div>

            {searchMode === "dossier" ? (
              /* ═══════════ DOSSIER FORM ═══════════ */
              <form onSubmit={handleDossierSubmit} className="space-y-4">
                {/* Field count badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    Provide all known suspect identifiers
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    filledFieldCount >= 3
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : filledFieldCount >= 1
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-slate-900 text-slate-600 border-slate-800"
                  }`}>
                    {filledFieldCount}/5 fields
                  </span>
                </div>

                {/* Usernames */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-blue-500" />
                    Usernames / Handles
                    <span className="text-slate-600">(add all known handles across platforms)</span>
                  </label>
                  {dossierUsernames.map((username, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-slate-600 font-mono text-sm">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => updateUsername(index, e.target.value)}
                          placeholder={index === 0 ? "e.g. pradd.18 (Instagram)" : index === 1 ? "e.g. pradhyut21 (GitHub)" : `Handle ${index + 1}...`}
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none text-white text-sm font-mono placeholder:text-slate-600 transition-all"
                        />
                      </div>
                      {dossierUsernames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUsernameField(index)}
                          className="p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {dossierUsernames.length < 8 && (
                    <button
                      type="button"
                      onClick={addUsernameField}
                      className="flex items-center gap-1.5 text-[10px] text-blue-500 hover:text-blue-400 font-mono uppercase tracking-wider transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add another handle
                    </button>
                  )}
                </div>

                {/* Real Name + Email row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3 text-cyan-500" />
                      Real Name
                    </label>
                    <input
                      type="text"
                      value={dossierRealName}
                      onChange={(e) => setDossierRealName(e.target.value)}
                      placeholder="e.g. K M Pradhyut"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white text-sm font-mono placeholder:text-slate-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-violet-500" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={dossierEmail}
                      onChange={(e) => setDossierEmail(e.target.value)}
                      placeholder="e.g. suspect@proton.me"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none text-white text-sm font-mono placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-amber-500" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={dossierPhone}
                    onChange={(e) => setDossierPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none text-white text-sm font-mono placeholder:text-slate-600 transition-all"
                  />
                </div>

                {/* Face Photo (compact) */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1.5 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3 text-rose-500" />
                    Face Photo
                    <span className="text-slate-600">(optional — for face scan analysis)</span>
                  </label>
                  <input
                    type="file"
                    ref={dossierFileInputRef}
                    onChange={handleDossierFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {useDossierCamera && !dossierFaceData && (
                    <div className="flex flex-col items-center justify-center bg-slate-950/60 p-4 border border-slate-900 rounded-xl relative overflow-hidden w-full max-w-xs mx-auto mb-2">
                      <div className="relative w-40 h-40 bg-black rounded-xl overflow-hidden mb-3 border border-blue-500/30">
                        <video
                          ref={dossierVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-blue-500/80"></div>
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-blue-500/80"></div>
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-blue-500/80"></div>
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-blue-500/80"></div>
                        <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-bounce top-1/2"></div>
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-rose-600/90 text-white font-mono font-bold text-[6px] px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          <span className="w-1 h-1 bg-white rounded-full"></span>
                          Live
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={stopCamera} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-850 rounded-lg text-[10px] font-mono transition-all">
                          Cancel
                        </button>
                        <button type="button" onClick={() => capturePhoto(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold font-mono tracking-wider glow-blue transition-all">
                          Capture
                        </button>
                      </div>
                    </div>
                  )}

                  {dossierFaceData ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-blue-500/20 flex-shrink-0">
                        <img src={dossierFaceData} alt="Face" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono flex-1">Face photo attached ✓</span>
                      <button
                        type="button"
                        onClick={() => { setDossierFaceData(""); setUseDossierCamera(false); }}
                        className="text-slate-600 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : !useDossierCamera && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => dossierFileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-800 hover:border-blue-500/40 hover:bg-slate-950/20 transition-all rounded-xl text-[10px] text-slate-500 hover:text-slate-300 font-mono cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3" /> Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => startCamera(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-800 hover:border-blue-500/40 hover:bg-slate-950/20 transition-all rounded-xl text-[10px] text-slate-500 hover:text-slate-300 font-mono cursor-pointer"
                      >
                        <Camera className="w-3 h-3" /> Live Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={filledFieldCount === 0}
                  className={`w-full py-3.5 rounded-xl font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                    filledFieldCount > 0
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg glow-blue hover:from-blue-700 hover:to-cyan-700"
                      : "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Build Intelligence Dossier
                  {filledFieldCount > 1 && (
                    <span className="text-[9px] opacity-70 ml-1">({filledFieldCount} identity vectors)</span>
                  )}
                </button>
              </form>
            ) : (
              /* ═══════════ QUICK SCAN FORM ═══════════ */
              <>
                {/* Input Type Selector Tabs */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
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
                <form onSubmit={handleQuickSubmit} className="w-full">
                  {searchType === "face" ? (
                    <div className="space-y-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {/* Mode Selector */}
                      <div className="flex gap-2 justify-center mb-2 border-b border-slate-900/60 pb-3">
                        <button
                          type="button"
                          onClick={() => { stopCamera(); setUploadedImage(null); setUseCamera(false); }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                            !useCamera && !uploadedImage
                              ? "bg-blue-600/10 text-blue-400 border-blue-500/20"
                              : "text-slate-500 border-transparent hover:text-slate-350"
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => startCamera(false)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border ${
                            useCamera
                              ? "bg-blue-600/10 text-blue-400 border-blue-500/20"
                              : "text-slate-500 border-transparent hover:text-slate-350"
                          }`}
                        >
                          Live Camera Scan
                        </button>
                      </div>
                      
                      {useCamera && !uploadedImage && (
                        <div className="flex flex-col items-center justify-center bg-slate-950/60 p-6 border border-slate-900 rounded-2xl relative overflow-hidden w-full max-w-sm mx-auto">
                          <div className="relative w-56 h-56 bg-black rounded-xl overflow-hidden mb-4 border border-blue-500/30">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover scale-x-[-1]"
                            />
                            
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-500/80"></div>
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-500/80"></div>
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-500/80"></div>
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-500/80"></div>
                            
                            <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-bounce top-1/2"></div>
                            
                            <div className="absolute top-[40%] left-[38%] w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <div className="absolute top-[40%] left-[58%] w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping delay-300"></div>
                            <div className="absolute top-[52%] left-[48%] w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping delay-150"></div>
                            <div className="absolute top-[65%] left-[42%] w-6 h-1.5 bg-emerald-500/30 border border-emerald-500 rounded-full animate-pulse"></div>

                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-600/90 text-white font-mono font-bold text-[7px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                              <span className="w-1 h-1 bg-white rounded-full"></span>
                              Webcam Active
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-850 rounded-xl text-xs font-mono transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => capturePhoto(false)}
                              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-1 shadow-lg glow-blue transition-all"
                            >
                              Capture Face
                            </button>
                          </div>
                        </div>
                      )}

                      {!useCamera && !uploadedImage && (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500/40 hover:bg-slate-950/20 transition-all rounded-2xl p-10 bg-slate-950/30 cursor-pointer group"
                        >
                          <ImageIcon className="w-12 h-12 text-slate-600 mb-3 group-hover:text-blue-500 transition-colors animate-pulse" />
                          <p className="text-sm font-semibold text-slate-350">Select Suspect Reference Photo</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">Supports PNG, JPEG, or WEBP. Max file size: 5MB.</p>
                        </div>
                      )}

                      {uploadedImage && (
                        <div className="flex flex-col items-center p-6 bg-slate-950/40 border border-slate-900 rounded-2xl">
                          <div className="relative w-40 h-40 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4">
                            <img 
                              src={uploadedImage} 
                              alt="Face Preview" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 border border-blue-500/20 rounded-2xl pointer-events-none"></div>
                          </div>

                          <div className="w-full max-w-md space-y-4">
                            <div>
                              <label className="text-[9px] text-slate-500 block mb-1 uppercase font-mono tracking-wider">
                                Cross-Reference Target Matcher
                              </label>
                              <select 
                                value={matchSuspect} 
                                onChange={(e) => setMatchSuspect(e.target.value)}
                                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-blue-500/40 font-mono"
                              >
                                <option value="new_suspect">Generate New Suspect Dossier (Forensic Mode)</option>
                                <option value="shadowtrader99">Match & Overwrite Vikram Rathore (shadowtrader99)</option>
                                <option value="sneha_fintech">Match & Overwrite Sneha Kulkarni (sneha_fintech)</option>
                              </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => { setUploadedImage(null); setUseCamera(false); }}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-405 border border-slate-850 rounded-xl text-xs font-mono transition-all"
                              >
                                Clear Photo
                              </button>
                              <button
                                type="button"
                                onClick={() => onSearch(`${matchSuspect}|||${uploadedImage}`, "face")}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-1 shadow-lg glow-blue transition-all"
                              >
                                Execute Forensic Sweep
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative flex items-center w-full">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={getPlaceholder()}
                        className="w-full pl-5 pr-24 py-4 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none text-white text-base font-mono shadow-inner placeholder:text-slate-500"
                        autoFocus
                      />
                      <div className="absolute right-14 px-2 py-1 rounded text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 pointer-events-none select-none">
                        Ctrl+K
                      </div>
                      <button
                        type="submit"
                        className="absolute right-2 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg glow-blue"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}

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
            <div className="w-full max-w-sm h-64 mb-6">
              <GlobeScanner />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 font-mono">
              {searchMode === "dossier" ? "Building Multi-Field Intelligence Dossier" : "Profiling Suspect Digital Footprint"}
            </h3>
            
            <div className="h-6 overflow-hidden relative w-full max-w-md text-center">
              <span className="text-sm text-blue-400 font-semibold font-mono animate-pulse">
                {activeMilestones[milestoneIndex]}
              </span>
            </div>

            {/* Milestones Progress Bar */}
            <div className="w-full max-w-md bg-slate-950 rounded-full h-1.5 mt-6 overflow-hidden border border-slate-900">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-700" 
                style={{ width: `${((milestoneIndex + 1) / activeMilestones.length) * 100}%` }}
              ></div>
            </div>
            
            <div className="text-[11px] text-slate-500 font-mono mt-4">
              Step {milestoneIndex + 1} of {activeMilestones.length} Completed
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
              onClick={() => { setSearchMode("quick"); setQuery("torvalds"); setSearchType("username"); }}
              className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-blue-400 hover:text-blue-300 font-mono hover:bg-slate-850"
            >
              torvalds
            </button>
            <button 
              onClick={() => { setSearchMode("quick"); setQuery("github"); setSearchType("username"); }}
              className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-blue-400 hover:text-blue-300 font-mono hover:bg-slate-850"
            >
              github
            </button>
            <button 
              onClick={() => { setSearchMode("quick"); setQuery("vercel"); setSearchType("username"); }}
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

      {/* Platform connectivity status */}
      {!isSearching && <PlatformStatus />}
    </div>
  );
}
