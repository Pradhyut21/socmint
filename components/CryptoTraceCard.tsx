"use client";

import React, { useState } from "react";
import { SuspectProfile, CryptoTransaction } from "../lib/types";
import { Coins, ShieldAlert, ArrowUpRight, ArrowDownLeft, Lock, RefreshCw, Landmark } from "lucide-react";

interface CryptoTraceCardProps {
  suspect: SuspectProfile;
}

export default function CryptoTraceCard({ suspect }: CryptoTraceCardProps) {
  const [addressInput, setAddressInput] = useState("");
  const [tracing, setTracing] = useState(false);
  const [traceResult, setTraceResult] = useState<any>(suspect.cryptoTrace || null);

  const getCoinColor = (coin: string) => {
    switch (coin) {
      case "BTC": return "text-amber-500 bg-amber-500/10 border-amber-500/25";
      case "ETH": return "text-violet-400 bg-violet-400/10 border-violet-400/25";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/25";
    }
  };

  const runAddressTrace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setTracing(true);
    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: addressInput.trim(), type: "crypto" }),
      });
      const data = await response.json();
      if (data.profile?.cryptoTrace) {
        setTraceResult(data.profile.cryptoTrace);
      }
    } catch (err) {
      console.error("Crypto trace failed", err);
    } finally {
      setTracing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search Bar for Tracing */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-4">
          Initiate Cryptographic Address Audit
        </h4>
        <form onSubmit={runAddressTrace} className="flex gap-3">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Enter BTC, ETH, or LTC public address (e.g. 0x71C... or bc1q...)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-900 focus:border-blue-500/40 focus:ring-0 outline-none text-xs font-mono text-white placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={tracing}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 shadow-lg glow-blue transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tracing ? 'animate-spin' : ''}`} />
            Audit Address
          </button>
        </form>
        <div className="mt-3 text-[10px] text-slate-500 font-mono">
          Query suggestions: try adding keyword &quot;mix&quot; or &quot;shadow&quot; to test critical alerts and Tornado Cash logs.
        </div>
      </div>

      {traceResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-900">
                <div className={`p-2 rounded-lg ${getCoinColor(traceResult.coin)}`}>
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white font-mono uppercase">
                    {traceResult.coin} Ledger Target
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono break-all block">
                    {traceResult.address}
                  </span>
                </div>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-950">
                  <span className="text-slate-500">Wallet Balance</span>
                  <span className="text-white font-bold">{traceResult.balance} {traceResult.coin}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-950">
                  <span className="text-slate-500">Total Received</span>
                  <span className="text-slate-300">{traceResult.totalReceived} {traceResult.coin}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-950">
                  <span className="text-slate-500">Total Sent</span>
                  <span className="text-slate-300">{traceResult.totalSent} {traceResult.coin}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Risk Score</span>
                  <span className={`font-bold ${
                    traceResult.riskScore >= 75 ? "text-rose-500" :
                    traceResult.riskScore >= 50 ? "text-orange-500" : "text-emerald-500"
                  }`}>
                    {traceResult.riskScore} / 100 ({traceResult.riskLevel})
                  </span>
                </div>
              </div>

              {traceResult.associatedMixers.length > 0 && (
                <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 font-mono">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Mixer Association Flagged</span>
                  </div>
                  <p className="text-[10px] text-rose-300 font-mono leading-relaxed">
                    This address has interacted with mixing services: <strong className="text-white">{traceResult.associatedMixers.join(", ")}</strong>. Transactions are obfuscated.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transactions Panel */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-full flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-6">
                  Transaction Ledger ({traceResult.transactions.length})
                </h4>

                <div className="space-y-3 font-mono">
                  {traceResult.transactions.map((tx: CryptoTransaction, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.type === "INCOMING" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {tx.type === "INCOMING" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(tx.timestamp).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-white break-all block max-w-md truncate">
                            Hash: {tx.hash}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-bold block ${
                          tx.type === "INCOMING" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {tx.type === "INCOMING" ? "+" : "-"}{tx.amount} {traceResult.coin}
                        </span>
                        {tx.mixerFlag ? (
                          <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            MIXER: {tx.mixerName}
                          </span>
                        ) : (
                          <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Standard transfer
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Chain Analysis Cryptographically Signed</span>
                </div>
                <span>DPDP Act compliant</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center font-mono py-12">
          <Landmark className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            No active wallet trace exists for this dossier query. Enter a valid blockchain address above to initialize automated ledger analysis.
          </p>
        </div>
      )}

    </div>
  );
}
