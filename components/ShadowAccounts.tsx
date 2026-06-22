"use client";

import React, { useState } from "react";
import { SuspectProfile } from "../lib/types";
import { ShieldAlert, Info, UserCheck, AlertTriangle, ArrowUpRight, Lock, CheckCircle2 } from "lucide-react";
import { generateHandleVariants } from "../lib/analysis/shadowAccountProber";

interface ShadowAccountsProps {
  suspect: SuspectProfile;
}

export default function ShadowAccounts({ suspect }: ShadowAccountsProps) {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Fallback to empty if no shadow accounts
  const shadowAccounts = suspect.shadowAccounts || [];
  
  // Generate username variants based on suspect handle to show how prober works
  const handleVariants = generateHandleVariants(suspect.username);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
      
      {/* Shadow candidates list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
            Shadow & Burner Account Candidates ({shadowAccounts.length})
          </h4>
          <span className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded animate-pulse font-bold">
            BRS Engine Running
          </span>
        </div>

        {shadowAccounts.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-600 py-12">
            <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            No shadow or burner account candidates flagged above threshold in this sweep.
          </div>
        ) : (
          <div className="space-y-4">
            {shadowAccounts.map((acc, idx) => {
              const confidence = acc.overallConfidence || 0;
              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedAccount(acc)}
                  className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    selectedAccount?.handle === acc.handle ? "border-blue-500/50 bg-blue-50/40 shadow-sm" : "border-slate-200 hover:border-slate-350 shadow-sm"
                  }`}
                >
                  {/* Confidence bar color */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                    confidence >= 80 ? "bg-rose-500 glow-red" :
                    confidence >= 55 ? "bg-orange-500 glow-amber" : "bg-blue-500"
                  }`}></div>

                  <div className="flex justify-between items-start flex-wrap gap-2 mb-3 pl-2">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block uppercase">{acc.platform}</span>
                      <span className="text-xs text-blue-700 block font-bold">@{acc.handle}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      confidence >= 80 ? "bg-rose-50 border-rose-200 text-rose-800" :
                      confidence >= 55 ? "bg-orange-55 border-orange-200 text-orange-800" :
                      "bg-blue-50 border-blue-200 text-blue-800"
                    }`}>
                      {acc.confidenceLevel} — {confidence}% MATCH
                    </span>
                  </div>

                  <div className="pl-2 space-y-1.5 mt-2">
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full`}
                        style={{ 
                          width: `${confidence}%`,
                          backgroundColor: confidence >= 80 ? "#ef4444" : confidence >= 55 ? "#f97316" : "#3b82f6"
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium">Heuristics matching threshold score</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidate details panel */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Candidate Detail */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
                Similarity Breakdown
              </h4>
            </div>

            {selectedAccount ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Account Handle</span>
                  <span className="text-ink font-bold text-sm block mb-4">@{selectedAccount.handle}</span>

                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Similarity Ratings</span>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Handle Similarity</span>
                      <span className="text-ink font-bold">{selectedAccount.handleSimilarity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Bio Keywords Cross-Ref</span>
                      <span className="text-ink font-bold">{selectedAccount.bioCrossRef}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Avatar Image Match</span>
                      <span className="text-ink font-bold">{selectedAccount.avatarMatch}%</span>
                    </div>
                  </div>

                  <span className="text-slate-500 text-[10px] uppercase block mb-1">Matching Signals</span>
                  <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-700 leading-relaxed font-medium">
                    {selectedAccount.signals.map((sig: string, i: number) => <li key={i}>{sig}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono text-xs">
                <AlertTriangle className="w-8 h-8 text-slate-400 mb-3 animate-pulse" />
                <p className="text-slate-500 leading-relaxed">
                  Select a suspected shadow account card on the left to inspect detail metrics and variants.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-550 font-mono">
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-600">Vault Certified</span>
            </div>
            <span className="text-slate-600">Section 65B compliant</span>
          </div>
        </div>

        {/* Variants Generator box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-ink uppercase tracking-wider text-xs">Generated Search Handle Variants</span>
          </div>
          <p className="text-[10px] text-slate-700 leading-relaxed mb-4">
            The prober auto-generates Alt/Burner usernames to sweep other networks:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {handleVariants.slice(0, 15).map((v, idx) => (
              <span key={idx} className="bg-slate-50 border border-slate-200 text-[9px] text-slate-750 font-semibold px-2 py-0.5 rounded shadow-sm">
                @{v}
              </span>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
