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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-ink">
      
      {/* Left Columns: Text statements and keyword matches */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
            Language Threat Heuristics & Statements
          </h4>
          <span className="text-[10px] text-slate-600 font-semibold">NLP Engine Active</span>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {parsedStatements.map((stmt, idx) => (
            <div key={idx} className="glass-panel p-5 rounded-2xl border border-slate-200 bg-slate-50 relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-ink flex items-center gap-1">
                  <Languages className="w-4 h-4 text-cyan-600" />
                  Language: {stmt.language}
                </span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                  stmt.threatLevel === "CRITICAL" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-amber-55 border border-amber-200 text-amber-800"
                }`}>
                  THREAT: {stmt.threatLevel}
                </span>
              </div>

              <p className="text-ink font-semibold leading-relaxed bg-white p-3 rounded-xl border border-slate-200 mb-3 italic">
                &quot;{stmt.text}&quot;
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="text-slate-600 font-medium text-[10px] py-1">Flags matched:</span>
                {stmt.keywords.map((kw, i) => (
                  <span key={i} className="bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold">
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
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Languages className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Language Distribution
            </h4>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {analyzedLanguages.map((lang, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600">{lang.name}</span>
                  <span className="text-ink font-bold">{lang.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                    style={{ width: `${lang.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NLP Heuristics info */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Explainable NLP Flags
            </h4>
          </div>
          <p className="text-[10px] text-slate-700 leading-relaxed mb-4">
            The platform tokenizes profiles, bios, and posts, checking them against Indian cybercrime lexicon lists. It supports slang words (e.g. hawala, carding, mixer, otp).
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded w-max">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Section 65B Compliant Telemetry
          </div>
        </div>

      </div>

    </div>
  );
}
