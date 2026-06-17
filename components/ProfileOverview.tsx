"use client";

import React from "react";
import { SuspectProfile, PlatformAccount } from "../lib/types";
import { ShieldAlert, ShieldCheck, Mail, Phone, Calendar, ArrowUpRight, Award, Trash2 } from "lucide-react";

interface ProfileOverviewProps {
  suspect: SuspectProfile;
  onSelectTab: (tab: string) => void;
}

export default function ProfileOverview({ suspect, onSelectTab }: ProfileOverviewProps) {
  // SVG gauge constants
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (suspect.riskScore / 100) * circumference;

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW": return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10 glow-green";
      case "MEDIUM": return "text-amber-500 border-amber-500/20 bg-amber-500/10 glow-amber";
      case "HIGH": return "text-orange-500 border-orange-500/20 bg-orange-500/10 glow-amber";
      case "CRITICAL": return "text-rose-500 border-rose-500/20 bg-rose-500/10 animate-pulse-fast glow-red";
      default: return "text-slate-400 border-slate-700 bg-slate-800/20";
    }
  };

  const getRiskScoreColor = (level: string) => {
    switch (level) {
      case "LOW": return "#10b981";
      case "MEDIUM": return "#f59e0b";
      case "HIGH": return "#f97316";
      case "CRITICAL": return "#ef4444";
      default: return "#94a3b8";
    }
  };

  const getPlatformIconColor = (platform: string) => {
    switch (platform) {
      case "telegram": return "text-sky-400 bg-sky-950/40 border-sky-500/20";
      case "twitter": return "text-slate-300 bg-slate-950/40 border-slate-700/20";
      case "instagram": return "text-pink-400 bg-pink-950/40 border-pink-500/20";
      case "github": return "text-violet-400 bg-violet-950/40 border-violet-500/20";
      case "linkedin": return "text-blue-400 bg-blue-950/40 border-blue-500/20";
      case "reddit": return "text-orange-400 bg-orange-950/40 border-orange-500/20";
      default: return "text-slate-400 bg-slate-900 border-slate-800";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Suspect Info & BRS Gauge */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* Profile Details Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <img
                src={suspect.photoUrl}
                alt={suspect.realName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-800 shadow-lg"
              />
              <span className={`absolute -bottom-2 -right-2 px-2 py-0.5 text-[10px] font-bold border rounded-md font-mono ${getRiskColor(suspect.riskLevel)}`}>
                {suspect.riskLevel}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{suspect.realName}</h3>
            <p className="text-sm font-mono text-blue-400 mb-4">{suspect.username}</p>
            
            <div className="w-full flex items-center justify-between py-2 border-b border-slate-900 text-xs font-mono">
              <span className="text-slate-500">Case Reference</span>
              <span className="text-slate-300">{suspect.caseReference}</span>
            </div>
            
            <div className="w-full flex items-center justify-between py-2 border-b border-slate-900 text-xs font-mono">
              <span className="text-slate-500">Phone Number</span>
              <span className="text-slate-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                {suspect.phoneNumber}
              </span>
            </div>
            
            <div className="w-full flex items-center justify-between py-2 text-xs font-mono">
              <span className="text-slate-500">Email Address</span>
              <span className="text-slate-300 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                {suspect.emailAddress}
              </span>
            </div>
          </div>
        </div>

        {/* BRS Risk Gauge Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h4 className="text-sm font-semibold text-white mb-6 font-mono tracking-wider uppercase">
            Behavioral Risk Score (BRS)
          </h4>
          
          <div className="flex flex-col items-center justify-center">
            {/* SVG Circular Dial */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(30, 41, 59, 0.6)"
                  strokeWidth={strokeWidth}
                />
                {/* Active Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="transparent"
                  stroke={getRiskScoreColor(suspect.riskLevel)}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white font-mono">{suspect.riskScore}</span>
                <span className="text-[10px] tracking-wider text-slate-500 uppercase font-mono">Risk Index</span>
              </div>
            </div>

            {/* Sub-scores Progression Bars */}
            <div className="w-full space-y-3">
              {[
                { label: "Language Risk", score: suspect.riskSubscores.language },
                { label: "Behavioral Anomaly", score: suspect.riskSubscores.behavioral },
                { label: "Network Risk", score: suspect.riskSubscores.network },
                { label: "Legal History Risk", score: suspect.riskSubscores.legal }
              ].map((sub, idx) => (
                <div key={idx} className="text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{sub.label}</span>
                    <span className="text-slate-200">{sub.score} / 25</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${(sub.score / 25) * 100}%`,
                        backgroundColor: getRiskScoreColor(suspect.riskLevel)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* Right Column: AI Risk Signals & Platform Accounts */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Explainable AI Risk Signals */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
              AI Risk Signal Analysis (Explainable BRS)
            </h4>
          </div>

          <div className="space-y-3">
            {suspect.riskSignals.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No risk signals detected for this subject.
              </div>
            ) : (
              suspect.riskSignals.map((signal, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-slate-800 transition-all"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 text-xs font-bold font-mono">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">{signal}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Linked Platform Accounts List */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
              Discovered linked platform identities ({suspect.accounts.length})
            </h4>
            <button 
              onClick={() => onSelectTab("accounts")}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
            >
              Manage Accounts <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suspect.accounts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono col-span-2">
                No linked platform identities discovered.
              </div>
            ) : (
              suspect.accounts.map((acc) => (
              <div 
                key={acc.id}
                className="p-4 bg-slate-950/40 border border-slate-900 hover:border-blue-500/30 rounded-xl transition-all relative overflow-hidden group"
              >
                {/* Confidence tag top-right */}
                <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                  acc.confidence === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" :
                  acc.confidence === "PROBABLE" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" :
                  "bg-slate-700/30 text-slate-400 border border-slate-600/20"
                }`}>
                  {acc.confidence}
                </span>

                <div className="flex items-start gap-3">
                  <div className={`p-2 border rounded-lg uppercase text-xs font-bold font-mono ${getPlatformIconColor(acc.platform)}`}>
                    {acc.platform.substring(0, 2)}
                  </div>
                  <div className="flex flex-col min-w-0 pr-8">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{acc.displayName}</span>
                      {acc.tier === 1 && (
                        <span className="text-[7px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.5 rounded">T1</span>
                      )}
                    </div>
                    <span className="text-[10px] text-blue-400 font-mono truncate">@{acc.username}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 min-h-[30px] font-mono leading-relaxed">
                  {acc.bio || "No profile bio available."}
                </p>

                {acc.deepfakeFlag && (
                  <div className="mt-2.5 flex items-center gap-1 text-[9px] font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded w-max">
                    <ShieldCheck className="w-3 h-3" />
                    Deepfake profile picture detected
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-slate-900 flex flex-col gap-1.5 text-[9px] font-mono">
                  {suspect.locations.some(loc => loc.source === acc.platform && loc.crimeMatched) && (
                    <div className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded text-[8px] font-bold mb-1">
                      ⚠️ Crime Proximity Warning: Profile geotags match crime scene coordinates/timeframe.
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{acc.followers.toLocaleString()} Followers</span>
                    <a 
                      href={acc.profileUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-500 hover:text-blue-400 flex items-center gap-0.5 group-hover:underline"
                    >
                      View profile <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  <span className="text-slate-600 block pt-1 border-t border-slate-900/50">
                    Captured at {new Date(acc.capturedAt || suspect.capturedAt).toLocaleTimeString("en-IN")} IST from public source
                  </span>
                </div>
              </div>
            )))}
          </div>

        </div>

        {/* Financial Footprint (Phone Search) */}
        {suspect.upiFootprint && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 mt-6">
            <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase mb-4">
              Financial Footprint
            </h4>
            
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-start gap-4">
                <div className="w-1/3 text-slate-500">Phone Queried</div>
                <div className="w-2/3 text-slate-300">{suspect.upiFootprint.phone}</div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-1/3 text-slate-500">NCRP Database</div>
                <div className="w-2/3">
                  {suspect.upiFootprint.ncrp.status === "FOUND_PUBLIC_MENTION" ? (
                    <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      Found {suspect.upiFootprint.ncrp.complaintCount} Complaint(s)
                    </span>
                  ) : (
                    <span className="text-slate-400">Not publicly mentioned</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-1/3 text-slate-500">Truecaller Data</div>
                <div className="w-2/3">
                  {suspect.upiFootprint.truecaller.name ? (
                    <div className="space-y-1">
                      <div className="text-white font-bold">{suspect.upiFootprint.truecaller.name}</div>
                      {suspect.upiFootprint.truecaller.spamScore && (
                        <div className="text-rose-400 text-[10px]">Spam Score: {suspect.upiFootprint.truecaller.spamScore}</div>
                      )}
                      <div className="text-slate-400 text-[10px]">
                        {suspect.upiFootprint.truecaller.carrier} • {suspect.upiFootprint.truecaller.telecomCircle}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">No public data available</span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-900 pt-4 mt-4">
                <div className="text-slate-500 mb-2">Probable UPI IDs (Inferred)</div>
                <div className="flex flex-wrap gap-2">
                  {suspect.upiFootprint.probableUpiIds.map(upi => (
                    <span key={upi.id} className="bg-slate-950/40 border border-slate-800 text-slate-300 px-2 py-1 rounded text-[10px]">
                      {upi.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HIBP Breach Card (Email Search) */}
        {suspect.hibpResult && suspect.hibpResult.status !== "NOT_CONFIGURED" && (
          <div className={`glass-panel p-6 rounded-2xl border mt-6 ${
            suspect.hibpResult.status === "FOUND"
              ? "border-rose-500/30 bg-rose-950/5"
              : "border-emerald-500/20 bg-emerald-950/5"
          }`}>
            <div className="flex items-center gap-2 mb-4">
              {suspect.hibpResult.status === "FOUND" ? (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
              <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
                Email Breach Intelligence (HIBP)
              </h4>
              <span className={`ml-auto text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                suspect.hibpResult.status === "FOUND"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {suspect.hibpResult.status === "FOUND" ? `${suspect.hibpResult.breachCount} BREACHES FOUND` : "CLEAN"}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-mono mb-4">{suspect.hibpResult.note}</p>

            {suspect.hibpResult.breaches.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {suspect.hibpResult.breaches.map((breach, idx) => (
                  <div key={idx} className="p-3 bg-rose-950/10 border border-rose-500/15 rounded-xl font-mono text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-300">{breach.name}</span>
                      <span className="text-[9px] text-slate-500">{breach.breachDate}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {breach.dataClasses.slice(0, 4).map((dc, i) => (
                        <span key={i} className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                          {dc}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">{breach.description}</p>
                  </div>
                ))}
              </div>
            )}

            {suspect.hibpResult.pasteCount > 0 && (
              <div className="mt-3 text-[10px] text-amber-400 font-mono bg-amber-500/5 border border-amber-500/20 px-3 py-2 rounded-lg">
                ⚠️ Found in {suspect.hibpResult.pasteCount} public paste(s). Credentials may be publicly exposed.
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
