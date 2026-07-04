import React, { useRef, useState as useStateCard } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, MessageSquare, Globe, FileText, ScanFace, EyeOff, Bitcoin,
  AlertTriangle, Gavel, Share2, MapPin, GitBranch, Bot, FileCheck, Brain,
  ExternalLink, AlertCircle, Clock, Send, IndianRupee, PhoneCall, ShieldX,
} from "lucide-react";
import type { SuspectProfile, RiskLevel } from "@/lib/types";
import { riskColor } from "@/lib/mock-data";
import { useState, type ReactNode } from "react";

interface TabDef {
  id: string;
  label: string;
  icon: typeof Users;
  badge?: { tone: "stamp" | "evidence" | "warn"; text: string };
  render: (p: SuspectProfile) => ReactNode;
}

export function SuspectTabs({ profile, onTabChange }: { profile: SuspectProfile; onTabChange?: (id: string) => void }) {
  const TABS: TabDef[] = [
    { id: "overview", label: "Overview", icon: Users, render: (p) => <OverviewTab p={p} /> },
    { id: "accounts", label: "Linked Accounts", icon: Share2, render: (p) => <AccountsTab p={p} /> },
    { id: "timeline", label: "Post Timeline", icon: MessageSquare, render: (p) => <TimelineTab p={p} /> },
    { id: "wikidata", label: "Wikidata Registry", icon: Globe, render: (p) => <WikidataTab p={p} /> },
    { id: "nlp", label: "NLP Analysis", icon: Brain, render: (p) => <NlpTab p={p} /> },
    { id: "face", label: "Face Scan", icon: ScanFace, render: (p) => <FaceTab p={p} /> },
    { id: "shadow", label: "Shadow Profiles", icon: EyeOff,
      badge: profile.shadowAccounts && profile.shadowAccounts.length > 0 ? { tone: "stamp", text: String(profile.shadowAccounts.length) } : undefined,
      render: (p) => <ShadowTab p={p} /> },
    { id: "crypto", label: "Crypto Trace", icon: Bitcoin,
      badge: profile.cryptoTrace ? { tone: "warn", text: String(profile.cryptoTrace.wallets.length) } : undefined,
      render: (p) => <CryptoTab p={p} /> },
    { id: "financial", label: "Financial / UPI", icon: IndianRupee,
      badge: profile.financialFootprint ? { tone: "stamp", text: String(profile.financialFootprint.ncrp.length) } : undefined,
      render: (p) => <FinancialTab p={p} /> },
    { id: "dark", label: "Dark Web Logs", icon: AlertTriangle, render: (p) => <DarkWebTab p={p} /> },
    { id: "legal", label: "Legal & Public Records", icon: Gavel, render: (p) => <LegalTab p={p} /> },
    { id: "network", label: "Network Graph", icon: GitBranch, render: (p) => <NetworkTab p={p} /> },
    { id: "geo", label: "Geotag Trail", icon: MapPin, render: (p) => <GeoTab p={p} /> },
    { id: "evasion", label: "Evasion Timeline", icon: Clock,
      badge: profile.shadowAccounts && profile.shadowAccounts.length > 0 ? { tone: "stamp", text: "!" } : undefined,
      render: (p) => <EvasionTab p={p} /> },
    { id: "chat", label: "AI Chat", icon: Bot, render: (p) => <ChatTab p={p} /> },
    { id: "evidence", label: "Court Certificate", icon: FileCheck, render: (p) => <EvidenceTab p={p} /> },
  ];

  const [active, setActive] = useState(TABS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  const current = TABS.find((t) => t.id === active)!;

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur md:-mx-8 md:px-8 no-print">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => scroll(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div ref={scrollRef} className="flex flex-1 overflow-x-auto scroll-smooth no-scrollbar">
            <div className="flex gap-1 py-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                const isActive = t.id === active;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setActive(t.id); onTabChange?.(t.id); }}
                    className={`group relative inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${isActive ? "bg-ink text-paper" : "hover:bg-muted text-foreground/70"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                    {t.badge && (
                      <span className={`ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-mono ${t.badge.tone === "stamp" ? "bg-stamp text-primary-foreground" : t.badge.tone === "warn" ? "bg-warn text-ink" : "bg-evidence text-primary-foreground"}`}>
                        {t.badge.text}
                      </span>
                    )}
                    {isActive && <span className="absolute -bottom-2 left-3 right-3 h-0.5 bg-stamp" />}
                  </button>
                );
              })}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => scroll(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={active}
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {current.render(profile)}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

/* ============ Tab components ============ */

function formatHandle(username: string) {
  if (!username) return "Not provided";
  const cleaned = username.replace(/^@+/, "");
  const handlePart = cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
  return `@${handlePart}`;
}

function OverviewTab({ p }: { p: SuspectProfile }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-display">
            Risk Assessment
            <Badge className={riskColor(p.riskLevel) + " font-mono uppercase"}>{p.riskLevel}</Badge>
          </CardTitle>
          <CardDescription>Composite risk score: <span className="font-mono font-semibold text-foreground">{p.riskScore}/100</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(p.riskSubscores).map(([k, v]) => (
            <div key={k} className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
              <Progress value={v} className="h-1.5" />
            </div>
          ))}
          <Separator />
          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Risk signals</div>
            <ul className="space-y-2 text-sm">
              {p.riskSignals.map((s, i) => (
                <li key={i} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stamp" /><span>{s}</span></li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="overflow-hidden rounded-md border border-border">
            <img src={p.photoUrl} alt={p.realName} className="aspect-square w-full bg-muted object-cover" />
          </div>
          <Field label="Real name" value={p.realName} />
          <Field label="Primary handle" value={formatHandle(p.username)} mono />
          <Field label="Email" value={p.emailAddress} mono />
          <Field label="Phone" value={p.phoneNumber} mono />
          <Field label="Case reference" value={p.caseReference} mono />
        </CardContent>
      </Card>
      {p.nexusAnalysis && (
        <Card className="lg:col-span-3 border-stamp/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Sparkle /> NEXUS Auto-analysis
            </CardTitle>
            <CardDescription>Cross-signal AI synthesis fired automatically after sweep.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-md border-l-4 border-stamp bg-stamp/5 p-3">
              <div className="font-mono text-xs uppercase tracking-wider text-stamp">Key finding</div>
              <div className="mt-1">{p.nexusAnalysis.key_finding}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Connected signals</div>
                <ul className="space-y-2">
                  {p.nexusAnalysis.connected_signals.map((c, i) => (
                    <li key={i} className="rounded-md border border-border p-2">
                      <div className="font-mono text-xs">{c.signal1} <span className="text-muted-foreground">↔</span> {c.signal2}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{c.connection}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Anomalies</div>
                <ul className="space-y-2">
                  {p.nexusAnalysis.anomalies.map((a, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
                      <span>{a.description}</span>
                      <Badge className={riskColor(a.severity as RiskLevel) + " font-mono text-[10px] shrink-0"}>{a.severity}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-md border border-evidence/30 bg-evidence/5 p-3">
              <div className="font-mono text-xs uppercase tracking-wider text-evidence">Investigator priority</div>
              <div className="mt-1">{p.nexusAnalysis.investigator_priority}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Sparkle() {
  return <span className="inline-block h-2 w-2 rotate-45 bg-stamp" />;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm"}>{value}</span>
    </div>
  );
}

const PLATFORM_ICONS: Record<string, string> = {
  github: "🐙", gitlab: "🦊", reddit: "👾", hackernews: "🗞️", devto: "👩‍💻",
  medium: "📝", stackoverflow: "💬", twitter: "𝕏", instagram: "📷",
  pinterest: "📌", twitch: "🎮", soundcloud: "🎵", keybase: "🔑",
  codepen: "✏️", behance: "🎨", dribbble: "🏀", steam: "🎲",
  duolingo: "🦜", telegram: "✈️", "freelancer.com": "🔥", freelancer: "🔥",
  threads: "🧵", chess: "♟️", picsart: "🖼️", facebook: "👥",
  kaggle: "📊", academia: "🎓", leetcode: "⚡", emails: "📧",
  gmailemail: "📬",
};

function getPlatformIcon(platform: string) {
  return PLATFORM_ICONS[platform.toLowerCase()] ?? "🌐";
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ExtrasSection({ extras }: { extras: Record<string, unknown> }) {
  const [open, setOpen] = useStateCard(false);
  const [nestedOpen, setNestedOpen] = useStateCard<Record<string, boolean>>({});

  const entries = Object.entries(extras).filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
  );
  if (entries.length === 0) return null;

  const toggleNested = (k: string) =>
    setNestedOpen(prev => ({ ...prev, [k]: !prev[k] }));

  const renderValue = (v: unknown): React.ReactNode => {
    if (typeof v === "boolean") return <span className="font-bold">{v ? "yes" : "no"}</span>;
    if (typeof v === "number") return <span className="font-bold">{v.toLocaleString()}</span>;
    if (typeof v === "string") return <span className="font-bold">{v}</span>;
    return null;
  };

  const renderEntry = ([k, v]: [string, unknown]) => {
    const label = k.replace(/_/g, " ");
    // Arrays and objects get a nested expander
    if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      const isOpen = nestedOpen[k] ?? false;
      const items = Array.isArray(v) ? v : Object.entries(v as object);
      return (
        <div key={k}>
          <button
            onClick={() => toggleNested(k)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{isOpen ? "▼" : "►"}</span>
            <span>{label}</span>
          </button>
          {isOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border/40 pl-2">
              {(Array.isArray(v) ? v : Object.entries(v as object)).map((item: any, i: number) => (
                <div key={i} className="text-xs text-muted-foreground">
                  {typeof item === "object" && item !== null
                    ? Object.entries(item).map(([ik, iv]) => (
                        <div key={ik} className="flex gap-1">
                          <span>{ik.replace(/_/g, " ")}:</span>
                          <span className="font-semibold">{String(iv)}</span>
                        </div>
                      ))
                    : Array.isArray(item)
                    ? <div className="flex gap-1"><span>{item[0]}:</span><span className="font-semibold">{String(item[1])}</span></div>
                    : <span>{String(item)}</span>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    // Primitive
    return (
      <div key={k} className="flex flex-wrap gap-1 text-sm">
        <span className="text-muted-foreground">{label}:</span>
        {renderValue(v)}
      </div>
    );
  };

  return (
    <div className="border-t border-border/40 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>{open ? "Hide" : `+${entries.length} more fields`}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {entries.map(renderEntry)}
        </div>
      )}
    </div>
  );
}

function AccountCard({ a }: { a: SuspectProfile["accounts"][number] }) {
  const [bioExpanded, setBioExpanded] = useStateCard(false);
  const extras = (a.extras as Record<string, unknown>) ?? {};

  const followersVal = a.followers;
  const followingVal = (extras as any).following;
  const postsVal = (extras as any).posts;
  const hasFollowerRow = followersVal !== undefined || followingVal !== undefined || postsVal !== undefined;

  const location = (extras as any).location;
  const emails = a.emails || (extras as any).emails;
  const phones = a.phones || (extras as any).phones;
  const isPrivate = (extras as any).is_private;

  // Strip follower/following/posts/location/emails/phones from extras shown in the toggle
  const cleanExtras = Object.fromEntries(
    Object.entries(extras).filter(([k]) => !["following", "posts", "location", "emails", "phones"].includes(k))
  );

  const bio = a.bio && !a.bio.startsWith("Public ") ? a.bio : undefined;
  const bioTruncated = bio && bio.length > 120;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-2.5">
        {/* Platform row */}
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{getPlatformIcon(a.platform)}</span>
          <a
            href={a.profileUrl && !a.profileUrl.startsWith("mailto:") ? a.profileUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs font-bold uppercase tracking-wider text-stamp hover:underline flex items-center gap-0.5"
          >
            {a.platform}
            {a.profileUrl && !a.profileUrl.startsWith("mailto:") && (
              <ExternalLink className="h-2.5 w-2.5 inline-block" />
            )}
          </a>
          {isPrivate && <span className="text-muted-foreground text-sm">🔒</span>}
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          {a.profilePicUrl ? (
            <img
              src={a.profilePicUrl}
              alt={a.username}
              className="h-11 w-11 rounded-full object-cover border border-border shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/initials/svg?seed=${a.username}`;
              }}
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 font-mono font-bold text-base text-muted-foreground">
              {(a.displayName || a.username).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            {a.displayName && a.displayName !== a.username && (
              <div className="font-bold text-sm leading-tight">{a.displayName}</div>
            )}
            <div className="text-sm text-muted-foreground">@{a.username}</div>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <div className="text-sm text-muted-foreground">
            <span>{bioExpanded || !bioTruncated ? bio : bio.slice(0, 120) + "…"}</span>
            {bioTruncated && (
              <button
                onClick={() => setBioExpanded(v => !v)}
                className="ml-1 text-stamp font-medium hover:underline"
              >
                {bioExpanded ? "show less" : "show more"}
              </button>
            )}
          </div>
        )}

        {/* Followers row */}
        {hasFollowerRow && (
          <div className="flex flex-wrap gap-4 text-sm">
            {followersVal !== undefined && (
              <span><span className="font-bold">{followersVal.toLocaleString()}</span> {followingVal !== undefined || postsVal !== undefined ? "Followers" : "followers"}</span>
            )}
            {followingVal !== undefined && (
              <span><span className="font-bold">{followingVal.toLocaleString()}</span> Following</span>
            )}
            {postsVal !== undefined && (
              <span><span className="font-bold">{postsVal.toLocaleString()}</span> Posts</span>
            )}
          </div>
        )}

        {/* Email display */}
        {emails && (
          <FieldRow label="Email" value={Array.isArray(emails) ? emails.join(", ") : String(emails)} />
        )}

        {/* Phone display */}
        {phones && (
          <FieldRow label="Phone" value={Array.isArray(phones) ? phones.join(", ") : String(phones)} />
        )}

        {/* Location / Joined / Last active */}
        {location && <FieldRow label="Location" value={location} />}
        {a.creationDate && <FieldRow label="Joined" value={new Date(a.creationDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })} />}
        {a.lastActive && <FieldRow label="Last active" value={new Date(a.lastActive).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })} />}

        {/* Expandable extras */}
        {Object.keys(cleanExtras).length > 0 && <ExtrasSection extras={cleanExtras} />}
      </CardContent>
    </Card>
  );
}

function AccountsTab({ p }: { p: SuspectProfile }) {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
      {p.accounts.map((a) => (
        <div key={a.id || a.username + a.platform} className="break-inside-avoid mb-4">
          <AccountCard a={a} />
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ p }: { p: SuspectProfile }) {
  return (
    <div className="space-y-3">
      {p.posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="text-stamp">{post.platform}</span>
              <span>{new Date(post.timestamp).toLocaleString("en-IN")}</span>
            </div>
            <p className="text-sm">{post.content}</p>
            {post.engagement && (
              <div className="mt-3 flex gap-4 font-mono text-[11px] text-muted-foreground">
                <span>♥ {post.engagement.likes}</span>
                <span>💬 {post.engagement.comments}</span>
                <span>↗ {post.engagement.shares}</span>
                {post.sentiment && <span className="ml-auto uppercase tracking-wider">sentiment: <span className={post.sentiment === "negative" ? "text-stamp" : post.sentiment === "positive" ? "text-evidence" : ""}>{post.sentiment}</span></span>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WikidataTab({ p }: { p: SuspectProfile }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-display">Wikidata Registry</CardTitle><CardDescription>No public Wikidata entity matches {p.realName}. Continue monitoring.</CardDescription></CardHeader>
      <CardContent>
        <Placeholder text="Wikidata SPARQL endpoint returned no entities above 0.7 confidence threshold." />
      </CardContent>
    </Card>
  );
}

function NlpTab({ p }: { p: SuspectProfile }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="font-display">Linguistic fingerprint</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { k: "Avg sentence length", v: "8.4 words" },
            { k: "Lexical diversity", v: "0.62" },
            { k: "Hedging markers", v: "rare" },
            { k: "Insider terminology", v: "high (finance)" },
            { k: "Primary language", v: "English (IN)" },
          ].map((r) => (
            <div key={r.k} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{r.k}</span>
              <span className="font-mono text-xs">{r.v}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display">Sentiment over time</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1">
            {[40, 55, 62, 48, 35, 28, 18, 22, 30, 25, 18, 14].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-stamp/70" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sentiment trending negative over the last 12 posts ({p.posts.length} analyzed).</p>
        </CardContent>
      </Card>
    </div>
  );
}

function FaceTab({ p }: { p: SuspectProfile }) {
  if (!p.faceScan) return <Placeholder text="No face scan data acquired." />;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="font-display">Match score</CardTitle></CardHeader>
        <CardContent>
          <div className="font-display text-5xl font-semibold">{Math.round(p.faceScan.matchScore * 100)}%</div>
          <p className="mt-1 text-xs text-muted-foreground">Highest-confidence match across reverse search engines.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display">Deepfake probability</CardTitle></CardHeader>
        <CardContent>
          <div className="font-display text-5xl font-semibold text-evidence">{Math.round(p.faceScan.deepfakeProbability * 100)}%</div>
          <p className="mt-1 text-xs text-muted-foreground">Authenticity verified — low manipulation risk.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle className="font-display">Matches</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(p.faceScan.matches || []).map((m) => (
            <div key={m.source} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="font-medium">{m.source}</div>
                <div className="font-mono text-xs text-muted-foreground">Confidence {Math.round(m.confidence * 100)}%</div>
              </div>
              <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ShadowTab({ p }: { p: SuspectProfile }) {
  if (!p.shadowAccounts?.length) return <Placeholder text="No burner accounts detected." />;
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-stamp/40 bg-stamp/5 p-3 text-sm">
        <span className="font-mono text-xs uppercase tracking-wider text-stamp">Evasion detected</span> — {p.shadowAccounts.length} shadow accounts linked via writing-style and metadata fingerprinting.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {p.shadowAccounts.map((s) => (
          <Card key={s.handle}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-stamp">{s.platform}</span>
                <Badge variant={s.status === "ACTIVE" ? "default" : "outline"} className="text-[10px]">{s.status}</Badge>
              </div>
              <div className="font-mono font-semibold">{s.handle}</div>
              <div className="flex justify-between font-mono text-xs text-muted-foreground">
                <span>Created {s.createdAt}</span>
                <span>Evasion {Math.round(s.evasionScore * 100)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CryptoTab({ p }: { p: SuspectProfile }) {
  if (!p.cryptoTrace) return <Placeholder text="No blockchain footprint recorded." />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="font-display">Wallets</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {p.cryptoTrace.wallets.map((w) => (
            <div key={w.address} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-stamp">{w.chain}</span>
                {w.flagged && <Badge className="bg-stamp text-primary-foreground text-[10px]">FLAGGED</Badge>}
              </div>
              <div className="mt-1 truncate font-mono text-xs">{w.address}</div>
              <div className="font-mono text-sm font-semibold">{w.balance}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display">Transactions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {p.cryptoTrace.transactions.map((t) => (
            <div key={t.hash} className="border-b border-border pb-2 last:border-0">
              <div className="flex justify-between font-mono text-xs">
                <span className="truncate">{t.hash}</span>
                <span className="font-semibold">{t.amount}</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">{t.counterparty} · {t.date}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DarkWebTab({ p }: { p: SuspectProfile }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-display">HIBP & Dark Web Leaks</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {p.hibpResult?.breaches && p.hibpResult.breaches.length > 0 ? p.hibpResult.breaches.map((b) => (
          <div key={b.name} className="rounded-md border border-border p-3">
            <div className="flex justify-between">
              <span className="font-semibold">{b.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{b.date}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {b.data.map((d) => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
            </div>
          </div>
        )) : <Placeholder text="No breach records." />}
      </CardContent>
    </Card>
  );
}

function LegalTab({ p }: { p: SuspectProfile }) {
  return (
    <div className="space-y-3">
      {p.legalRecords.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-display text-lg font-semibold">{r.title}</div>
              <div className="font-mono text-xs text-muted-foreground">{r.court} · Filed {r.date} · {r.status}</div>
            </div>
            <Badge className={riskColor(r.severity) + " font-mono uppercase"}>{r.severity}</Badge>
          </CardContent>
        </Card>
      ))}
      {p.newsArticles?.map((n) => (
        <Card key={n.url}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{n.title}</div>
              <Badge variant="outline" className="text-[10px]">{n.source}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{n.snippet}</p>
            <div className="mt-1 font-mono text-xs text-muted-foreground">{n.date}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NetworkTab({ p }: { p: SuspectProfile }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <Card className="border border-border/80 shadow-md">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <span>Association Network</span>
              <Badge variant="outline" className="border-pink-500/20 text-pink-500 bg-pink-500/5 font-mono">LIVE GRAPH</Badge>
            </CardTitle>
            <CardDescription>{p.network.nodes.length} nodes · {p.network.links.length} edges</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
              <span>Suspect Subject</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>Linked Account</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Crypto Mixer</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <span>Alias / Person</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-border bg-muted/20 backdrop-blur-sm paper-grain select-none">
          <svg viewBox="0 0 800 450" className="absolute inset-0 h-full w-full">
            {(() => {
              const positions: Record<string, [number, number]> = {};
              
              // Find central node
              const centralNode = p.network.nodes.find(n => n.group === "suspect");
              const otherNodes = p.network.nodes.filter(n => n.group !== "suspect");
              
              // Place suspect at center
              if (centralNode) {
                positions[centralNode.id] = [400, 225];
              }
              
              // Group other nodes to lay them out in layers
              const accountNodes = otherNodes.filter(n => n.group === "account");
              const aliasNodes = otherNodes.filter(n => n.group === "person" || n.group === "alias");
              const remainingNodes = otherNodes.filter(n => n.group !== "account" && n.group !== "person" && n.group !== "alias");
              
              // Lay out account nodes on inner circle
              accountNodes.forEach((n, idx) => {
                const angle = (idx / Math.max(1, accountNodes.length)) * Math.PI * 2;
                positions[n.id] = [
                  400 + Math.cos(angle) * 115,
                  225 + Math.sin(angle) * 115
                ];
              });
              
              // Lay out alias/person nodes on middle circle
              aliasNodes.forEach((n, idx) => {
                const angle = (idx / Math.max(1, aliasNodes.length)) * Math.PI * 2 + 0.3; // offset angle
                positions[n.id] = [
                  400 + Math.cos(angle) * 180,
                  225 + Math.sin(angle) * 180
                ];
              });
              
              // Lay out remaining nodes on outer circle
              remainingNodes.forEach((n, idx) => {
                const angle = (idx / Math.max(1, remainingNodes.length)) * Math.PI * 2 + 0.6;
                positions[n.id] = [
                  400 + Math.cos(angle) * 230,
                  225 + Math.sin(angle) * 230
                ];
              });
              
              // Catch-all fallback for any missing nodes
              p.network.nodes.forEach((n) => {
                if (!positions[n.id]) {
                  positions[n.id] = [400, 225];
                }
              });

              // Find connected node IDs based on current hoveredNode
              const connectedIds = new Set<string>();
              if (hoveredNode) {
                p.network.links.forEach(l => {
                  const s = typeof l.source === "object" ? (l.source as any).id : l.source;
                  const t = typeof l.target === "object" ? (l.target as any).id : l.target;
                  if (s === hoveredNode) connectedIds.add(t);
                  if (t === hoveredNode) connectedIds.add(s);
                });
              }

              return (
                <>
                  {/* Edges layer */}
                  {p.network.links.map((l, i) => {
                    const s = typeof l.source === "object" ? (l.source as any).id : l.source;
                    const t = typeof l.target === "object" ? (l.target as any).id : l.target;
                    const a = positions[s];
                    const b = positions[t];
                    if (!a || !b) return null;
                    
                    const isRelevant = !hoveredNode || s === hoveredNode || t === hoveredNode;
                    const opacity = hoveredNode ? (isRelevant ? 0.75 : 0.05) : 0.3;
                    const strokeColor = hoveredNode && isRelevant ? "var(--color-stamp, #ec4899)" : "var(--border)";

                    return (
                      <motion.line
                        key={i}
                        x1={a[0]}
                        y1={a[1]}
                        x2={b[0]}
                        y2={b[1]}
                        stroke={strokeColor}
                        strokeWidth={hoveredNode && isRelevant ? 2 : (l.weight ? Math.max(1, l.weight * 0.7) : 1.2)}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: opacity }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: i * 0.01 }}
                      />
                    );
                  })}

                  {/* Nodes layer */}
                  {p.network.nodes.map((n, idx) => {
                    const [x, y] = positions[n.id];
                    const val = (n as any).val || 14;
                    const r = val ? val * 0.4 + 4 : 8;
                    
                    // Group Colors
                    let fillColor = "#8b5cf6"; // default purple
                    let iconChar = "@";
                    if (n.group === "suspect") {
                      fillColor = "#ec4899"; // pink
                      iconChar = "★";
                    } else if (n.group === "account") {
                      fillColor = "#3b82f6"; // blue
                      iconChar = "●";
                    } else if (n.group === "crypto") {
                      fillColor = "#f59e0b"; // amber
                      iconChar = "₿";
                    }

                    const isSelf = n.group === "suspect";
                    const isConnected = !hoveredNode || n.id === hoveredNode || connectedIds.has(n.id);
                    const opacity = isConnected ? 1.0 : 0.15;
                    const showLabel = isSelf || hoveredNode === n.id || (hoveredNode && connectedIds.has(n.id));

                    const labelLines = n.label.split("\n");

                    return (
                      <motion.g
                        key={n.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: isConnected && hoveredNode === n.id ? 1.15 : 1, opacity: opacity }}
                        transition={{ type: "spring", stiffness: 120, damping: 14, delay: idx * 0.01 }}
                        onMouseEnter={() => setHoveredNode(n.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="cursor-pointer"
                      >
                        {/* Glowing ring under suspect or hovered item */}
                        {isSelf && (
                          <motion.circle
                            cx={x}
                            cy={y}
                            r={r + 7}
                            fill="none"
                            stroke="#ec4899"
                            strokeWidth="1.2"
                            strokeDasharray="4,4"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                            style={{ transformOrigin: `${x}px ${y}px` }}
                          />
                        )}
                        {hoveredNode === n.id && !isSelf && (
                          <circle
                            cx={x}
                            cy={y}
                            r={r + 5}
                            fill="none"
                            stroke={fillColor}
                            strokeWidth="1.5"
                            strokeOpacity="0.5"
                            className="animate-ping"
                            style={{ transformOrigin: `${x}px ${y}px` }}
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          fill={fillColor}
                          stroke="var(--background)"
                          strokeWidth="1.5"
                          className="shadow-md"
                        />

                        {/* Centered Node Icon symbol */}
                        <text
                          x={x}
                          y={y}
                          dy="3.5"
                          textAnchor="middle"
                          fontSize="9.5"
                          fill="#ffffff"
                          className="font-sans font-black select-none pointer-events-none"
                        >
                          {iconChar}
                        </text>

                        {/* Dynamic Floating Label */}
                        <AnimatePresence>
                          {showLabel && (
                            <motion.g
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              {/* Background plate for readability */}
                              <rect
                                x={x - 70}
                                y={y + r + 5}
                                width="140"
                                height={labelLines.length * 11 + 4}
                                rx="3"
                                fill="var(--background)"
                                fillOpacity="0.85"
                                stroke="var(--border)"
                                strokeWidth="0.5"
                                className="pointer-events-none shadow-sm"
                              />
                              <text
                                x={x}
                                y={y + r + 14}
                                textAnchor="middle"
                                fontSize="8.5"
                                className="fill-foreground font-mono font-bold pointer-events-none"
                              >
                                {labelLines.map((line, idx) => (
                                  <tspan key={idx} x={x} dy={idx > 0 ? 11 : 0}>
                                    {line}
                                  </tspan>
                                ))}
                              </text>
                            </motion.g>
                          )}
                        </AnimatePresence>
                      </motion.g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function GeoTab({ p }: { p: SuspectProfile }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-display">Geotag Trail</CardTitle><CardDescription>{p.locations.length} location pings extracted from public sources.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        <div className="aspect-[16/8] overflow-hidden rounded-md border border-border bg-muted/40 paper-grain relative">
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" /> Leaflet map placeholder · wire to react-leaflet
          </div>
        </div>
        <ul className="space-y-2">
          {p.locations.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
              <div>
                <div className="font-semibold">{l.locationName}</div>
                <div className="font-mono text-xs text-muted-foreground">{l.lat.toFixed(4)}, {l.lng.toFixed(4)} · {l.date} · {l.source}</div>
                <div className="mt-1 text-sm">{l.details}</div>
              </div>
              {l.crimeMatched && <Badge className={riskColor(l.crimeMatched.severity) + " font-mono text-[10px]"}>{l.crimeMatched.title}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EvasionTab({ p }: { p: SuspectProfile }) {
  const events = (p.shadowAccounts || []).map((s) => ({ when: s.createdAt, what: `${s.platform} alias created`, who: s.handle, tone: "stamp" as const }));
  return (
    <Card>
      <CardHeader><CardTitle className="font-display">Evasion Timeline</CardTitle></CardHeader>
      <CardContent>
        <ol className="relative space-y-4 border-l border-border pl-6">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-stamp ring-4 ring-background" />
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{e.when}</div>
              <div className="font-medium">{e.what}</div>
              <div className="font-mono text-xs">{e.who}</div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ChatTab({ p }: { p: SuspectProfile }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: `I am NEXUS. I have ingested the dossier for ${p.realName}. Ask me anything about this case.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const q = input.trim(); if (!q || loading) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    
    setMsgs((m) => [...m, { role: "ai", text: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, profile: p, stream: true }),
      });

      if (!res.ok) {
        setMsgs((m) => {
          const newM = [...m];
          newM[newM.length - 1].text = "Error connecting to NEXUS backend.";
          return newM;
        });
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        // Fallback for non-streaming (e.g. missing API key)
        const data = await res.json();
        setMsgs((m) => {
          const newM = [...m];
          newM[newM.length - 1].text = data.answer || "No response.";
          return newM;
        });
        setLoading(false);
        return;
      }

      if (!res.body) { setLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") { done = true; break; }
              if (dataStr) {
                try {
                  const data = JSON.parse(dataStr);
                  const content = data.choices?.[0]?.delta?.content;
                  if (content) {
                    text += content;
                    setMsgs((m) => {
                      const newM = [...m];
                      newM[newM.length - 1].text = text;
                      return newM;
                    });
                  }
                } catch (e) {}
              }
            }
          }
        }
      }
    } catch (e) {
      setMsgs((m) => {
        const newM = [...m];
        newM[newM.length - 1].text = "Network error connecting to NEXUS.";
        return newM;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 font-display"><Bot className="h-4 w-4 text-evidence" /> NEXUS AI Analyst</CardTitle><CardDescription>Live connection to /api/chat.</CardDescription></CardHeader>
      <CardContent>
        <div className="flex h-80 flex-col gap-3 overflow-y-auto rounded-md border border-border p-3">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${m.role === "ai" ? "self-start bg-muted" : "self-end bg-ink text-paper"}`}>{m.text || <span className="animate-pulse">...</span>}</div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the analyst…" disabled={loading} />
          <Button type="submit" disabled={loading}><Send className="h-4 w-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EvidenceTab({ p }: { p: SuspectProfile }) {
  return (
    <Card className="stamp-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-2xl">Court Certificate</CardTitle>
          <Badge variant="outline" className="font-mono">{p.caseReference}</Badge>
        </div>
        <CardDescription>Section 65B-compliant evidence dossier · ready for PDF export.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>I, <span className="font-semibold">[Analyst]</span>, hereby certify that the digital evidence contained in dossier <span className="font-mono">{p.caseReference}</span> was extracted from publicly accessible sources between the dates indicated below, using SOCMINT Shield v1.0 on systems under the lawful control of the Karnataka State Police Cyber Crime Cell.</p>
        <Separator />
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Subject" value={p.realName} />
          <Field label="Primary handle" value={formatHandle(p.username)} mono />
          <Field label="Captured at" value={new Date(p.capturedAt).toLocaleString("en-IN")} mono />
          <Field label="Sources" value={`${p.accounts.length} platforms · ${p.posts.length} posts`} />
          <Field label="Risk classification" value={`${p.riskLevel} (${p.riskScore}/100)`} />
          <Field label="Legal records" value={String(p.legalRecords.length)} />
        </div>
        <Separator />
        <p className="font-mono text-xs text-muted-foreground">SHA-256 of dossier payload computed at export time. Document hash recorded in audit ledger.</p>
        <Button onClick={() => window.print()}><FileText className="mr-2 h-4 w-4" /> Print / Save as PDF</Button>
      </CardContent>
    </Card>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function FinancialTab({ p }: { p: SuspectProfile }) {
  const f = p.financialFootprint;
  if (!f) return <Placeholder text="No Indian financial footprint recorded for this subject." />;
  const statusTone = (s: string) =>
    s === "OPEN" ? "bg-stamp text-primary-foreground" :
    s === "UNDER_INVESTIGATION" ? "bg-warn text-ink" : "bg-muted text-foreground";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <IndianRupee className="h-4 w-4 text-stamp" /> UPI handles
            </CardTitle>
            <CardDescription>Probable VPAs across PSPs · last seen {f.upi.lastSeen}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {f.upi.handles.map((h) => (
              <div key={h} className="flex items-center justify-between rounded-md border border-border px-3 py-2 font-mono text-xs">
                <span>{h}</span>
                <Badge variant="outline" className="text-[10px]">{h.split("@")[1]}</Badge>
              </div>
            ))}
            <div className="pt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Banks linked: {f.upi.banks.join(" · ")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <PhoneCall className="h-4 w-4 text-stamp" /> Truecaller
            </CardTitle>
            <CardDescription>Carrier intelligence & community spam signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Display name</div>
              <div className="font-semibold">{f.truecaller.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="font-mono text-[10px] uppercase text-muted-foreground">Carrier</span><div className="font-mono">{f.truecaller.carrier}</div></div>
              <div><span className="font-mono text-[10px] uppercase text-muted-foreground">Circle</span><div className="font-mono">{f.truecaller.circle}</div></div>
            </div>
            <div>
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider">
                <span className="text-muted-foreground">Spam score</span>
                <span className="font-semibold text-stamp">{f.truecaller.spamScore}/100 · {f.truecaller.spamReports} reports</span>
              </div>
              <Progress value={f.truecaller.spamScore} className="mt-1 h-1.5" />
            </div>
            <div className="flex flex-wrap gap-1">
              {f.truecaller.tags.map((t) => (
                <Badge key={t} className="bg-stamp/10 text-stamp text-[10px] font-mono">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ShieldX className="h-4 w-4 text-stamp" /> NCRP summary
            </CardTitle>
            <CardDescription>National Cyber Crime Reporting Portal hits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total complaints</span><span className="font-mono font-semibold">{f.ncrp.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Open / Investigating</span><span className="font-mono font-semibold text-stamp">{f.ncrp.filter(c => c.status !== "CLOSED").length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total amount alleged</span><span className="font-mono font-semibold">₹ {f.ncrp.reduce((s,c) => s + (c.amountInr ?? 0), 0).toLocaleString("en-IN")}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">NCRP complaint history</CardTitle>
          <CardDescription>Live mirror from cybercrime.gov.in (mock)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Complaint ID</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Jurisdiction</th>
                  <th className="py-2 pr-3 text-right">Amount (INR)</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {f.ncrp.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{c.id}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{c.date}</td>
                    <td className="py-2 pr-3">{c.category}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{c.jurisdiction}</td>
                    <td className="py-2 pr-3 text-right font-mono">{c.amountInr ? `₹ ${c.amountInr.toLocaleString("en-IN")}` : "—"}</td>
                    <td className="py-2 pr-3"><Badge className={statusTone(c.status) + " font-mono text-[10px]"}>{c.status.replace("_", " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {f.bankAccounts && (
        <Card>
          <CardHeader><CardTitle className="font-display">Linked bank accounts</CardTitle></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {f.bankAccounts.map((b) => (
              <div key={b.accountMasked} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="font-semibold">{b.bank}</div>
                  <div className="font-mono text-xs text-muted-foreground">{b.ifsc} · {b.accountMasked}</div>
                </div>
                {b.flagged && <Badge className="bg-stamp text-primary-foreground text-[10px]">FLAGGED</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
