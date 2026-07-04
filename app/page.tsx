"use client";

import { useRef, useState, useEffect } from "react";
import {
  Search, Loader2, Printer, FilePlus, ShieldAlert, Sparkles,
  AtSign, Phone, Mail, ScanFace, IdCard, SlidersHorizontal, X, AlertTriangle, User, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { storage } from "@/lib/storage";
import { riskColor } from "@/lib/mock-data";
import type { SuspectProfile, DossierQuery } from "@/lib/types";
import { SuspectTabs } from "@/components/suspect/SuspectTabs";
import { ShieldOrb, type OrbTheme } from "@/components/visual/ShieldOrb";
import { motion, AnimatePresence } from "framer-motion";

const SEARCH_TYPES = [
  { value: "username", label: "Username", icon: AtSign, placeholder: "shadowtrader99" },
  { value: "realName", label: "Real name", icon: IdCard, placeholder: "Vikram Rathore" },
  { value: "email", label: "Email", icon: Mail, placeholder: "name@protonmail.com" },
  { value: "phone", label: "Phone", icon: Phone, placeholder: "+91 98765 43210" },
  { value: "face", label: "Face scan", icon: ScanFace, placeholder: "image URL or base64" },
] as const;

const SWEEP_STAGES = [
  "Resolving identity across 14 OSINT sources…",
  "Sherlock · WhatsMyName · checking 412 platforms…",
  "Querying HIBP & Intelligence X breach corpus…",
  "Tracing UPI handles · Truecaller · NCRP registry…",
  "Walking on-chain — BTC, ETH, sanctions screening…",
  "Cross-checking MCA21, SEBI, court records…",
  "Compositing dossier · NEXUS auto-synthesis…",
];

const TAB_THEME: Record<string, OrbTheme> = {
  accounts: "social", timeline: "social", wikidata: "legal",
  nlp: "network", face: "face", shadow: "leaks", crypto: "crypto", financial: "financial",
  dark: "leaks", legal: "legal", network: "network", geo: "geo", evasion: "leaks",
  evidence: "evidence",
};

const RISK_THEME: Record<string, OrbTheme> = {
  LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
};

export default function InvestigatePage() {
  const [suspect, setSuspect] = useState<SuspectProfile | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [igSession, setIgSession] = useState("");
  const [igSessionInput, setIgSessionInput] = useState("");
  const headerRef = useRef<HTMLDivElement>(null);

  // Load stored Instagram session on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("ig_session_id") || "") : "";
    setIgSession(stored);
    setIgSessionInput(stored);
  }, []);

  const saveIgSession = () => {
    const trimmed = igSessionInput.trim();
    setIgSession(trimmed);
    localStorage.setItem("ig_session_id", trimmed);
    setSettingsOpen(false);
    toast.success(trimmed ? "Instagram session saved" : "Instagram session cleared", {
      description: trimmed ? "Live Instagram/Threads scraping is now enabled." : "Instagram session has been removed."
    });
  };

  const runSweep = async (dq: DossierQuery) => {
    setError(null);
    setLoading(true);
    setStage(0);
    const label = dq.username || dq.realName || dq.email || dq.phone || "face-image";
    storage.pushAudit("INVESTIGATE", label);

    // Cycle stages to simulate the 10-15s real sweep
    const stageTimer = setInterval(() => setStage((s) => Math.min(s + 1, SWEEP_STAGES.length - 1)), 800);

    try {
      // Determine if we need multi-field dossier or single field query
      let reqBody;
      const keys = Object.keys(dq).filter(k => dq[k as keyof DossierQuery]);
      const isDossierMode = keys.length > 1;
      
      if (isDossierMode) {
        reqBody = {
          type: "dossier",
          dossier: {
            usernames: dq.username ? [dq.username] : [],
            realName: dq.realName || "",
            email: dq.email || "",
            phone: dq.phone || "",
            faceData: dq.faceImage || ""
          }
        };
      } else {
        const activeKey = keys[0] || "username";
        const queryVal = dq[activeKey as keyof DossierQuery] || "";
        const queryType = 
          activeKey === "faceImage" ? "face" :
          activeKey === "email" ? "email" :
          activeKey === "phone" ? "phone" : "username";

        reqBody = {
          query: queryVal,
          type: queryType,
          instagramSessionId: igSession,
        };
      }

      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Investigation failed");
      }

      setApiResponse(data);
      const p = data.profile as SuspectProfile;
      setSuspect(p);
      storage.pushRecent(p);
      toast.success("Sweep complete", { description: `${p.realName} · ${p.riskLevel} · ${p.caseReference}` });
      setTimeout(() => headerRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      // Fire off background NEXUS Analysis
      fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: p }),
      })
      .then(res => res.json())
      .then(nexusData => {
        setSuspect(prev => prev ? { ...prev, nexusAnalysis: nexusData } : null);
      })
      .catch(() => {});

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown sweep error";
      setError(msg);
      toast.error("Sweep failed", { description: msg });
    } finally {
      clearInterval(stageTimer);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <SweepSkeleton stageText={SWEEP_STAGES[stage]} />
          </motion.div>
        ) : !suspect ? (
          <motion.div key="hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: "easeOut" }}>
            <SearchHero onSearch={runSweep} error={error} onDismissError={() => setError(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="dossier"
            ref={headerRef}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <SuspectHeader
              suspect={suspect}
              orbTheme={TAB_THEME[activeTab] ?? RISK_THEME[suspect.riskLevel] ?? "default"}
              onNew={() => { setSuspect(null); setError(null); setActiveTab("overview"); setApiResponse(null); }}
              onPrint={() => { storage.pushAudit("EXPORT_REPORT", suspect.caseReference); window.print(); }}
              onExportJson={() => {
                storage.pushAudit("EXPORT_JSON", suspect.caseReference);
                const exportData = apiResponse || {
                  title: `Investigation: ${suspect.realName}`,
                  generated_at: new Date().toISOString(),
                  summary: [
                    { label: "Query", value: suspect.username },
                    { label: "Type", value: "Exported dossier" }
                  ],
                  data: {
                    export_type: "identity_search",
                    query: suspect.username,
                    status: "completed",
                    results: suspect.accounts
                  }
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${suspect.caseReference}_dossier.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("JSON report exported");
              }}
            />
            <SuspectTabs profile={suspect} onTabChange={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchHero({
  onSearch, error, onDismissError,
}: {
  onSearch: (dq: DossierQuery) => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const [type, setType] = useState<(typeof SEARCH_TYPES)[number]["value"]>("username");
  const [query, setQuery] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [dossier, setDossier] = useState<DossierQuery>({
    username: "", realName: "", phone: "", email: "", faceImage: "",
  });
  const current = SEARCH_TYPES.find((s) => s.value === type)!;

  const submitSimple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const key = type === "face" ? "faceImage" : type;
    onSearch({ [key]: query.trim() } as DossierQuery);
  };

  const submitDossier = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: DossierQuery = Object.fromEntries(
      Object.entries(dossier).filter(([, v]) => v && v.trim().length > 0)
    );
    if (Object.keys(cleaned).length === 0) {
      toast.error("Empty dossier query", { description: "Fill at least one field before launching the sweep." });
      return;
    }
    onSearch(cleaned);
  };

  return (
    <div className="space-y-10">
      {/* Header band */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="classified-banner px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] flex items-center justify-between">
          <span>Restricted · For authorized auditors only · KSP Cyber Cell</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <Settings className="h-3 w-3" />
            Settings {igSession && <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 ml-1" title="Instagram live scraping active" />}
          </button>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-stamp/30 bg-stamp/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-stamp">
              <ShieldAlert className="h-3.5 w-3.5" />
              SOCMINT Sweep · public sources only
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
              Open a new<br />
              <span className="text-stamp">case file</span> on a suspect.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              SOCMINT Shield aggregates 14+ open-source signals — social handles, leaks, on-chain trails, UPI / Truecaller / NCRP, court records, face matches — into a single court-admissible dossier.
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <ShieldOrb className="h-56 w-56" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-md border-l-4 border-stamp bg-stamp/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-stamp" />
          <div className="flex-1">
            <div className="font-mono text-[11px] uppercase tracking-wider text-stamp">Sweep failed</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismissError}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Search form */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-4 w-4 text-evidence" /> Begin investigation
          </CardTitle>
          <Button variant={advanced ? "default" : "outline"} size="sm" onClick={() => setAdvanced((a) => !a)}>
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            {advanced ? "Quick search" : "Dossier mode"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {!advanced ? (
            <>
              <div className="flex flex-wrap gap-2">
                {SEARCH_TYPES.map((t, i) => {
                  const Icon = t.icon;
                  const active = type === t.value;
                  return (
                    <motion.button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-stamp bg-stamp text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </motion.button>
                  );
                })}
              </div>
              <form onSubmit={submitSimple} className="space-y-3">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Search · {current.label}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={current.placeholder}
                      className="h-12 pl-10 text-base"
                    />
                  </div>
                  <Button type="submit" disabled={!query.trim()} className="h-12 px-6">
                    Run sweep <FilePlus className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">All queries are logged to the audit ledger and visible to your supervising officer.</p>
              </form>
            </>
          ) : (
            <form onSubmit={submitDossier} className="space-y-4">
              <div className="rounded-md border border-evidence/30 bg-evidence/5 p-3 text-xs">
                <span className="font-mono uppercase tracking-wider text-evidence">Dossier mode</span> — supply any combination of identifiers. The sweep will fuse them into a single composite subject.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DossierField icon={AtSign} label="Username" placeholder="shadowtrader99" value={dossier.username || ""} onChange={(v) => setDossier({ ...dossier, username: v })} />
                <DossierField icon={IdCard} label="Real name" placeholder="Vikram Rathore" value={dossier.realName || ""} onChange={(v) => setDossier({ ...dossier, realName: v })} />
                <DossierField icon={Phone} label="Phone" placeholder="+91 98765 43210" value={dossier.phone || ""} onChange={(v) => setDossier({ ...dossier, phone: v })} mono />
                <DossierField icon={Mail} label="Email" placeholder="name@protonmail.com" value={dossier.email || ""} onChange={(v) => setDossier({ ...dossier, email: v })} mono />
                <DossierField icon={ScanFace} label="Face image (URL or base64)" placeholder="https://… or data:image/jpeg;base64,…" value={dossier.faceImage || ""} onChange={(v) => setDossier({ ...dossier, faceImage: v })} className="md:col-span-2" mono />
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">Composite sweeps consume more upstream quota — expect 10-15s runtime.</p>
                <Button type="submit" className="h-11 px-6">
                  Launch dossier sweep <FilePlus className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Capability strip */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { t: "14 OSINT sources", d: "Sherlock · WhatsMyName · HIBP · Chainalysis · MCA21 · GDELT · PimEyes · Truecaller · NCRP …" },
          { t: "Court-admissible dossier", d: "Every record carries provenance, hash, and IST timestamp." },
          { t: "Live API integration", d: "Fully connected to the robust Next.js /api/investigate backend engine." },
        ].map((c, i) => (
          <motion.div
            key={c.t}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
            className="rounded-md border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-stamp/30"
          >
            <div className="font-mono text-[11px] uppercase tracking-wider text-stamp">{c.t}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.d}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DossierField({
  icon: Icon, label, placeholder, value, onChange, mono, className,
}: {
  icon: typeof AtSign; label: string; placeholder: string;
  value: string; onChange: (v: string) => void; mono?: boolean; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-9 ${mono ? "font-mono text-sm" : ""}`}
        />
      </div>
    </div>
  );
}

function SweepSkeleton({ stageText }: { stageText: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="classified-banner px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em]">
          Sweep in progress · {new Date().toLocaleTimeString("en-IN")} IST
        </div>
        <div className="space-y-4 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Loader2 className="h-10 w-10 animate-spin text-stamp" />
              <ShieldAlert className="absolute inset-0 m-auto h-4 w-4 text-stamp" />
            </div>
            <div>
              <div className="font-display text-xl font-semibold">Running OSINT sweep…</div>
              <div className="font-mono text-xs text-muted-foreground">{stageText}</div>
            </div>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="scan-bar absolute inset-y-0 w-1/3 rounded-full bg-stamp/70" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SuspectHeader({ suspect, orbTheme, onNew, onPrint, onExportJson }: { suspect: SuspectProfile; orbTheme: OrbTheme; onNew: () => void; onPrint: () => void; onExportJson: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="classified-banner px-4 py-1 font-mono text-[10px] uppercase tracking-[0.3em]">
        Active dossier · {suspect.caseReference} · Captured {new Date(suspect.capturedAt).toLocaleString("en-IN")}
      </div>
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-md border-2 border-stamp/40 bg-muted">
            <img src={suspect.photoUrl} alt={suspect.realName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{suspect.realName}</h2>
              <Badge className={riskColor(suspect.riskLevel) + " font-mono text-[10px] uppercase tracking-wider"}>
                {suspect.riskLevel} · {suspect.riskScore}
              </Badge>
            </div>
            {(() => {
              let usernameDisplay = suspect.username;
              if (usernameDisplay) {
                usernameDisplay = usernameDisplay.replace(/^@+/, "");
                if (usernameDisplay.includes("@")) {
                  usernameDisplay = usernameDisplay.split("@")[0];
                }
                usernameDisplay = `@${usernameDisplay}`;
              }
              return (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {usernameDisplay && (
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                      <User className="h-3 w-3 text-muted-foreground/60" />
                      <span>{usernameDisplay}</span>
                    </div>
                  )}

                  {suspect.emailAddress && suspect.emailAddress !== "Not provided" && (
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                      <Mail className="h-3 w-3 text-muted-foreground/60" />
                      <span>{suspect.emailAddress}</span>
                    </div>
                  )}

                  {suspect.phoneNumber && suspect.phoneNumber !== "Not provided" && (
                    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                      <Phone className="h-3 w-3 text-muted-foreground/60" />
                      <span>{suspect.phoneNumber}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block h-20 w-20 shrink-0 no-print" title={`Theme: ${orbTheme}`}>
            <ShieldOrb className="h-20 w-20" theme={orbTheme} />
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" onClick={onNew}><Search className="mr-2 h-4 w-4" /> New search</Button>
            <Button variant="outline" onClick={onPrint}><Printer className="mr-2 h-4 w-4" /> Export PDF</Button>
            <Button onClick={onExportJson}><FilePlus className="mr-2 h-4 w-4" /> Export JSON</Button>
          </div>
        </div>
      </div>
      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-stamp" />
                <h2 className="font-semibold text-base">Scraping Settings</h2>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Instagram session */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Instagram Session Cookie</label>
                {igSession ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                    Live scraping active
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not configured</span>
                )}
              </div>
              <input
                id="ig-session-input"
                type="password"
                value={igSessionInput}
                onChange={e => setIgSessionInput(e.target.value)}
                placeholder="Paste your Instagram sessionid cookie value…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stamp/50"
              />
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">How to get your sessionid:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open <strong>instagram.com</strong> in your browser and log in</li>
                  <li>Press <strong>F12</strong> → Application → Cookies → www.instagram.com</li>
                  <li>Find <strong>sessionid</strong> and copy its value</li>
                  <li>Paste it above and click Save</li>
                </ol>
                <p className="mt-1 text-amber-400/80">Your cookie stays on this device only (localStorage). It is used solely for live Instagram/Threads profile lookups.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveIgSession}
                  className="flex-1 rounded-md bg-stamp px-4 py-2 text-sm font-medium text-white hover:bg-stamp/90 transition-colors"
                >
                  Save
                </button>
                {igSession && (
                  <button
                    onClick={() => { setIgSessionInput(""); setIgSession(""); localStorage.removeItem("ig_session_id"); setSettingsOpen(false); }}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
