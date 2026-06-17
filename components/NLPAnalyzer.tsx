"use client";

import React from "react";
import { SuspectProfile } from "../lib/types";
import { Sparkles, Languages, AlertTriangle, ShieldCheck } from "lucide-react";

interface NLPAnalyzerProps {
  suspect: SuspectProfile;
}

export default function NLPAnalyzer({ suspect }: NLPAnalyzerProps) {
  // Mock NLP text analysis based on the query subject
  const analyzedLanguages = [
    { name: "English", percentage: 55 },
    { name: "Hindi (हिंदी)", percentage: 20 },
    { name: "Kannada (ಕನ್ನಡ)", percentage: 15 },
    { name: "Tamil (தமிழ்)", percentage: 7 },
    { name: "Telugu (తెలుగు)", percentage: 3 }
  ];

  const parsedStatements = [
    {
      text: suspect.username.includes("shadowtrader99") 
        ? "Decentralized liquidity bypass. IND Indiranagar corridor active. Hawala cash drop coordinates fixed."
        : "Testing smart contract transaction triggers in SIH Pune. Secure transaction auditing active.",
      language: "English",
      sentiment: "NEGATIVE",
      threatLevel: "CRITICAL",
      keywords: ["bypass", "hawala", "cash drop"]
    },
    {
      text: suspect.username.includes("shadowtrader99")
        ? "Indiranagar side crypto trades support. OTP bypass testing complete."
        : "Finance security logs verification. Safe payment integration works.",
      language: "Kannada (ಕನ್ನಡ)",
      sentiment: "NEUTRAL",
      threatLevel: "WARNING",
      keywords: ["bypass", "otp"]
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Columns: Text statements and keyword matches */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
            Language Threat Heuristics & Statements
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">NLP Engine Active</span>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {parsedStatements.map((stmt, idx) => (
            <div key={idx} className="glass-panel p-5 rounded-2xl border border-slate-900 bg-slate-950/40 relative">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Languages className="w-4 h-4 text-cyan-400" />
                  Language: {stmt.language}
                </span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                  stmt.threatLevel === "CRITICAL" ? "bg-rose-500/10 text-rose-450 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  THREAT: {stmt.threatLevel}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-900 mb-3 italic">
                &quot;{stmt.text}&quot;
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="text-slate-500 text-[10px] py-1">Flags matched:</span>
                {stmt.keywords.map((kw, i) => (
                  <span key={i} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Language break downs and risk dials */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Language percentages */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Languages className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
              Language Distribution
            </h4>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {analyzedLanguages.map((lang, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{lang.name}</span>
                  <span className="text-white font-bold">{lang.percentage}%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    style={{ width: `${lang.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NLP Heuristics info */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h4 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
              Explainable NLP Flags
            </h4>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-relaxed mb-4">
            The platform tokenizes profiles, bios, and posts, checking them against Indian cybercrime lexicon lists. It supports slang words (e.g. hawala, carding, mixer, otp).
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded w-max font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            Section 65B Compliant Telemetry
          </div>
        </div>

      </div>

    </div>
  );
}
