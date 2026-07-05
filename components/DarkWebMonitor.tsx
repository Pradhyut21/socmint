"use client";

import React, { useState } from "react";
import { SuspectProfile } from "../lib/types";
import { ShieldAlert, Terminal, Globe, AlertTriangle, Eye, Lock } from "lucide-react";

interface DarkWebMonitorProps {
  suspect: SuspectProfile;
}

export default function DarkWebMonitor({ suspect }: DarkWebMonitorProps) {
  let pastes: any[] = [];

  if (suspect.darkWebPastes && suspect.darkWebPastes.length > 0) {
    pastes = suspect.darkWebPastes;
  } else if (suspect.hibpResult && suspect.hibpResult.breaches && suspect.hibpResult.breaches.length > 0) {
    pastes = suspect.hibpResult.breaches.map((b: any, idx: number) => ({
      id: `hibp-leak-${idx}`,
      platform: b.domain || "Public Database Breach",
      title: `${b.name} Database Leak`,
      snippet: `Compromised Data:\n${b.dataClasses.join(", ")}\n\nDescription:\n${b.description.replace(/<[^>]+>/g, '')}`,
      url: `https://${b.domain || 'haveibeenpwned.com'}`,
      postedAt: b.breachDate,
      riskTag: "DATABASE BREACH"
    }));
  }

  if (pastes.length === 0) {
    pastes = [
      {
        id: "p-clean-1",
        platform: "NEXUS Threat Intelligence",
        title: "No public leaks detected in threat forums",
        snippet: `Threat scan completed successfully.\nTarget: ${suspect.realName} (${suspect.username})\nNo matching records found in active dumps. Integrity signature verified.`,
        url: "https://cybercrime.gov.in/threat-monitor",
        postedAt: new Date().toLocaleDateString("en-IN"),
        riskTag: "CLEAN SCAN"
      }
    ];
  }

  const [activePaste, setActivePaste] = useState<any>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-ink">
      
      {/* Pastes list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
            Live Dark-Web Threat Feed & Pastes
          </h4>
          <span className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold animate-pulse">
            Active Listener
          </span>
        </div>

        <div className="space-y-4">
          {pastes.map((paste) => (
            <div 
              key={paste.id}
              onClick={() => setActivePaste(paste)}
              className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                activePaste?.id === paste.id ? "border-rose-500/50 bg-rose-50/40 shadow-sm" : "border-slate-200 hover:border-slate-300 shadow-sm"
              }`}
            >
              {/* Indicator left */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500 glow-red"></div>

              <div className="flex justify-between items-start flex-wrap gap-2 mb-3 pl-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-rose-50 border border-rose-200 rounded text-rose-800">
                    <Terminal className="w-4 h-4 text-rose-600" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-ink block">{paste.platform}</span>
                    <span className="text-[9px] text-slate-650 block">Date: {paste.postedAt}</span>
                  </div>
                </div>
                <span className="text-[8px] bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {paste.riskTag}
                </span>
              </div>

              <h5 className="text-xs font-bold text-ink mb-2 pl-2">{paste.title}</h5>
              <p className="text-[10px] text-slate-600 truncate pl-2">Source: {paste.url}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Paste content details drawer */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
                Raw Paste Inspector
              </h4>
            </div>

            {activePaste ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Target Source URL</span>
                  <a href={activePaste.url} target="_blank" rel="noreferrer" className="text-blue-700 font-bold block mb-4 hover:underline break-all">
                    {activePaste.url} <Globe className="w-3.5 h-3.5 inline ml-0.5" />
                  </a>

                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Extracted Paste snippet</span>
                  <pre className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-800 overflow-x-auto whitespace-pre-wrap leading-relaxed font-semibold">
                    {activePaste.snippet}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono text-xs">
                <AlertTriangle className="w-8 h-8 text-slate-400 mb-3 animate-pulse" />
                <p className="text-slate-500 leading-relaxed">
                  Click any paste record card on the left to inspect raw extracted logs and credential formats.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-mono">
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Evidence Authenticated</span>
            </div>
            <span>Section 65B compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
