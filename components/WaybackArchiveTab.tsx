"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Archive,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Diff,
} from "lucide-react";
import type { SuspectProfile } from "@/lib/types";
import type { WaybackArchiveResult, WaybackSnapshot } from "@/lib/fetchers/wayback";
import { WAYBACK_PLATFORM_PATTERNS } from "@/lib/fetchers/wayback";

// ── Platform selector options ─────────────────────────────────────────────────
const PLATFORMS = WAYBACK_PLATFORM_PATTERNS
  .filter((p, idx, arr) => arr.findIndex((q) => q.label === p.label) === idx) // dedupe by label
  .map((p) => ({ id: p.id, label: p.label }));

// ── Main component ─────────────────────────────────────────────────────────────
export default function WaybackArchiveTab({ suspect }: { suspect: SuspectProfile }) {
  const username = suspect.username.replace(/^@/, "");

  const [platform, setPlatform] = useState<string>("twitter");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<WaybackArchiveResult | null>(suspect.waybackArchive ?? null);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = { platform, maxSamples: 8 };
      if (customUrl.trim()) {
        body.url = customUrl.trim();
      } else {
        body.username = username;
      }

      const resp = await fetch("/api/wayback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data.result as WaybackArchiveResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive scan failed.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Archive className="w-4 h-4 text-violet-600" />
        <span className="font-bold text-sm text-ink uppercase tracking-wider">Wayback Machine Archive Trail</span>
        <Badge variant="outline" className="text-[8px] border-violet-200 text-violet-700 font-bold uppercase ml-1">
          archive.org CDX
        </Badge>
      </div>

      {/* ── Controls ── */}
      <Card className="border-violet-200 bg-violet-50/30 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
            Queries the Wayback Machine CDX API to retrieve all archived snapshots of a social-media
            profile, detect deleted content, and surface name/bio changes across time.
            <span className="ml-1 text-violet-700 font-bold">Data source: archive.org (public API only).</span>
          </p>

          <div className="flex flex-wrap gap-2 items-end">
            {/* Platform picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={scanning}
                className="text-[10px] font-mono font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-40"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Optional custom URL */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Override URL (optional)
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={`e.g. https://twitter.com/${username}`}
                disabled={scanning}
                className="text-[10px] font-mono bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-ink placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-40"
              />
            </div>

            <button
              onClick={runScan}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-violet-700 transition-colors disabled:opacity-40 shrink-0"
            >
              {scanning ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</>
              ) : (
                <><Archive className="w-3 h-3" /> Scan Archive</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[11px]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary bar */}
            <SummaryBar result={result} />

            {/* Name & Bio change logs */}
            {(result.nameChanges.length > 0 || result.bioChanges.length > 0) && (
              <ChangeLogs result={result} />
            )}

            {/* Snapshot timeline */}
            {result.sampledSnapshots.length > 0 && (
              <SnapshotTimeline snapshots={result.sampledSnapshots} />
            )}

            {/* Empty state */}
            {result.availabilityStatus === "NOT_FOUND" && (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <XCircle className="w-8 h-8" />
                <p className="text-[11px] font-semibold">No archived snapshots found for this profile.</p>
                <p className="text-[10px]">The Wayback Machine has no record of {result.targetUrl}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ result }: { result: WaybackArchiveResult }) {
  const statusColor =
    result.availabilityStatus === "FOUND"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : result.availabilityStatus === "NOT_FOUND"
      ? "bg-slate-50 text-slate-500 border-slate-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const StatusIcon =
    result.availabilityStatus === "FOUND" ? CheckCircle2 :
    result.availabilityStatus === "NOT_FOUND" ? XCircle : AlertTriangle;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Availability */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${statusColor}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {result.availabilityStatus === "FOUND" ? "Archived" :
             result.availabilityStatus === "NOT_FOUND" ? "Not Archived" : "Query Error"}
          </div>

          {/* Deleted flag */}
          {result.deletedContentFlag && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              ⚠ Deleted Live — Archive Only
            </div>
          )}

          {/* Snapshot count */}
          {result.totalSnapshots > 0 && (
            <span className="text-[10px] text-slate-600 font-semibold">
              <span className="font-bold text-ink">{result.totalSnapshots}</span> unique snapshots
            </span>
          )}

          {/* Date range */}
          {result.earliestDate && result.latestDate && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock className="w-3 h-3" />
              {result.earliestDate} → {result.latestDate}
            </span>
          )}

          {/* Change counts */}
          {result.nameChanges.length > 0 && (
            <Badge variant="outline" className="text-[8px] border-violet-200 text-violet-700 font-bold">
              {result.nameChanges.length} name change{result.nameChanges.length > 1 ? "s" : ""}
            </Badge>
          )}
          {result.bioChanges.length > 0 && (
            <Badge variant="outline" className="text-[8px] border-indigo-200 text-indigo-700 font-bold">
              {result.bioChanges.length} bio change{result.bioChanges.length > 1 ? "s" : ""}
            </Badge>
          )}

          {/* Most recent snapshot link */}
          {result.mostRecentSnapshotUrl && (
            <a
              href={result.mostRecentSnapshotUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] text-violet-600 font-bold hover:underline"
            >
              Latest snapshot <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        {/* Target URL */}
        <div className="mt-2 text-[9px] text-slate-400 font-mono truncate">
          {result.targetUrl}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Change logs ───────────────────────────────────────────────────────────────
function ChangeLogs({ result }: { result: WaybackArchiveResult }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {result.nameChanges.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-display font-bold text-violet-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Diff className="w-3.5 h-3.5" /> Name / Title Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {result.nameChanges.map((c, i) => (
              <div key={i} className="rounded-lg border border-violet-100 bg-white p-2 space-y-1">
                <div className="text-[9px] text-slate-400">{c.date}</div>
                <div className="text-[10px] text-red-600 line-through font-mono">{c.from.slice(0, 80)}</div>
                <div className="text-[10px] text-emerald-700 font-mono font-semibold">→ {c.to.slice(0, 80)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result.bioChanges.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-display font-bold text-indigo-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Diff className="w-3.5 h-3.5" /> Bio / Description Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            {result.bioChanges.map((c, i) => (
              <div key={i} className="rounded-lg border border-indigo-100 bg-white p-2 space-y-1">
                <div className="text-[9px] text-slate-400">{c.date}</div>
                <div className="text-[10px] text-red-600 line-through font-sans leading-relaxed">{c.from}</div>
                <div className="text-[10px] text-emerald-700 font-sans leading-relaxed font-semibold">→ {c.to}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Snapshot timeline ─────────────────────────────────────────────────────────
function SnapshotTimeline({ snapshots }: { snapshots: WaybackSnapshot[] }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-display font-bold text-ink flex items-center gap-1.5 uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-violet-600" />
          Snapshot Timeline ({snapshots.length} sampled)
        </CardTitle>
        <CardDescription className="text-[10px] font-mono text-slate-500">
          Ordered chronologically. Deduplicated by content hash via CDX digest.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
          {snapshots.map((snap, idx) => (
            <SnapshotCard key={`${snap.timestamp}-${idx}`} snap={snap} isLatest={idx === snapshots.length - 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Single snapshot card ──────────────────────────────────────────────────────
function SnapshotCard({ snap, isLatest }: { snap: WaybackSnapshot; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      {/* Timeline dot */}
      <div className={`absolute -left-[21px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm
        ${snap.isLikelyDeleted ? "bg-red-400" :
          snap.changeDetected ? "bg-violet-500" :
          isLatest ? "bg-emerald-500" : "bg-slate-300"}`}
      />

      <div className={`rounded-xl border p-3 space-y-2 transition-all
        ${snap.isLikelyDeleted ? "border-red-200 bg-red-50/40" :
          snap.changeDetected ? "border-violet-200 bg-violet-50/30" :
          "border-slate-200 bg-white shadow-sm"}`}
      >
        {/* Top row: date + badges */}
        <div className="flex flex-wrap items-center gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[10px] text-ink">{snap.date}</span>
            <span className="text-[9px] text-slate-400 font-mono">{snap.timestamp}</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {snap.isLikelyDeleted && (
              <Badge className="bg-red-100 text-red-700 border border-red-200 text-[8px] font-bold uppercase px-1.5">
                ⚠ Deleted
              </Badge>
            )}
            {snap.changeDetected && (
              <Badge className="bg-violet-100 text-violet-700 border border-violet-200 text-[8px] font-bold uppercase px-1.5">
                Changed
              </Badge>
            )}
            {isLatest && !snap.isLikelyDeleted && (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-bold uppercase px-1.5">
                Latest
              </Badge>
            )}
            <span className="text-[8px] text-slate-400 font-mono border border-slate-200 rounded px-1 py-0.5">
              {snap.statusCode}
            </span>
            <span className="text-[8px] text-slate-400 font-mono border border-slate-200 rounded px-1 py-0.5">
              {snap.mimeType.split(";")[0]}
            </span>
          </div>
        </div>

        {/* og:title */}
        {snap.ogTitle && (
          <div className="font-bold text-[11px] text-ink leading-snug">
            {snap.ogTitle.slice(0, 120)}
          </div>
        )}

        {/* og:description / bio */}
        {snap.ogDescription && (
          <p className="text-[10px] text-slate-600 font-sans leading-relaxed line-clamp-2">
            {snap.ogDescription.slice(0, 200)}
          </p>
        )}

        {/* og:image thumbnail */}
        {snap.ogImage && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={snap.ogImage}
              alt="Archived profile image"
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="text-[9px] text-slate-400 truncate font-mono">{snap.ogImage.slice(0, 60)}…</span>
          </div>
        )}

        {/* Expand/collapse for extra content */}
        {(snap.extractedContent.postText || snap.extractedContent.mediaLinks.length > 0 || snap.digest) && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[9px] text-violet-600 font-bold hover:text-violet-800 transition-colors"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {expanded ? "Hide details" : "Show extracted content"}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-1 border-t border-slate-100"
                >
                  {snap.extractedContent.postText && (
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Post Text</div>
                      <p className="text-[10px] text-slate-700 font-sans leading-relaxed bg-slate-50 rounded p-2">
                        {snap.extractedContent.postText}
                      </p>
                    </div>
                  )}

                  {snap.extractedContent.mediaLinks.length > 0 && (
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Media Links</div>
                      <div className="space-y-1">
                        {snap.extractedContent.mediaLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[9px] text-violet-600 hover:underline font-mono truncate"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            {link.slice(0, 70)}…
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {snap.digest && (
                    <div className="text-[9px] text-slate-400 font-mono">
                      Content digest: {snap.digest}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* View in Wayback link */}
        <div className="flex justify-end pt-1">
          <a
            href={snap.snapshotUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[9px] text-violet-600 font-bold hover:underline"
          >
            Open in Wayback <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
