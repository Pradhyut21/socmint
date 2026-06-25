"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Shield, ChevronRight, RefreshCw, Zap, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SuspectProfile, ContentRiskResult } from "@/lib/types";

interface ContentRiskPanelProps {
  suspect: SuspectProfile;
}

const RISK_COLORS: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
};

const SCORE_GRADIENT: Record<string, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-600",
};

const DIMENSION_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  violence: { label: "Violence / Threats", icon: "⚔️", description: "Physical harm, assault, or credible threats" },
  harassment: { label: "Harassment / Targeting", icon: "🎯", description: "Stalking, doxing, or targeting a specific person" },
  scamFraud: { label: "Scam / Fraud", icon: "💳", description: "OTP scams, fake KYC, prize fraud, UPI manipulation" },
  mobilisation: { label: "Mobilisation / Incitement", icon: "📢", description: "Coordination for illegal gatherings or viral disinformation" },
  hateSpeech: { label: "Hate / Communal", icon: "☠️", description: "Communal violence, religious incitement, ethnic hate" },
};

function riskBarColor(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 50) return "bg-orange-500";
  if (score >= 25) return "bg-amber-500";
  return "bg-emerald-500";
}

function RiskScoreMeter({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-mono">
        <span className="text-slate-600 font-semibold">{label}</span>
        <span className={`font-bold ${score >= 50 ? "text-red-700" : score >= 25 ? "text-amber-700" : "text-emerald-700"}`}>
          {score}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${riskBarColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function ContentRiskPanel({ suspect }: ContentRiskPanelProps) {
  const [results, setResults] = useState<ContentRiskResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [useNim, setUseNim] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Collect flagged posts as the primary analysis targets
  const candidatePosts = suspect.posts
    .filter(p => p.content && p.content.trim().length > 10)
    .slice(0, 12);

  const runAnalysis = useCallback(async (nim: boolean) => {
    if (candidatePosts.length === 0) return;
    setLoading(true);
    setAnalyzed(false);

    try {
      const items = candidatePosts.map(p => ({
        text: p.content,
        platform: p.platform,
        authorHandle: suspect.username,
      }));

      const resp = await fetch("/api/content-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, useNim: nim }),
      });

      if (!resp.ok) throw new Error("Content risk API error");
      const data = await resp.json();
      setResults(data.results || []);
      setAnalyzed(true);
    } catch (err) {
      console.error("Content risk analysis failed:", err);
    } finally {
      setLoading(false);
    }
  }, [candidatePosts, suspect.username]);

  // Run basic analysis on first mount
  useEffect(() => {
    if (!analyzed && candidatePosts.length > 0) {
      runAnalysis(false);
    }
  }, []);  // eslint-disable-line

  const highRiskResults = results.filter(r => r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH");
  const topScore = results.length > 0 ? Math.max(...results.map(r => r.scores.overall)) : 0;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.scores.overall, 0) / results.length)
    : 0;

  if (candidatePosts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-250 p-8 text-center text-sm text-slate-600 bg-slate-50">
        <Shield className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <p className="font-semibold">No public post content to analyze.</p>
        <p className="text-xs text-slate-500 mt-1">Content risk analysis requires post data. Run a sweep first or use manual ingest.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <Card className="border-l-4 border-l-orange-500 bg-orange-50/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            Content Risk Analysis
          </CardTitle>
          <CardDescription className="font-mono text-[10px]">
            Automated triage of {candidatePosts.length} public posts · Heuristic keyword classifier
            {results.some(r => r.nimEnhanced) && " + NIM LLM Deep Analysis"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary metrics */}
          {analyzed && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <div className="font-mono text-2xl font-bold text-ink">{topScore}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600 mt-1">Peak Score</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <div className="font-mono text-2xl font-bold text-ink">{avgScore}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600 mt-1">Avg Score</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <div className={`font-mono text-2xl font-bold ${highRiskResults.length > 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {highRiskResults.length}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600 mt-1">HIGH/CRITICAL</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => runAnalysis(false)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {analyzed ? "Re-analyze" : "Analyze Posts"}
            </Button>
            <Button
              onClick={() => { setUseNim(true); runAnalysis(true); }}
              disabled={loading}
              size="sm"
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Zap className="h-3.5 w-3.5" />
              NIM Deep Analysis
            </Button>
          </div>

          {/* Analyst caution */}
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs font-mono">
            <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <p className="text-amber-900 font-medium leading-relaxed">
              ANALYST CAUTION: This tool provides automated keyword heuristics — not a legal determination.
              All HIGH/CRITICAL results require human review before any investigative action is taken.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results list */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12 text-slate-500 font-mono text-sm">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Analyzing {candidatePosts.length} public posts…
        </div>
      )}

      {!loading && analyzed && (
        <div className="space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-600 font-bold px-1">
            Individual post risk analysis
          </div>
          {results.map((result, idx) => {
            const post = candidatePosts[idx];
            if (!result) return null;
            const isSelected = selectedIdx === idx;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
              >
                <Card
                  className={`border shadow-sm cursor-pointer transition-all duration-150 ${
                    result.riskLevel === "CRITICAL" ? "border-red-300 bg-red-50/30" :
                    result.riskLevel === "HIGH" ? "border-orange-300 bg-orange-50/20" :
                    result.riskLevel === "MEDIUM" ? "border-amber-200 bg-amber-50/10" :
                    "border-slate-200 bg-white"
                  } ${isSelected ? "ring-2 ring-stamp" : ""}`}
                  onClick={() => setSelectedIdx(isSelected ? null : idx)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {post?.platform || "unknown"}
                          </span>
                          <Badge className={`${RISK_COLORS[result.riskLevel]} text-[10px] font-mono uppercase font-bold border`}>
                            {result.riskLevel}
                          </Badge>
                          {result.nimEnhanced && (
                            <Badge className="bg-violet-100 text-violet-800 border-violet-300 text-[10px] font-mono">
                              NIM enhanced
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 font-medium line-clamp-2">
                          {result.inputText}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className={`font-mono text-2xl font-bold ${
                          result.scores.overall >= 50 ? "text-red-700" :
                          result.scores.overall >= 25 ? "text-amber-700" : "text-emerald-700"
                        }`}>
                          {result.scores.overall}
                        </div>
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                            {/* Dimension breakdown */}
                            <div className="grid gap-3 md:grid-cols-2">
                              {Object.entries(DIMENSION_LABELS).map(([key, meta]) => {
                                const score = result.scores[key as keyof typeof result.scores];
                                if (typeof score !== "number") return null;
                                return (
                                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span>{meta.icon}</span>
                                      <span className="font-mono text-[10px] font-bold text-slate-700 uppercase tracking-wider">{meta.label}</span>
                                    </div>
                                    <RiskScoreMeter score={score} label="" />
                                    <p className="text-[10px] text-slate-500 mt-1 font-mono">{meta.description}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Triggering phrases */}
                            {result.triggeringPhrases.length > 0 && (
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold mb-2">Triggering Phrases</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.triggeringPhrases.map((phrase, i) => (
                                    <span key={i} className="font-mono text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 font-semibold">
                                      "{phrase}"
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                              <div className="font-mono text-[10px] font-bold text-blue-800 uppercase mb-1">Analysis</div>
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">{result.explanation}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
