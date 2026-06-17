"use client";

import React, { useState } from "react";
import { SuspectProfile } from "../lib/types";
import { ShieldAlert, Terminal, Globe, AlertTriangle, Eye, Lock } from "lucide-react";

interface DarkWebMonitorProps {
  suspect: SuspectProfile;
}

export default function DarkWebMonitor({ suspect }: DarkWebMonitorProps) {
  // Generate mock pastes based on the query subject
  const pastes = [
    {
      id: "p1",
      platform: "Pastebin",
      title: `leak_${suspect.realName.toLowerCase().replace(/\s+/g, "_")}_creds.txt`,
      snippet: `email: ${suspect.emailAddress !== "Not provided" ? suspect.emailAddress : "shadowtrader99@proton.me"}\nhash: $2y$10$v7g9L8kXwz12... (bcrypt)\nip: 103.241.12.89\nusername: ${suspect.username}`,
      url: "https://pastebin.com/raw/u8a92kL1",
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toLocaleDateString("en-IN"),
      riskTag: "CREDENTIAL LEAK"
    },
    {
      id: "p2",
      platform: "Telegram DarkWeb channels",
      title: "OTC Hawala & Escrow bypass log",
      snippet: `[12:14:09] shadowtrader: need escrow bypass for BLR transaction\n[12:15:02] *user deleted u/shadow_trader_in*\n[12:16:30] admin: user log saved with hash signature`,
      url: "https://t.me/intel_leak_channel",
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toLocaleDateString("en-IN"),
      riskTag: "HAWALA / ESCROW BYPASS"
    },
    {
      id: "p3",
      platform: "Onion Forum (BreachForums)",
      title: "Karnataka Corporate KYC Database dump",
      snippet: `Exploit vector: MCA21 designation mismatch bypass. Company: V.R. Digital Logistics Pvt Ltd.\nTarget: ${suspect.realName}`,
      url: "http://breach4x7qwe.onion/thread/92801",
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toLocaleDateString("en-IN"),
      riskTag: "KYC CORRELATION"
    }
  ];

  const [activePaste, setActivePaste] = useState<any>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Pastes list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
            Live Dark-Web Threat Feed & Pastes
          </h4>
          <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded font-mono animate-pulse">
            Active Listener
          </span>
        </div>

        <div className="space-y-4">
          {pastes.map((paste) => (
            <div 
              key={paste.id}
              onClick={() => setActivePaste(paste)}
              className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                activePaste?.id === paste.id ? "border-rose-500/50 bg-rose-950/5" : "border-slate-800 hover:border-slate-750"
              }`}
            >
              {/* Indicator left */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500 glow-red"></div>

              <div className="flex justify-between items-start flex-wrap gap-2 mb-3 pl-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-rose-500/15 border border-rose-500/30 rounded text-rose-400">
                    <Terminal className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">{paste.platform}</span>
                    <span className="text-[9px] text-slate-500 font-mono">Date: {paste.postedAt}</span>
                  </div>
                </div>
                <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                  {paste.riskTag}
                </span>
              </div>

              <h5 className="text-xs font-bold text-white mb-2 font-mono pl-2">{paste.title}</h5>
              <p className="text-[10px] text-slate-500 font-mono truncate pl-2">Source: {paste.url}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Paste content details drawer */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-full flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                Raw Paste Inspector
              </h4>
            </div>

            {activePaste ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Target Source URL</span>
                  <a href={activePaste.url} target="_blank" rel="noreferrer" className="text-blue-400 font-semibold block mb-4 hover:underline break-all">
                    {activePaste.url} <Globe className="w-3.5 h-3.5 inline ml-0.5" />
                  </a>

                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Extracted Paste snippet</span>
                  <pre className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl text-[10px] text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {activePaste.snippet}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono text-xs">
                <AlertTriangle className="w-8 h-8 text-slate-700 mb-3 animate-pulse" />
                <p className="text-slate-500 leading-relaxed">
                  Click any paste record card on the left to inspect raw extracted logs and credential formats.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              <span>Evidence Authenticated</span>
            </div>
            <span>Section 65B compliant</span>
          </div>
        </div>
      </div>

    </div>
  );
}
