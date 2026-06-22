"use client";

import React, { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Loader2, Printer, FilePlus, ShieldAlert, Sparkles,
  AtSign, Phone, Mail, ScanFace, IdCard, SlidersHorizontal, X, AlertTriangle,
  ArrowLeft, Clock, CheckCircle2, Lock, Camera, Coins, Shield, Plus,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { storage } from "@/lib/storage";
import { riskColor } from "@/lib/mock-data";
import type { SuspectProfile, DossierInput } from "@/lib/types";
import { SuspectTabs } from "@/components/suspect/SuspectTabs";

// Dynamically import WebGL ShieldOrb to prevent server-side compile errors
const ShieldOrb = dynamic(
  () => import("@/components/visual/ShieldOrb").then((mod) => mod.ShieldOrb),
  { ssr: false }
);

const SEARCH_TYPES = [
  { value: "username", label: "Username", icon: AtSign, placeholder: "shadowtrader99" },
  { value: "name", label: "Real name", icon: IdCard, placeholder: "Vikram Rathore" },
  { value: "email", label: "Email", icon: Mail, placeholder: "name@protonmail.com" },
  { value: "phone", label: "Phone", icon: Phone, placeholder: "+91 98765 43210" },
  { value: "face", label: "Face scan", icon: ScanFace, placeholder: "upload photo or use camera" },
  { value: "crypto", label: "Crypto wallet", icon: Coins, placeholder: "BTC, ETH, or LTC address" },
] as const;

const SWEEP_STAGES = [
  "Initializing SOCMINT Shield v2 Engine...",
  "Resolving identity across 20 OSINT sources...",
  "Querying Sherlock & WhatsMyName platform logs...",
  "Scanning HIBP & Intelligence X breach corpus...",
  "Tracing UPI footprints & Truecaller circle data...",
  "Analyzing blockchain ledger history (sanctions scan)...",
  "Checking MCA21 registrar and legal FIR sheets...",
  "Running facial matches and EXIF metadata scans...",
  "Compositing final case dossier & AI analysis...",
];

const TAB_THEME: Record<string, import("@/components/visual/ShieldOrb").OrbTheme> = {
  accounts: "social", timeline: "social", wikidata: "legal",
  nlp: "network", face: "face", shadow: "leaks", crypto: "crypto", financial: "financial",
  dark: "leaks", legal: "legal", network: "network", geo: "geo", evasion: "leaks",
  evidence: "evidence",
};

const RISK_THEME: Record<string, import("@/components/visual/ShieldOrb").OrbTheme> = {
  LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
};

export default function InvestigatePage() {
  const [suspect, setSuspect] = useState<SuspectProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Lifted Search Form States (so they are preserved when user clicks Modify query)
  const [advanced, setAdvanced] = useState(true);
  const [type, setType] = useState<(typeof SEARCH_TYPES)[number]["value"]>("username");
  const [query, setQuery] = useState("");
  const [dossierUsernames, setDossierUsernames] = useState<string[]>([""]);
  const [dossierRealName, setDossierRealName] = useState("");
  const [dossierEmail, setDossierEmail] = useState("");
  const [dossierPhone, setDossierPhone] = useState("");
  const [dossierFaceData, setDossierFaceData] = useState("");
  
  const searchParams = useSearchParams();
  const caseRef = searchParams.get("case");
  const headerRef = useRef<HTMLDivElement>(null);

  // Load a case if selected in Case Directory
  useEffect(() => {
    if (caseRef) {
      const recents = storage.getRecent();
      const match = recents.find(r => r.caseReference === caseRef);
      if (match) {
        setSuspect(match);
        setActiveTab("overview");
      }
    }
  }, [caseRef]);

  // Execute real API investigation
  const runSweep = async (queryVal: string, typeVal: string, dossier?: DossierInput) => {
    setError(null);
    setLoading(true);
    setStage(0);

    const label = typeVal === "dossier" && dossier 
      ? [dossier.usernames[0], dossier.realName, dossier.email].filter(Boolean).join(", ")
      : queryVal;
    storage.pushAudit("INVESTIGATE", label);

    // Cycle scanning stages
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, SWEEP_STAGES.length - 1));
    }, 1200);

    try {
      const requestBody: Record<string, any> = { query: queryVal, type: typeVal };
      if (typeVal === "dossier" && dossier) {
        requestBody.dossier = dossier;
      }

      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Investigation sweep failed.");
      }

      const profile = data.profile as SuspectProfile;
      setSuspect(profile);
      storage.pushRecent(profile);
      toast.success("OSINT Sweep complete", { 
        description: `${profile.realName} · ${profile.riskLevel} · ${profile.caseReference}` 
      });

      // Fire off background AI Nexus Analysis
      fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      })
        .then((res) => res.json())
        .then((nexusData) => {
          if (nexusData && !nexusData.error) {
            setSuspect((prev) => {
              if (!prev || prev.caseReference !== profile.caseReference) return prev;
              const updated = { ...prev, nexusAnalysis: nexusData };
              // Update in recent investigations
              const recents = storage.getRecent().map(r => r.caseReference === profile.caseReference ? updated : r);
              localStorage.setItem("socmint_recent_investigations", JSON.stringify(recents));
              return updated;
            });
            toast.info("AI NEXUS Analysis completed", {
              description: "Cross-signal findings fused to suspect dossier."
            });
          }
        })
        .catch(() => {});

      setTimeout(() => headerRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown sweep error";
      setError(msg);
      toast.error("Investigation sweep failed", { description: msg });
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
            <SearchForm 
              onSearch={runSweep} 
              error={error} 
              onDismissError={() => setError(null)}
              advanced={advanced}
              setAdvanced={setAdvanced}
              type={type}
              setType={setType}
              query={query}
              setQuery={setQuery}
              dossierUsernames={dossierUsernames}
              setDossierUsernames={setDossierUsernames}
              dossierRealName={dossierRealName}
              setDossierRealName={setDossierRealName}
              dossierEmail={dossierEmail}
              setDossierEmail={setDossierEmail}
              dossierPhone={dossierPhone}
              setDossierPhone={setDossierPhone}
              dossierFaceData={dossierFaceData}
              setDossierFaceData={setDossierFaceData}
            />
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
              onNew={() => { 
                setSuspect(null); 
                setError(null); 
                setActiveTab("overview"); 
                // Clear the form fields for a completely new search
                setQuery("");
                setDossierUsernames([""]);
                setDossierRealName("");
                setDossierEmail("");
                setDossierPhone("");
                setDossierFaceData("");
              }}
              onModify={() => { setSuspect(null); setError(null); }}
              onPrint={() => { storage.pushAudit("EXPORT_REPORT", suspect.caseReference); window.print(); }}
            />
            <SuspectTabs profile={suspect} onTabChange={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Search form wrapper supporting quick and full dossier inputs
function SearchForm({
  onSearch, error, onDismissError,
  advanced, setAdvanced,
  type, setType,
  query, setQuery,
  dossierUsernames, setDossierUsernames,
  dossierRealName, setDossierRealName,
  dossierEmail, setDossierEmail,
  dossierPhone, setDossierPhone,
  dossierFaceData, setDossierFaceData,
}: {
  onSearch: (query: string, type: string, dossier?: DossierInput) => void;
  error: string | null;
  onDismissError: () => void;
  advanced: boolean;
  setAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  type: (typeof SEARCH_TYPES)[number]["value"];
  setType: React.Dispatch<React.SetStateAction<(typeof SEARCH_TYPES)[number]["value"]>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  dossierUsernames: string[];
  setDossierUsernames: React.Dispatch<React.SetStateAction<string[]>>;
  dossierRealName: string;
  setDossierRealName: React.Dispatch<React.SetStateAction<string>>;
  dossierEmail: string;
  setDossierEmail: React.Dispatch<React.SetStateAction<string>>;
  dossierPhone: string;
  setDossierPhone: React.Dispatch<React.SetStateAction<string>>;
  dossierFaceData: string;
  setDossierFaceData: React.Dispatch<React.SetStateAction<string>>;
}) {

  // Face webcam state
  const [useCamera, setUseCamera] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Setup media streams
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 400, height: 400 }
      });
      setMediaStream(stream);
      setUseCamera(true);
      setDossierFaceData("");
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      alert("Unable to access webcam. Please upload an image file instead.");
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 400;
      canvas.height = videoRef.current.videoHeight || 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        if (advanced) {
          setDossierFaceData(dataUrl);
        } else {
          setQuery(dataUrl);
        }
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          if (advanced) {
            setDossierFaceData(dataUrl);
          } else {
            setQuery(dataUrl);
          }
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
    };
  }, [mediaStream]);

  const submitSimple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), type);
  };

  const submitDossier = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsernames = dossierUsernames
      .map(u => u.trim().replace(/^@/, ""))
      .filter(u => u.length > 0);

    const dossier: DossierInput = {
      usernames: cleanUsernames,
      realName: dossierRealName.trim(),
      email: dossierEmail.trim(),
      phone: dossierPhone.trim(),
      faceData: dossierFaceData,
    };

    const hasData = cleanUsernames.length > 0
      || dossier.realName.length > 0
      || dossier.email.length > 0
      || dossier.phone.length > 0
      || dossier.faceData.length > 0;

    if (!hasData) {
      toast.error("Empty query", { description: "Please supply at least one parameter to investigate." });
      return;
    }

    const primaryQuery = cleanUsernames[0] || dossier.realName || dossier.email || dossier.phone || "face-scan";
    onSearch(primaryQuery, "dossier", dossier);
  };

  const current = SEARCH_TYPES.find((s) => s.value === type)!;

  return (
    <div className="space-y-10">
      {/* Brand Header block */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="classified-banner px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em]">
          Restricted · For authorized auditors only · KSP Cyber Cell
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
              SOCMINT Shield aggregates 20+ open-source signals — social handles, leaks, on-chain trails, UPI / Truecaller / NCRP, court records, face matches — into a single court-admissible dossier.
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <ShieldOrb className="h-56 w-56 animate-float-3d" theme="default" />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-md border-l-4 border-stamp bg-stamp/5 p-4 animate-shake">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-stamp" />
          <div className="flex-1">
            <div className="font-mono text-[11px] uppercase tracking-wider text-stamp">Sweep failed</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismissError}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Forms Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-4 w-4 text-evidence animate-pulse" /> Begin investigation
          </CardTitle>
          <Button variant={advanced ? "default" : "outline"} size="sm" onClick={() => setAdvanced((a) => !a)}>
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            {advanced ? "Quick search" : "Dossier mode"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {!advanced ? (
            /* ═══════════ QUICK SCAN FORM ═══════════ */
            <>
              <div className="flex flex-wrap gap-2">
                {SEARCH_TYPES.map((t, i) => {
                  const Icon = t.icon;
                  const active = type === t.value;
                  return (
                    <motion.button
                      key={t.value}
                      type="button"
                      onClick={() => { setType(t.value); setQuery(""); stopCamera(); }}
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

              {type === "face" ? (
                /* Webcam Face scan sub-view */
                <div className="space-y-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  
                  {useCamera && (
                    <div className="flex flex-col items-center justify-center bg-background p-4 border border-border rounded-xl max-w-xs mx-auto">
                      <div className="relative w-40 h-40 bg-black rounded-lg overflow-hidden border border-stamp/30 mb-3">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute left-0 right-0 h-0.5 bg-evidence shadow-[0_0_10px_#0891b2] animate-bounce top-1/2"></div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={stopCamera}>Cancel</Button>
                        <Button type="button" size="sm" onClick={capturePhoto}>Capture</Button>
                      </div>
                    </div>
                  )}

                  {!useCamera && !query && (
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                      <Button type="button" variant="outline" className="h-20 flex flex-col gap-2 font-mono text-xs uppercase" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5 text-muted-foreground" /> Upload File
                      </Button>
                      <Button type="button" variant="outline" className="h-20 flex flex-col gap-2 font-mono text-xs uppercase" onClick={startCamera}>
                        <Camera className="h-5 w-5 text-muted-foreground" /> Camera Scan
                      </Button>
                    </div>
                  )}

                  {query && (
                    <div className="flex items-center gap-4 bg-muted/30 border border-border p-3 rounded-lg max-w-md mx-auto">
                      <img src={query} alt="Capture" className="w-12 h-12 rounded object-cover border border-border" />
                      <span className="text-xs text-evidence font-mono flex-1">Face photo captured ✓</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setQuery("")}><X className="h-4 w-4 text-muted-foreground" /></Button>
                    </div>
                  )}

                  {query && (
                    <div className="text-center pt-2">
                      <Button onClick={() => onSearch(query, "face")} className="h-11 px-6">
                        Run sweep <FilePlus className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Text Input */
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
                  <p className="text-xs text-muted-foreground">All queries are logged to the compliance audit ledger.</p>
                </form>
              )}
            </>
          ) : (
            /* ═══════════ DOSSIER COMPOSITE FORM ═══════════ */
            <form onSubmit={submitDossier} className="space-y-4">
              <div className="rounded-md border border-evidence/30 bg-evidence/5 p-3 text-xs">
                <span className="font-mono uppercase tracking-wider text-evidence">Dossier mode</span> — supply any combination of identifiers. The sweep will fuse them into a single composite subject.
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex justify-between">
                    <span>Usernames / Handles</span>
                    <button type="button" onClick={() => setDossierUsernames([...dossierUsernames, ""])} className="text-[10px] text-evidence hover:underline">
                      + Add another handle
                    </button>
                  </Label>
                  {dossierUsernames.map((user, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">@</span>
                        <Input
                          value={user}
                          onChange={(e) => {
                            const copy = [...dossierUsernames];
                            copy[idx] = e.target.value;
                            setDossierUsernames(copy);
                          }}
                          placeholder={idx === 0 ? "shadowtrader99" : `Handle ${idx + 1}...`}
                          className="pl-7"
                        />
                      </div>
                      {dossierUsernames.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setDossierUsernames(dossierUsernames.filter((_, i) => i !== idx))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Real Name</Label>
                  <Input value={dossierRealName} onChange={(e) => setDossierRealName(e.target.value)} placeholder="Vikram Rathore" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <Input value={dossierPhone} onChange={(e) => setDossierPhone(e.target.value)} placeholder="+91 98765 43210" className="font-mono" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <Input value={dossierEmail} onChange={(e) => setDossierEmail(e.target.value)} placeholder="name@protonmail.com" className="font-mono" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Face Photo Reference</Label>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  
                  {useCamera && (
                    <div className="flex flex-col items-center justify-center bg-background p-4 border border-border rounded-xl max-w-xs mx-auto">
                      <div className="relative w-40 h-40 bg-black rounded-lg overflow-hidden border border-stamp/30 mb-3">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute left-0 right-0 h-0.5 bg-evidence shadow-[0_0_10px_#0891b2] animate-bounce top-1/2"></div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={stopCamera}>Cancel</Button>
                        <Button type="button" size="sm" onClick={capturePhoto}>Capture</Button>
                      </div>
                    </div>
                  )}

                  {!useCamera && !dossierFaceData && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant="outline" className="h-12 flex gap-2 font-mono text-xs uppercase" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4" /> Upload File
                      </Button>
                      <Button type="button" variant="outline" className="h-12 flex gap-2 font-mono text-xs uppercase" onClick={startCamera}>
                        <Camera className="h-4 w-4" /> Camera Capture
                      </Button>
                    </div>
                  )}

                  {dossierFaceData && (
                    <div className="flex items-center gap-4 bg-muted/30 border border-border p-3 rounded-lg">
                      <img src={dossierFaceData} alt="Capture" className="w-12 h-12 rounded object-cover border border-border" />
                      <span className="text-xs text-evidence font-mono flex-1">Face photo attached ✓</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDossierFaceData("")}><X className="h-4 w-4 text-muted-foreground" /></Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground">Fusing multiple handles runs parallel sweeps - runtime is 10-15s.</p>
                <Button type="submit" className="h-11 px-6">
                  Launch dossier sweep <FilePlus className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Capabilities Footer */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { t: "20 OSINT sources", d: "GitHub · Reddit · HackerNews · Dev.to · GitLab · HIBP · Chainalysis · MCA21 · IndiaKanoon …" },
          { t: "Court-admissible dossier", d: "Every record carries provenance hash, capture timestamp, and Section 65B compliance." },
          { t: "Authorized policing cell", d: "Designed exclusively for cybersecurity cells. Action footprint logged securely." },
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

      {/* Demo shortcuts */}
      <div className="rounded-lg border border-dashed border-border p-5 text-center bg-card/40">
        <div className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-3">Tactical OSINT Demo Presets</div>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" className="border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 font-mono" onClick={() => onSearch("shadowtrader99", "username")}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse mr-1"></span> shadowtrader99
          </Button>
          <Button variant="outline" size="sm" className="border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 font-mono" onClick={() => onSearch("sneha_fintech", "username")}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1"></span> sneha_fintech
          </Button>
        </div>
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
              <div className="font-mono text-xs text-muted-foreground animate-pulse">{stageText}</div>
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

function SuspectHeader({
  suspect, orbTheme, onNew, onModify, onPrint
}: {
  suspect: SuspectProfile; orbTheme: import("@/components/visual/ShieldOrb").OrbTheme; onNew: () => void; onModify: () => void; onPrint: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="classified-banner px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em]">
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
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>{suspect.username.startsWith("@") ? suspect.username : "@" + suspect.username}</span>
              <span>{suspect.emailAddress}</span>
              <span>{suspect.phoneNumber}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block h-20 w-20 shrink-0 no-print" title={`Theme: ${orbTheme}`}>
            <ShieldOrb className="h-20 w-20" theme={orbTheme} />
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <Button variant="outline" onClick={onModify} className="border-blue-200 text-blue-600 hover:text-blue-700 bg-blue-50/50"><SlidersHorizontal className="mr-2 h-4 w-4" /> Modify query</Button>
            <Button variant="outline" onClick={onNew}><Search className="mr-2 h-4 w-4" /> New search</Button>
            <Button onClick={onPrint}><Printer className="mr-2 h-4 w-4" /> Export report</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon helper
function ImageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  );
}
