"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface AccountResult {
  platform: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  profileUrl: string;
  profilePicUrl: string | null;
  followers: number;
  confidence: "CONFIRMED" | "PROBABLE" | "POSSIBLE";
  postCount: number;
}

interface PlatformState {
  status: "pending" | "FOUND" | "NOT_FOUND" | "ERROR";
  reason?: string;
  data?: AccountResult;
}

// ── Platforms we scan (same order as the SSE backend) ─────────────────────
const SCAN_PLATFORMS = [
  { id: "github",          label: "GitHub",          color: "text-slate-800 bg-slate-100 border-slate-200" },
  { id: "gitlab",          label: "GitLab",          color: "text-orange-755 bg-orange-50 border-orange-200" },
  { id: "reddit",          label: "Reddit",          color: "text-orange-700 bg-orange-50 border-orange-200" },
  { id: "hackernews",      label: "Hacker News",     color: "text-amber-800 bg-amber-50 border-amber-200" },
  { id: "devto",           label: "Dev.to",          color: "text-slate-900 bg-slate-100 border-slate-250" },
  { id: "youtube",         label: "YouTube",         color: "text-red-600 bg-red-50 border-red-200" },
  { id: "pinterest",       label: "Pinterest",       color: "text-rose-700 bg-rose-50 border-rose-200" },
  { id: "telegram",        label: "Telegram",        color: "text-sky-600 bg-sky-50 border-sky-200" },
  { id: "steam",           label: "Steam",           color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  { id: "linkedin",        label: "LinkedIn",        color: "text-blue-800 bg-blue-50 border-blue-205" },
  { id: "instagram",       label: "Instagram",       color: "text-pink-855 bg-pink-50 border-pink-250" },
  { id: "tumblr",          label: "Tumblr",          color: "text-indigo-900 bg-slate-100 border-slate-250" },
  { id: "twitter",         label: "X / Twitter",     color: "text-slate-850 bg-slate-50 border-slate-200" },
  { id: "facebook",        label: "Facebook",        color: "text-blue-700 bg-blue-50 border-blue-200" },
  { id: "tiktok",          label: "TikTok",          color: "text-slate-950 bg-slate-50 border-slate-300" },
  { id: "snapchat",        label: "Snapchat",        color: "text-yellow-600 bg-yellow-50 border-yellow-250" },
  { id: "soundcloud",      label: "SoundCloud",      color: "text-orange-600 bg-orange-50 border-orange-200" },
  { id: "medium",          label: "Medium",          color: "text-slate-900 bg-slate-50 border-slate-200" },
  { id: "quora",           label: "Quora",           color: "text-red-800 bg-red-50 border-red-250" },
  { id: "pastebin",        label: "Pastebin",        color: "text-slate-655 bg-slate-50 border-slate-200" },
  { id: "stackoverflow",   label: "Stack Overflow",  color: "text-orange-850 bg-orange-50 border-orange-200" },
  { id: "twitch",          label: "Twitch",          color: "text-purple-700 bg-purple-50 border-purple-200" },
  { id: "keybase",         label: "Keybase",         color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "codepen",         label: "CodePen",         color: "text-slate-900 bg-slate-50 border-slate-200" },
  { id: "behance",         label: "Behance",         color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "dribbble",        label: "Dribbble",        color: "text-pink-600 bg-pink-50 border-pink-200" },
  { id: "duolingo",        label: "Duolingo",        color: "text-green-600 bg-green-50 border-green-200" },
  { id: "freelancer",      label: "Freelancer",      color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { id: "leetcode",        label: "LeetCode",        color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { id: "threads",         label: "Threads",         color: "text-slate-900 bg-slate-50 border-slate-200" },
  { id: "chess",           label: "Chess",           color: "text-stone-700 bg-stone-50 border-stone-200" },
  { id: "picsart",         label: "Picsart",         color: "text-violet-650 bg-violet-50 border-violet-200" },
  { id: "kaggle",          label: "Kaggle",          color: "text-blue-550 bg-blue-50 border-blue-200" },
  { id: "academia",        label: "Academia",        color: "text-slate-700 bg-slate-50 border-slate-200" },
  { id: "appledevelopers", label: "Apple Devs",      color: "text-slate-800 bg-slate-50 border-slate-200" },
  { id: "smule",           label: "Smule",           color: "text-sky-700 bg-sky-50 border-sky-200" },
  { id: "quizlet",         label: "Quizlet",         color: "text-indigo-650 bg-indigo-50 border-indigo-200" },
];

const initialStates = (): Record<string, PlatformState> =>
  Object.fromEntries(SCAN_PLATFORMS.map((p) => [p.id, { status: "pending" }]));

// ── Component ───────────────────────────────────────────────────────────────
export default function LinkedAccountsStreamTab({ username }: { username: string }) {
  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>(initialStates());
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const startScan = (user: string) => {
    setPlatforms(initialStates());
    setDone(false);
    setError(null);
    setScanning(true);

    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(
      `/api/linked-accounts-stream?username=${encodeURIComponent(user)}`
    );
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "ping") return;

        if (msg.type === "done") {
          setScanning(false);
          setDone(true);
          es.close();
          return;
        }

        if (msg.type === "result") {
          setPlatforms((prev) => ({
            ...prev,
            [msg.platform]: {
              status: msg.status === "FOUND" ? "FOUND" : msg.status === "ERROR" ? "ERROR" : "NOT_FOUND",
              reason: msg.reason,
              data: msg.data,
            },
          }));
        }
      } catch {
        // Malformed event — ignore
      }
    };

    es.onerror = () => {
      setScanning(false);
      setError("Connection to scan endpoint lost. Please try again.");
      es.close();
    };
  };

  useEffect(() => {
    if (username) {
      startScan(username);
    }
    return () => {
      esRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const found = Object.values(platforms).filter((p) => p.status === "FOUND");
  const pending = Object.values(platforms).filter((p) => p.status === "pending");

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-600" />
          <span className="font-bold text-sm text-ink uppercase tracking-wider">
            Live Account Scan
          </span>
          {scanning && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              Scanning {pending.length} platforms…
            </span>
          )}
          {done && (
            <span className="text-[10px] text-emerald-600 font-bold">
              ✓ Complete — {found.length} account(s) found
            </span>
          )}
        </div>
        <button
          onClick={() => username && startScan(username)}
          disabled={scanning}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          {scanning ? "Scanning…" : "Re-scan"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {SCAN_PLATFORMS.map((plat) => {
          const state = platforms[plat.id];
          return (
            <PlatformCard
              key={plat.id}
              platform={plat}
              state={state}
            />
          );
        })}
      </div>

      {/* Found accounts detail cards */}
      <AnimatePresence>
        {found.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 pt-2"
          >
            <div className="font-bold text-[10px] uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1">
              Confirmed Accounts ({found.length})
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {found.map((p) => p.data && (
                <AccountDetailCard key={p.data.platform} account={p.data} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Platform status indicator card ─────────────────────────────────────────
function PlatformCard({
  platform,
  state,
}: {
  platform: { id: string; label: string; color: string };
  state: PlatformState;
}) {
  const isPending = state.status === "pending";
  const isFound   = state.status === "FOUND";
  const isError   = state.status === "ERROR";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 p-3 rounded-xl border font-mono text-xs transition-all
        ${isFound   ? "border-emerald-200 bg-emerald-50/60 shadow-sm"  : ""}
        ${isError   ? "border-red-105 bg-red-50/40"                    : ""}
        ${isPending ? "border-slate-100 bg-white animate-pulse"        : ""}
        ${!isFound && !isError && !isPending ? "border-slate-150 bg-slate-50/50" : ""}
      `}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isPending && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
        {isFound   && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {isError   && <AlertCircle  className="w-4 h-4 text-amber-500"   />}
        {!isPending && !isFound && !isError &&
          <XCircle className="w-4 h-4 text-slate-300" />}
      </div>

      {/* Platform label */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800">{platform.label}</div>
        {state.status === "FOUND" && state.data && (
          <div className="text-[10px] text-slate-500 truncate">
            @{state.data.username}
          </div>
        )}
        {state.status === "NOT_FOUND" && (
          <div className="text-[10px] text-slate-400">Not found</div>
        )}
        {state.status === "ERROR" && (
          <div className="text-[10px] text-amber-600 truncate max-w-[130px]" title={state.reason || "Probe error / blocked"}>
            {state.reason || "Probe error"}
          </div>
        )}
        {state.status === "pending" && (
          <div className="text-[10px] text-slate-300">Checking…</div>
        )}
      </div>

      {/* Badge */}
      <Badge
        variant="outline"
        className={`font-mono text-[8px] uppercase font-bold px-1.5 border ${platform.color} shrink-0`}
      >
        {platform.id}
      </Badge>
    </motion.div>
  );
}

// ── Rich detail card for found accounts ────────────────────────────────────
function AccountDetailCard({ account }: { account: AccountResult }) {
  const confidenceColor =
    account.confidence === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : account.confidence === "PROBABLE"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const confidenceRange =
    account.confidence === "CONFIRMED" ? "85–100%" : account.confidence === "PROBABLE" ? "70–84%" : "50–69%";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap border-b border-slate-100 pb-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-900">
              {account.platform}
            </span>
            <Badge variant="outline" className={`text-[8px] uppercase font-bold px-1.5 border ${confidenceColor}`}>
              {account.confidence} ({confidenceRange})
            </Badge>
          </div>


          {/* Avatar + Info side-by-side */}
          <div className="flex items-start gap-3 pt-1">
            {account.profilePicUrl && (
              <img
                src={account.profilePicUrl}
                alt={`${account.username}'s avatar`}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(account.username)}`;
                }}
              />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="font-bold text-[13px] text-ink truncate">
                @{account.username}
              </div>
              {account.displayName && account.displayName !== account.username && (
                <div className="text-[11px] text-slate-600 font-semibold truncate">{account.displayName}</div>
              )}
              {account.bio && (
                <p className="text-[10px] text-slate-655 leading-relaxed line-clamp-3 font-sans pt-0.5">
                  {account.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
            <div className="flex gap-2">
              <span>{account.followers.toLocaleString()} followers</span>
              {account.postCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{account.postCount} posts</span>
                </>
              )}
            </div>
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-700 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
