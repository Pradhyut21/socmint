"use client";

import React, { useState, useCallback } from "react";
import { Brain, RefreshCw, Info, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SuspectProfile, StylometryResult, StylometryPairResult } from "@/lib/types";

interface StylometryPanelProps {
  suspect: SuspectProfile;
}

const CONFIDENCE_COLORS: Record<StylometryPairResult["confidenceLabel"], string> = {
  exploratory: "bg-slate-100 text-slate-700 border-slate-300",
  weak: "bg-blue-100 text-blue-800 border-blue-300",
  moderate: "bg-amber-100 text-amber-800 border-amber-300",
  strong: "bg-orange-100 text-orange-900 border-orange-400",
};

const SIMILARITY_BAR_COLOR = (score: number) =>
  score >= 75 ? "bg-orange-500" :
  score >= 55 ? "bg-amber-500" :
  score >= 35 ? "bg-blue-500" : "bg-slate-400";

interface CorpusSource {
  id: string;
  label: string;
  text: string;
  platform: string;
}

export default function StylometryPanel({ suspect }: StylometryPanelProps) {
  const [result, setResult] = useState<StylometryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPair, setExpandedPair] = useState<number | null>(null);
  const [customSources, setCustomSources] = useState<CorpusSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("");
  const [newPlatform, setNewPlatform] = useState("");

  // Auto-build corpus from existing accounts/posts
  const autoCorporaPosts = suspect.posts.reduce<Record<string, string>>((acc, p) => {
    if (!p.content) return acc;
    const key = p.platform;
    acc[key] = ((acc[key] || "") + " " + p.content).trim().slice(0, 3000);
    return acc;
  }, {});

  const autoSources: CorpusSource[] = Object.entries(autoCorporaPosts)
    .filter(([, text]) => text.trim().length > 30)
    .map(([platform, text]) => ({
      id: `auto-${platform}`,
      label: `${platform.toUpperCase()} posts (${suspect.username.startsWith("@") ? suspect.username : "@" + suspect.username})`,
      text,
      platform,
    }))
    .slice(0, 6);

  const allSources = [...autoSources, ...customSources];

  const addCustomSource = () => {
    if (!newLabel.trim() || !newText.trim()) return;
    const source: CorpusSource = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      text: newText.trim(),
      platform: newPlatform.trim() || "unknown",
    };
    setCustomSources(prev => [...prev, source]);
    setNewLabel("");
    setNewText("");
    setNewPlatform("");
    setShowAddForm(false);
  };

  const removeSource = (id: string) => {
    setCustomSources(prev => prev.filter(s => s.id !== id));
  };

  const runAnalysis = useCallback(async () => {
    if (allSources.length < 2) {
      setError("Need at least 2 text sources for comparison.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("/api/stylometry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: allSources.map(s => ({ label: s.label, text: s.text, platform: s.platform })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Stylometry API error");
      }

      const data = await resp.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [allSources]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-l-4 border-l-violet-600 bg-violet-50/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Brain className="h-4 w-4 text-violet-600" />
            Linguistic Forensics — Stylometric Analysis
          </CardTitle>
          <CardDescription className="font-mono text-[10px]">
            Pairwise authorship-likelihood analysis based on vocabulary, punctuation, capitalization, emoji, and sentence-length patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Analyst caution */}
          <div className="flex gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-xs font-mono">
            <Info className="h-4 w-4 shrink-0 text-violet-700 mt-0.5" />
            <p className="text-violet-900 font-medium leading-relaxed">
              Stylometric results are SUPPORTING evidence only — NOT proof of common authorship. 
              "Strong" overlap still requires corroborating signals. A forensic linguist should 
              review before any official attribution is made.
            </p>
          </div>

          {/* Corpus overview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">
                Corpus Sources ({allSources.length})
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddForm(v => !v)}
              >
                + Add Source
              </Button>
            </div>

            <div className="space-y-2">
              {autoSources.map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-mono text-xs flex-1 text-slate-700 font-semibold">{s.label}</span>
                  <span className="font-mono text-[10px] text-slate-500">{s.text.trim().split(/\s+/).length} words</span>
                  <Badge variant="outline" className="text-[9px]">auto</Badge>
                </div>
              ))}
              {customSources.map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50/40 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="font-mono text-xs flex-1 text-slate-700 font-semibold">{s.label}</span>
                  <span className="font-mono text-[10px] text-slate-500">{s.text.trim().split(/\s+/).length} words</span>
                  <Badge variant="outline" className="text-[9px] border-violet-300 text-violet-700">manual</Badge>
                  <button
                    onClick={() => removeSource(s.id)}
                    className="text-[10px] text-red-500 hover:underline font-mono"
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add source form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="space-y-3 border border-violet-200 rounded-xl p-4 bg-violet-50/30">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-violet-800 font-bold">
                      Add external text source
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Source Label</Label>
                        <Input
                          value={newLabel}
                          onChange={e => setNewLabel(e.target.value)}
                          placeholder="e.g. Telegram @channel"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Platform</Label>
                        <Input
                          value={newPlatform}
                          onChange={e => setNewPlatform(e.target.value)}
                          placeholder="e.g. telegram"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">
                        Text Content (paste public posts, captions, comments)
                      </Label>
                      <Textarea
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        placeholder="Paste public text content here…"
                        className="text-xs font-mono h-24 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addCustomSource} disabled={!newLabel.trim() || !newText.trim()}>
                        Add to corpus
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Run button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={runAnalysis}
              disabled={loading || allSources.length < 2}
              className="gap-2"
            >
              {loading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analysing…</>
                : <><Brain className="h-3.5 w-3.5" /> Run Stylometric Analysis</>
              }
            </Button>
            {allSources.length < 2 && (
              <span className="text-xs text-slate-500 font-mono">Need at least 2 sources</span>
            )}
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Signature patterns */}
          {(result.signaturePatterns.repeatedPhrases.length > 0 ||
            result.signaturePatterns.emojiHabits.length > 0 ||
            result.signaturePatterns.transliterationPattern ||
            result.signaturePatterns.codeMixingPattern) && (
            <Card className="shadow-sm bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm text-ink">Cross-corpus Signature Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                {result.signaturePatterns.repeatedPhrases.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold mb-1.5">Repeated Phrases Across Sources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.signaturePatterns.repeatedPhrases.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 border border-violet-200 text-[10px] font-semibold">
                          "{p}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.signaturePatterns.emojiHabits.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold mb-1.5">Common Emoji Usage</div>
                    <div className="flex gap-2 text-xl">
                      {result.signaturePatterns.emojiHabits.map((e, i) => <span key={i}>{e}</span>)}
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                  {result.signaturePatterns.transliterationPattern && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Hindi/Regional Transliteration Detected</Badge>
                  )}
                  {result.signaturePatterns.codeMixingPattern && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">Code-Mixing Pattern (Hindi-English)</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pairwise comparisons */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-600 font-bold mb-3 px-1">
              Pairwise Comparison Results ({result.pairResults.length} pair{result.pairResults.length !== 1 ? "s" : ""})
            </div>
            <div className="space-y-3">
              {result.pairResults
                .sort((a, b) => b.similarity - a.similarity)
                .map((pair, idx) => {
                  const isExpanded = expandedPair === idx;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer border shadow-sm hover:shadow-md transition-shadow"
                        onClick={() => setExpandedPair(isExpanded ? null : idx)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-xs font-bold text-ink mb-1">
                                {pair.sourceA} <span className="text-slate-400">↔</span> {pair.sourceB}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${SIMILARITY_BAR_COLOR(pair.similarity)}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pair.similarity}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                  />
                                </div>
                                <span className="font-mono text-sm font-bold text-ink shrink-0">{pair.similarity}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={`${CONFIDENCE_COLORS[pair.confidenceLabel]} text-[10px] font-mono uppercase border`}>
                                {pair.confidenceLabel}
                              </Badge>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                                  <div className="grid gap-2 md:grid-cols-2 font-mono text-xs">
                                    {[
                                      { key: "vocabularyOverlap", label: "Vocabulary Overlap" },
                                      { key: "punctuationSimilarity", label: "Punctuation Pattern" },
                                      { key: "capitalisationPattern", label: "Capitalisation" },
                                      { key: "emojiUsageSimilarity", label: "Emoji Usage" },
                                      { key: "avgWordLength", label: "Word Length" },
                                      { key: "sentenceLengthSimilarity", label: "Sentence Length" },
                                    ].map(({ key, label }) => {
                                      const val = pair.features[key as keyof typeof pair.features];
                                      const numVal = typeof val === "number" ? val : 0;
                                      return (
                                        <div key={key} className="space-y-1">
                                          <div className="flex justify-between">
                                            <span className="text-slate-600 font-semibold">{label}</span>
                                            <span className="font-bold text-ink">{numVal}</span>
                                          </div>
                                          <Progress value={numVal} className="h-1" />
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {pair.features.repeatedPhrases.length > 0 && (
                                    <div>
                                      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Shared Phrases</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {pair.features.repeatedPhrases.map((p, i) => (
                                          <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">"{p}"</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
          </div>
        </div>
      )}
    </div>
  );
}
