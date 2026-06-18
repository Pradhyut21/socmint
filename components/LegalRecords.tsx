"use client";

import React, { useState } from "react";
import { SuspectProfile, LegalRecord } from "../lib/types";
import { Scale, Newspaper, Building, CheckCircle2, ArrowUpRight, Search, Sparkles, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LegalRecordsProps {
  suspect: SuspectProfile;
}

export default function LegalRecords({ suspect }: LegalRecordsProps) {
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [aiSummarizing, setAiSummarizing] = useState<Record<string, boolean>>({});
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "Court Case":
        return <Scale className="w-4 h-4 text-rose-400" />;
      case "News":
        return <Newspaper className="w-4 h-4 text-sky-400" />;
      case "Company":
        return <Building className="w-4 h-4 text-emerald-400" />;
      default:
        return <Scale className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSourceBadgeColor = (type: string) => {
    switch (type) {
      case "Court Case": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "News": return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      case "Company": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default: return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const getCredibilityBadge = (score?: "HIGH" | "MEDIUM" | "LOW" | number) => {
    const level = score === undefined ? "LOW" : (typeof score === "number" ? (score >= 90 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW") : score);
    switch (level) {
      case "HIGH":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3" /> OFFICIAL REGISTRY
          </span>
        );
      case "MEDIUM":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded">
            VERIFIED PRESS
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-slate-400 bg-slate-500/15 border border-slate-600/20 px-2 py-0.5 rounded">
            PUBLIC ARCHIVE
          </span>
        );
    }
  };

  const handleAiSummarize = async (record: LegalRecord) => {
    if (aiSummaries[record.id]) return;

    setAiSummarizing((prev) => ({ ...prev, [record.id]: true }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Summarize this legal/public record for an investigating officer. State what is confirmed and what must be verified at the original source: ${JSON.stringify(record)}`,
          profile: suspect,
          stream: false,
        }),
      });
      const data = await response.json();
      setAiSummaries((prev) => ({ ...prev, [record.id]: data.answer || data.error || "No AI summary returned." }));
    } catch {
      setAiSummaries((prev) => ({ ...prev, [record.id]: "AI summary route unavailable. Open the original public source link for verification." }));
    } finally {
      setAiSummarizing((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Records List */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
            Discovered Legal & Public Filings ({(suspect.legalRecords || []).length})
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">Sources: eCourts, MCA21, News indices</span>
        </div>

        <div className="space-y-4">
          {(suspect.legalRecords || []).length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 font-mono">
              <Scale className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No public registry or legal records found for this profile.</p>
            </div>
          ) : (
            (suspect.legalRecords || []).map((rec) => (
              <div 
                key={rec.id}
                onClick={() => {
                  setActiveRecordId(rec.id);
                  handleAiSummarize(rec);
                }}
                className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeRecordId === rec.id 
                    ? "border-blue-500/50 bg-blue-950/10 shadow-lg"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${getSourceBadgeColor(rec.recordType || "Court Case")}`}>
                      {getSourceIcon(rec.recordType || "Court Case")}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">{rec.source}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{rec.date}</span>
                    </div>
                  </div>
                  {getCredibilityBadge(rec.credibilityScore)}
                </div>

                <h5 className="text-xs font-bold text-white mb-2 font-mono leading-snug">
                  {rec.title}
                </h5>

                <p className="text-[11px] text-slate-400 font-mono leading-relaxed line-clamp-2">
                  {rec.summary}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-900 flex flex-col gap-2 text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    {rec.status && (
                      <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        Status: {rec.status}
                      </span>
                    )}
                    <a 
                      href={rec.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:text-blue-400 flex items-center gap-0.5 ml-auto hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Original Registry <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <span className="text-[9px] text-slate-600 block border-t border-slate-900/50 pt-1">
                    Captured at {new Date(rec.capturedAt || suspect.capturedAt).toLocaleTimeString("en-IN")} IST from public source
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* News Articles Section — only shown if NewsAPI is configured */}
      {suspect.newsArticles && suspect.newsArticles.length > 0 && (
        <div className="lg:col-span-2 mt-2">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
                Live News & Media Mentions ({suspect.newsArticles.length})
              </h4>
              <span className="text-[9px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded font-mono ml-auto">
                NewsAPI Live
              </span>
            </div>
            <div className="space-y-3">
              {suspect.newsArticles.map((article) => {
                const SentimentIcon = article.sentiment === "NEGATIVE" ? TrendingDown : article.sentiment === "POSITIVE" ? TrendingUp : Minus;
                const sentimentColor = article.sentiment === "NEGATIVE" ? "text-rose-400" : article.sentiment === "POSITIVE" ? "text-emerald-400" : "text-slate-400";
                return (
                  <div key={article.id} className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl flex items-start gap-3 hover:border-slate-700 transition-all">
                    <SentimentIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sentimentColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{article.source}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{article.publishedAt.slice(0, 10)}</span>
                      </div>
                      <a href={article.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-white hover:text-blue-400 transition-colors line-clamp-1 font-mono">
                        {article.title}
                      </a>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 font-mono leading-relaxed">{article.description}</p>
                    </div>
                    <a href={article.url} target="_blank" rel="noreferrer" className="flex-shrink-0 text-blue-500 hover:text-blue-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Right Column: AI Detail Reader & Synthesis */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 min-h-[300px] flex flex-col sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
              AI Record Synthesis
            </h4>
          </div>

          {activeRecordId ? (
            (() => {
              const activeRec = suspect.legalRecords.find(r => r.id === activeRecordId);
              if (!activeRec) return null;
              return (
                <div className="flex-1 flex flex-col">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono w-max mb-3 ${getSourceBadgeColor(activeRec.recordType || "Court Case")}`}>
                    {(activeRec.recordType || "Court Case").toUpperCase()}
                  </span>

                  <h5 className="text-xs font-bold text-white mb-3 font-mono leading-snug">
                    {activeRec.title}
                  </h5>

                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-6">
                    {activeRec.summary}
                  </p>

                  <div className="mt-auto border-t border-slate-900 pt-6">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono text-blue-400 mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Synthesized Briefing:</span>
                    </div>

                    {aiSummarizing[activeRec.id] ? (
                      <div className="space-y-2 py-2">
                        <div className="h-3 bg-slate-950 border border-slate-900 rounded-md animate-pulse w-full"></div>
                        <div className="h-3 bg-slate-950 border border-slate-900 rounded-md animate-pulse w-5/6"></div>
                        <div className="h-3 bg-slate-950 border border-slate-900 rounded-md animate-pulse w-4/5"></div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-blue-300 leading-relaxed font-mono p-3 bg-blue-950/10 border border-blue-500/20 rounded-xl">
                        {aiSummaries[activeRec.id] || "Click record to synthesize details..."}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 font-mono">
              <Scale className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-xs text-slate-500">
                Select a discovered registry profile card on the left to activate AI summary briefing.
              </p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
