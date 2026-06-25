"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FilePlus, Trash2, Pin, CheckCircle2, AlertTriangle, Clock,
  ExternalLink, Download, Camera, X, Info, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { SuspectProfile, IngestedPost, ContentRiskResult } from "@/lib/types";
import { getAllArtifacts, pinEvidence, removeArtifact, exportArtifactsAsJson } from "@/lib/evidence/evidenceCaptureService";
import type { EvidenceArtifact } from "@/lib/types";

interface ManualIngestPanelProps {
  suspect: SuspectProfile;
}

const PLATFORM_OPTIONS = [
  "instagram", "twitter", "x", "facebook", "telegram", "youtube",
  "tiktok", "whatsapp", "reddit", "linkedin", "koo", "sharechat",
  "youtube_shorts", "other",
];

export default function ManualIngestPanel({ suspect }: ManualIngestPanelProps) {
  const [artifacts, setArtifacts] = useState<EvidenceArtifact[]>([]);
  const [ingested, setIngested] = useState<IngestedPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("instagram");
  const [postUrl, setPostUrl] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [screenshotData, setScreenshotData] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [tags, setTags] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted artifacts on mount
  useEffect(() => {
    setArtifacts(getAllArtifacts().filter(a => a.caseReference === suspect.caseReference));
  }, [suspect.caseReference]);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshotData(ev.target?.result as string || "");
    reader.readAsDataURL(file);
  };

  const runContentRisk = async (text: string, plt: string, handle: string): Promise<ContentRiskResult | undefined> => {
    try {
      const resp = await fetch("/api/content-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ text, platform: plt, authorHandle: handle }],
          useNim: false,
        }),
      });
      if (!resp.ok) return undefined;
      const data = await resp.json();
      return data.results?.[0] || undefined;
    } catch {
      return undefined;
    }
  };

  const submitIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captionText.trim()) {
      toast.error("Caption / text content is required.");
      return;
    }

    setPinning(true);
    setAnalyzing(true);

    try {
      // Run content risk analysis
      const riskResult = await runContentRisk(captionText, platform, authorHandle);
      setAnalyzing(false);

      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);

      // Create IngestedPost record
      const post: IngestedPost = {
        id: `ingest-${Date.now()}`,
        caseTag: suspect.caseReference,
        platform,
        postUrl: postUrl.trim() || null,
        authorHandle: authorHandle.trim() || null,
        captionText: captionText.trim(),
        locationTag: locationTag.trim() || undefined,
        timestamp: timestamp || undefined,
        ingestedAt: new Date().toISOString(),
        screenshotDataUrl: screenshotData || undefined,
        contentRisk: riskResult,
        tags: tagList,
      };

      setIngested(prev => [post, ...prev]);

      // Pin as evidence artifact
      const artifact = await pinEvidence({
        caseReference: suspect.caseReference,
        sourcePlatform: platform,
        sourceUrl: postUrl.trim() || null,
        query: suspect.username,
        title: `Manual Ingest — ${platform.toUpperCase()} by ${authorHandle || "unknown"}`,
        textSnapshot: captionText.trim(),
        metadataSnapshot: {
          platform,
          postUrl: postUrl.trim() || null,
          authorHandle: authorHandle.trim() || null,
          locationTag: locationTag.trim() || null,
          timestamp: timestamp || null,
          contentRisk: riskResult,
        },
        screenshotPath: screenshotData || undefined,
        analystNotes: analystNotes.trim() || undefined,
        tags: tagList,
        provenance: "manual_ingest",
      });

      setArtifacts(prev => [artifact, ...prev]);

      toast.success("Evidence ingested", {
        description: `Pinned with SHA-256 integrity hash. Risk: ${riskResult?.riskLevel || "UNKNOWN"}`
      });

      // Reset form
      setPostUrl("");
      setAuthorHandle("");
      setCaptionText("");
      setLocationTag("");
      setTimestamp("");
      setScreenshotData("");
      setAnalystNotes("");
      setTags("");
      setShowForm(false);
    } catch (err) {
      toast.error("Ingest failed", { description: String(err) });
    } finally {
      setPinning(false);
      setAnalyzing(false);
    }
  };

  const handleRemove = (id: string) => {
    removeArtifact(id);
    setArtifacts(prev => prev.filter(a => a.id !== id));
    toast.info("Evidence artifact removed.");
  };

  const handleExport = () => {
    const json = exportArtifactsAsJson(suspect.caseReference);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${suspect.caseReference}-evidence.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Evidence package exported.");
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("SHA-256 hash copied.");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Pin className="h-4 w-4 text-emerald-600" />
            Manual Evidence Ingest
          </CardTitle>
          <CardDescription className="font-mono text-[10px]">
            Capture and pin public posts, screenshots, and captions as SHA-256 hashed evidence artifacts.
            Each record is logged to the chain-of-custody with analyst notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-center">
            <Button
              onClick={() => setShowForm(v => !v)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FilePlus className="h-4 w-4" />
              {showForm ? "Cancel" : "Ingest New Evidence"}
            </Button>
            {artifacts.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Package ({artifacts.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ingest form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-emerald-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-display">New Evidence Record</CardTitle>
                <CardDescription className="text-[10px] font-mono">
                  All fields compliant with Section 65B Indian Evidence Act 2000 evidence capture requirements.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitIngest} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Platform */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Platform *</Label>
                      <select
                        value={platform}
                        onChange={e => setPlatform(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white font-mono focus:outline-none focus:ring-2 focus:ring-stamp/40"
                      >
                        {PLATFORM_OPTIONS.map(p => (
                          <option key={p} value={p}>{p.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Author Handle */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Author Handle</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                        <Input
                          value={authorHandle}
                          onChange={e => setAuthorHandle(e.target.value)}
                          placeholder="handle"
                          className="pl-7 font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Post URL */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Public Post URL</Label>
                      <Input
                        value={postUrl}
                        onChange={e => setPostUrl(e.target.value)}
                        placeholder="https://..."
                        className="font-mono text-sm"
                        type="url"
                      />
                    </div>

                    {/* Caption */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Caption / Post Text *</Label>
                      <Textarea
                        value={captionText}
                        onChange={e => setCaptionText(e.target.value)}
                        placeholder="Paste the public caption, comment, or post text…"
                        className="font-mono text-sm h-28 resize-none"
                        required
                      />
                    </div>

                    {/* Location + timestamp */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Location Tag</Label>
                      <Input
                        value={locationTag}
                        onChange={e => setLocationTag(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Post Timestamp</Label>
                      <Input
                        value={timestamp}
                        onChange={e => setTimestamp(e.target.value)}
                        type="datetime-local"
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Evidence Tags (comma-separated)</Label>
                      <Input
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="e.g. scam, financial fraud, primary-evidence"
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Screenshot upload */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Screenshot</Label>
                      <input type="file" ref={fileInputRef} onChange={handleScreenshotUpload} accept="image/*" className="hidden" />
                      {screenshotData ? (
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <img src={screenshotData} alt="Screenshot" className="w-16 h-16 object-cover rounded border" />
                          <span className="text-xs text-emerald-700 font-mono font-semibold flex-1">Screenshot attached ✓</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setScreenshotData("")}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" className="h-10 gap-2 w-full font-mono text-xs" onClick={() => fileInputRef.current?.click()}>
                          <Camera className="h-4 w-4" />Upload Screenshot
                        </Button>
                      )}
                    </div>

                    {/* Analyst notes */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Analyst Notes</Label>
                      <Textarea
                        value={analystNotes}
                        onChange={e => setAnalystNotes(e.target.value)}
                        placeholder="Contextual observations for the record…"
                        className="font-mono text-sm h-16 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                      <Info className="h-3.5 w-3.5" />
                      Content risk will be auto-analyzed on ingest
                      {analyzing && " · Analyzing…"}
                    </div>
                    <Button type="submit" disabled={pinning || !captionText.trim()} className="gap-2">
                      {pinning ? <><CheckCircle2 className="h-4 w-4 animate-pulse" />Pinning…</> : <><Pin className="h-4 w-4" />Pin Evidence</>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence artifacts list */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-slate-600 font-bold mb-3 px-1">
          Pinned Evidence Artifacts ({artifacts.length})
        </div>

        {artifacts.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 bg-slate-50 font-mono">
            No evidence pinned yet. Use "Ingest New Evidence" to capture public posts.
          </div>
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact, idx) => {
              const post = ingested.find(p => p.evidenceId === artifact.id || p.ingestedAt === artifact.retrievedAt);
              const riskResult = (artifact.metadataSnapshot?.contentRisk as ContentRiskResult | undefined);
              const riskLevel = riskResult?.riskLevel || "LOW";
              const riskColors: Record<string, string> = {
                LOW: "border-emerald-200 bg-emerald-50/20",
                MEDIUM: "border-amber-200 bg-amber-50/20",
                HIGH: "border-orange-200 bg-orange-50/20",
                CRITICAL: "border-red-200 bg-red-50/20",
              };

              return (
                <motion.div
                  key={artifact.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className={`border shadow-sm ${riskColors[riskLevel] || ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Screenshot thumbnail */}
                        {artifact.screenshotPath && (
                          <img
                            src={artifact.screenshotPath}
                            alt="Evidence"
                            className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {artifact.sourcePlatform}
                            </span>
                            {riskLevel !== "LOW" && (
                              <Badge className={`text-[10px] font-mono border ${
                                riskLevel === "CRITICAL" ? "bg-red-100 text-red-800 border-red-300" :
                                riskLevel === "HIGH" ? "bg-orange-100 text-orange-800 border-orange-300" :
                                "bg-amber-100 text-amber-800 border-amber-300"
                              }`}>
                                ⚠ {riskLevel} RISK
                              </Badge>
                            )}
                            {artifact.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-[9px] font-mono">{tag}</Badge>
                            ))}
                          </div>

                          {/* Title */}
                          <div className="font-semibold text-sm text-ink font-mono mb-1 truncate">{artifact.title}</div>

                          {/* Text snapshot */}
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{artifact.textSnapshot}</p>

                          {/* Metadata row */}
                          <div className="flex items-center gap-4 mt-2 font-mono text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(artifact.retrievedAt).toLocaleString("en-IN")}
                            </span>
                            {artifact.sourceUrl && (
                              <a
                                href={artifact.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-700 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />Source
                              </a>
                            )}
                          </div>

                          {/* SHA-256 hash */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="font-mono text-[9px] text-slate-400 truncate flex-1">SHA-256: {artifact.sha256.slice(0, 24)}…</span>
                            <button
                              onClick={() => copyHash(artifact.sha256)}
                              className="text-[9px] font-mono text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Copy className="h-3 w-3" />Copy
                            </button>
                          </div>

                          {/* Analyst notes */}
                          {artifact.analystNotes && (
                            <div className="mt-2 text-[10px] font-mono text-slate-600 italic border-l-2 border-emerald-400 pl-2">
                              "{artifact.analystNotes}"
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemove(artifact.id)}
                          className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove evidence artifact"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
