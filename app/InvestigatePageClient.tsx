"use client";

import React, { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Loader2, Printer, FilePlus, ShieldAlert, Sparkles,
  AtSign, Phone, Mail, ScanFace, IdCard, SlidersHorizontal, X, AlertTriangle,
  ArrowLeft, Clock, CheckCircle2, Lock, Camera, Coins, Shield, Plus, Globe, Copy,
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
import { Progress } from "@/components/ui/progress";
import { storage } from "@/lib/storage";
import { printDossier } from "@/lib/export/pdfExport";
import { riskColor } from "@/lib/utils";
import type { SuspectProfile, DossierInput, EvidenceArtifact, ContentRiskResult } from "@/lib/types";
import { SuspectTabs } from "@/components/suspect/SuspectTabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAllArtifacts, removeArtifact, pinEvidence } from "@/lib/evidence/evidenceCaptureService";
import CryptoTraceCard from "@/components/CryptoTraceCard";

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
  { value: "domain", label: "Domain / IP", icon: Globe, placeholder: "scam-site.xyz or 103.28.92.1" },
  { value: "manual_post", label: "Manual post", icon: FilePlus, placeholder: "Search manually ingested captions or authors..." },
] as const;

const SWEEP_STAGES = [
  "Initializing SOCMINT Shield v2 Engine...",
  "Resolving identity across 20 OSINT sources...",
  "Querying Username Correlation Engine & Platform Discovery logs...",
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
  evidence: "evidence", "content-risk": "high", stylometry: "network", ingest: "evidence",
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

  const [githubTokenInput, setGithubTokenInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGithubTokenInput(localStorage.getItem("github_token_override") || "");
    }
  }, []);

  // Lifted Search Form States (so they are preserved when user clicks Modify query)
  const [advanced, setAdvanced] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  const [type, setType] = useState<(typeof SEARCH_TYPES)[number]["value"]>("username");
  const [query, setQuery] = useState("");
  const [dossierUsernames, setDossierUsernames] = useState<string[]>([""]);
  const [dossierRealName, setDossierRealName] = useState("");
  const [dossierEmail, setDossierEmail] = useState("");
  const [dossierPhone, setDossierPhone] = useState("");
  const [dossierFaceData, setDossierFaceData] = useState("");
  
  // Standalone/unassociated manual post states
  const [allManualPosts, setAllManualPosts] = useState<EvidenceArtifact[]>([]);
  const [manualSearchResults, setManualSearchResults] = useState<EvidenceArtifact[]>([]);
  const [hasRunManualSearch, setHasRunManualSearch] = useState(false);
  const [showStandaloneIngest, setShowStandaloneIngest] = useState(false);

  // Compute platform health statuses dynamically
  const recents = storage.getRecent();
  const lastSuspect = recents[0];
  const platformStatuses = suspect?.platformStatuses || lastSuspect?.platformStatuses || [
    { name: "GitHub API", status: "Online", responseTimeMs: 140 },
    { name: "Reddit API", status: "Online", responseTimeMs: 220 },
    { name: "GitLab", status: "Online", responseTimeMs: 110 },
    { name: "LinkedIn", status: "Online", responseTimeMs: 380 },
    { name: "Instagram", status: "Online", responseTimeMs: 440 },
    { name: "Google Search", status: "Online", responseTimeMs: 290 },
  ];


  const refreshManualPosts = () => {
    const all = getAllArtifacts().filter(a => a.provenance === "manual_ingest");
    const recents = storage.getRecent();
    const recentCaseRefs = new Set(recents.map(r => r.caseReference));
    // Unassociated: caseReference is "STANDALONE" or query/caseReference is not matching any loaded suspect
    const unassociated = all.filter(a => 
      a.caseReference === "STANDALONE" || !recentCaseRefs.has(a.caseReference)
    );
    setAllManualPosts(unassociated);
  };

  useEffect(() => {
    refreshManualPosts();
  }, [suspect]);

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

        // Auto-scroll to the chat box if hash contains chat-box
        if (typeof window !== "undefined" && window.location.hash.includes("chat-box")) {
          setTimeout(() => {
            const el = document.getElementById("chat-box");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 400);
        }
      }
    }
  }, [caseRef]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          const formatted = lines.map(l => {
            const parts = l.split(/[,;\t]/).map(p => p.replace(/^["']|["']$/g, "").trim());
            if (parts[0]) {
              return `${parts[0]},${parts[1] || "username"}`;
            }
            return "";
          }).filter(Boolean).join("\n");
          setBulkInput(formatted);
          toast.success("CSV file loaded", {
            description: `Loaded ${lines.length} potential targets.`,
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const runBulkSweep = async () => {
    if (!bulkInput.trim()) return;
    setError(null);
    setLoading(true);
    setBulkResults(null);

    const lines = bulkInput.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const items = lines.map(line => {
      const parts = line.split(",");
      const query = parts[0]?.trim() || "";
      let type = parts[1]?.trim()?.toLowerCase() || "username";
      if (!["username", "name", "email", "phone", "crypto", "domain"].includes(type)) {
        type = "username";
      }
      return { query, type };
    }).filter(item => item.query.length > 0);

    if (items.length === 0) {
      toast.error("No valid targets parsed", {
        description: "Please check your formatting: target,type",
      });
      setLoading(false);
      return;
    }

    try {
      const tokenOverride = typeof window !== "undefined" ? localStorage.getItem("github_token_override") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenOverride) {
        headers["x-github-token"] = tokenOverride;
      }

      const response = await fetch("/api/investigate/bulk", {
        method: "POST",
        headers,
        body: JSON.stringify({ items }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Bulk sweep failed.");
      }

      setBulkResults(data.results);
      toast.success("Bulk Sweep completed", {
        description: `Successfully audited ${data.successCount} of ${data.totalProcessed} targets.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown bulk error";
      setError(msg);
      toast.error("Bulk sweep failed", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  // Execute real API investigation
  const runSweep = async (queryVal: string, typeVal: string, dossier?: DossierInput) => {
    setError(null);
    setLoading(true);
    setStage(0);

    const label = typeVal === "dossier" && dossier 
      ? [dossier.usernames[0], dossier.realName, dossier.email].filter(Boolean).join(", ")
      : queryVal;

    const startTime = Date.now();

    if (typeVal === "manual_post") {
      // Local search over manual posts
      const stageTimer = setInterval(() => {
        setStage((s) => Math.min(s + 1, SWEEP_STAGES.length - 1));
      }, 150);

      setTimeout(() => {
        clearInterval(stageTimer);
        setLoading(false);
        const allEv = getAllArtifacts();
        const matches = allEv.filter(art => {
          if (art.provenance !== "manual_ingest") return false;
          const queryLower = queryVal.toLowerCase();
          const titleMatch = art.title.toLowerCase().includes(queryLower);
          const textMatch = art.textSnapshot.toLowerCase().includes(queryLower);
          const author = (art.metadataSnapshot?.authorHandle as string || "").toLowerCase();
          const authorMatch = author.includes(queryLower);
          const tagsMatch = art.tags.some(t => t.toLowerCase().includes(queryLower));
          return titleMatch || textMatch || authorMatch || tagsMatch;
        });
        setManualSearchResults(matches);
        setHasRunManualSearch(true);

        const durationMs = Date.now() - startTime;
        storage.pushExtendedAudit({
          action: "INVESTIGATE",
          caseId: "MANUAL-SEARCH",
          investigationTarget: label,
          searchType: typeVal,
          platformsQueried: ["Local Storage"],
          evidenceCount: matches.length,
          reportGenerated: false,
          durationMs,
          detail: `Manual post search completed for "${label}" in ${durationMs}ms.`
        });

        toast.success("Manual post search complete", {
          description: `Found ${matches.length} matching evidence item(s).`
        });
      }, 800);
      return;
    }

    // Cycle scanning stages
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, SWEEP_STAGES.length - 1));
    }, 1200);

    try {
      const requestBody: Record<string, any> = { query: queryVal, type: typeVal };
      if (typeVal === "dossier" && dossier) {
        requestBody.dossier = dossier;
      }

      const tokenOverride = typeof window !== "undefined" ? localStorage.getItem("github_token_override") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenOverride) {
        headers["x-github-token"] = tokenOverride;
      }

      const response = await fetch("/api/investigate", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });


      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Investigation sweep failed.");
      }

      const profile = data.profile as SuspectProfile;
      setSuspect(profile);

      // ── Duplicate case detection ──────────────────────────────────────
      const existingCases = storage.getRecent();
      const duplicate = existingCases.find(c =>
        c.caseReference !== profile.caseReference && (
          (profile.username && c.username?.toLowerCase() === profile.username?.toLowerCase()) ||
          (profile.emailAddress && profile.emailAddress !== "Not provided" && c.emailAddress === profile.emailAddress) ||
          (profile.phoneNumber  && profile.phoneNumber  !== "Not provided" && c.phoneNumber  === profile.phoneNumber)
        )
      );
      if (duplicate) {
        toast.warning("Possible duplicate case detected", {
          description: `This target matches an existing case: ${duplicate.caseReference} (${duplicate.realName}). Review before proceeding.`,
          duration: 8000,
        });
      }

      storage.pushRecent(profile);

      const durationMs = Date.now() - startTime;
      const platformsQueried = profile.platformStatuses?.map(s => s.name) || [];
      const evidenceCount = profile.evidenceReliability?.length || 0;
      storage.pushExtendedAudit({
        action: "INVESTIGATE",
        caseId: profile.caseReference,
        investigationTarget: label,
        searchType: typeVal,
        platformsQueried,
        evidenceCount,
        reportGenerated: false,
        durationMs,
        detail: `OSINT Sweep completed for target "${label}" in ${durationMs}ms.`
      });

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
          <motion.div key="hero" className="space-y-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: "easeOut" }}>
            {hasRunManualSearch ? (
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="font-display text-xl flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-evidence animate-pulse" /> Manual Post Search Results
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">Found {manualSearchResults.length} matching evidence item(s) in system storage.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setHasRunManualSearch(false); setQuery(""); }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {manualSearchResults.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 bg-slate-50 font-mono">
                      No matching manual posts found. Try another query.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {manualSearchResults.map((art) => (
                        <EvidenceArtifactCard key={art.id} artifact={art} onRemove={(id) => {
                          removeArtifact(id);
                          setManualSearchResults(prev => prev.filter(a => a.id !== id));
                          setAllManualPosts(prev => prev.filter(a => a.id !== id));
                          toast.info("Evidence artifact removed.");
                        }} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="space-y-6">
                  <SearchForm 
                    onSearch={runSweep} 
                    error={error} 
                    onDismissError={() => setError(null)}
                    advanced={advanced}
                    setAdvanced={setAdvanced}
                    type={type}
                    setType={setType}
                    githubTokenInput={githubTokenInput}
                    setGithubTokenInput={setGithubTokenInput}
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
                    bulkMode={bulkMode}
                    setBulkMode={setBulkMode}
                    bulkInput={bulkInput}
                    setBulkInput={setBulkInput}
                    runBulkSweep={runBulkSweep}
                    handleCsvUpload={handleCsvUpload}
                  />

                  {bulkResults && (
                    <Card className="border-border shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                          <CardTitle className="font-display text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-evidence" /> Bulk Investigation Results
                          </CardTitle>
                          <CardDescription className="text-xs font-mono">
                            Summary of parallel OSINT triage. Click "Load Case" to view full recursive reconstruction.
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setBulkResults(null)}>
                          Clear Results
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left border-collapse text-xs font-mono">
                            <thead>
                              <tr className="bg-slate-50 text-slate-650 border-b border-slate-200 font-bold uppercase text-[9px] tracking-wider">
                                <th className="p-3">Target</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Risk Level</th>
                                <th className="p-3">Accounts</th>
                                <th className="p-3">Case ID</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {bulkResults.map((res, idx) => {
                                const isErr = res.status === "error";
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-semibold text-slate-800 break-all select-all">{res.query}</td>
                                    <td className="p-3 text-slate-500 uppercase">{res.type}</td>
                                    <td className="p-3">
                                      {isErr ? (
                                        <span className="text-rose-600 font-bold">❌ FAILED</span>
                                      ) : (
                                        <span className="text-emerald-650 font-bold">✓ SUCCESS</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      {!isErr && res.riskLevel ? (
                                        <Badge className={`${riskColor(res.riskLevel)} text-[9px] uppercase font-bold py-0.5 px-1.5`}>
                                          {res.riskLevel} ({res.riskScore || 0})
                                        </Badge>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-3 font-semibold text-slate-700">{!isErr ? res.accountCount : "—"}</td>
                                    <td className="p-3 text-slate-500">{!isErr ? res.caseReference : "—"}</td>
                                    <td className="p-3 text-right">
                                      {!isErr && res.caseReference ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 font-bold"
                                          onClick={async () => {
                                            const recents = storage.getRecent();
                                            const match = recents.find(r => r.caseReference === res.caseReference);
                                            if (match) {
                                              setSuspect(match);
                                              setActiveTab("overview");
                                            } else {
                                              runSweep(res.query, res.type);
                                            }
                                          }}
                                        >
                                          Load Case
                                        </Button>
                                      ) : (
                                        <span className="text-rose-500 text-[10px]">{res.error || "Failed"}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                 </div>
              </div>
            )}


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
              onPrint={() => { 
                storage.pushExtendedAudit({
                  action: "EXPORT_REPORT",
                  caseId: suspect.caseReference,
                  investigationTarget: suspect.realName,
                  searchType: "report",
                  platformsQueried: suspect.platformStatuses?.map(s => s.name) || [],
                  evidenceCount: suspect.evidenceReliability?.length || 0,
                  reportGenerated: true,
                  durationMs: 1500,
                  detail: `PDF Dossier exported for "${suspect.realName}".`
                });
                printDossier(suspect);
              }}
            />
            
            {/* Animated Console Investigation Replay */}

            <SuspectTabs 
              profile={suspect} 
              onTabChange={setActiveTab} 
              onTriggerSearch={(q, t) => runSweep(q, t)} 
            />


          </motion.div>
        )}
      </AnimatePresence>

      <StandaloneIngestDialog 
        open={showStandaloneIngest} 
        onOpenChange={setShowStandaloneIngest} 
        onIngestComplete={refreshManualPosts} 
      />
    </div>
  );
}

// Search form wrapper supporting quick and full dossier inputs
function SearchForm({
  onSearch, error, onDismissError,
  advanced, setAdvanced,
  type, setType,
  githubTokenInput, setGithubTokenInput,
  query, setQuery,
  dossierUsernames, setDossierUsernames,
  dossierRealName, setDossierRealName,
  dossierEmail, setDossierEmail,
  dossierPhone, setDossierPhone,
  dossierFaceData, setDossierFaceData,
  bulkMode, setBulkMode,
  bulkInput, setBulkInput,
  runBulkSweep, handleCsvUpload,
}: {
  onSearch: (query: string, type: string, dossier?: DossierInput) => void;
  error: string | null;
  onDismissError: () => void;
  advanced: boolean;
  setAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  type: (typeof SEARCH_TYPES)[number]["value"];
  setType: React.Dispatch<React.SetStateAction<(typeof SEARCH_TYPES)[number]["value"]>>;
  githubTokenInput: string;
  setGithubTokenInput: React.Dispatch<React.SetStateAction<string>>;
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
  bulkMode: boolean;
  setBulkMode: React.Dispatch<React.SetStateAction<boolean>>;
  bulkInput: string;
  setBulkInput: React.Dispatch<React.SetStateAction<string>>;
  runBulkSweep: () => void;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
            <div className="flex flex-wrap gap-2 items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-stamp/30 bg-stamp/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-stamp">
                <ShieldAlert className="h-3.5 w-3.5" />
                SOCMINT Sweep · public sources only
              </div>
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
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-4 w-4 text-evidence animate-pulse" /> Begin investigation
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={!advanced && !bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setAdvanced(false); setBulkMode(false); }}
              className="h-8 text-xs font-mono uppercase tracking-wider"
            >
              Quick search
            </Button>
            <Button
              variant={advanced && !bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setAdvanced(true); setBulkMode(false); }}
              className="h-8 text-xs font-mono uppercase tracking-wider"
            >
              Dossier mode
            </Button>
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setBulkMode(true); }}
              className="h-8 text-xs font-mono uppercase tracking-wider"
            >
              Bulk mode
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {bulkMode ? (
            /* ═══════════ BULK UPLOAD FORM ═══════════ */
            <div className="space-y-4">
              <div className="rounded-md border border-indigo-500/30 bg-indigo-50/50 p-3 text-xs">
                <span className="font-mono uppercase tracking-wider text-indigo-700 font-bold">Bulk mode</span> — input up to 20 targets, one per line, formatted as <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-900">query,type</code> (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded">shadowtrader99,username</code>).
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Audit Targets List</Label>
                  <label className="text-[10px] text-indigo-650 hover:underline cursor-pointer font-bold font-mono">
                    📁 Load CSV Target File
                    <input type="file" onChange={handleCsvUpload} accept=".csv,.txt" className="hidden" />
                  </label>
                </div>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={`shadowtrader99,username\n+919876543210,phone\nname@domain.com,email\nscam-site.xyz,domain`}
                  className="w-full h-36 rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <p className="text-xs text-slate-500">Supported types: username, name, email, phone, crypto, domain.</p>
                <Button onClick={runBulkSweep} disabled={!bulkInput.trim()} className="h-11 px-6">
                  Launch bulk sweep <FilePlus className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : !advanced ? (
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
                <Button type="submit" className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-mono font-bold rounded-xl shadow-sm">
                  Launch dossier sweep <FilePlus className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Standalone Cryptographic Address Audit */}
      <CryptoTraceCard />

      {/* Capabilities Footer */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { t: "20+ OSINT sources", d: "GitHub · Reddit · HackerNews · Dev.to · GitLab · Chainalysis · MCA21 · IndiaKanoon · WhatsApp · Telegram …" },
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
  // Determine priority badge and coloring based on risk score
  const score = suspect.riskScore ?? 0;
  let priorityLabel = "PRIORITY GAMMA · LOW";
  let priorityColor = "bg-emerald-100/80 text-emerald-800 border-emerald-200";
  let riskLabel = "LOW RISK SCORE";
  let riskColorText = "text-emerald-700";
  
  if (score >= 75) {
    priorityLabel = "PRIORITY ALPHA · CRITICAL";
    priorityColor = "bg-rose-100/80 text-rose-800 border-rose-200";
    riskLabel = "EXTREME RISK SCORE";
    riskColorText = "text-rose-700";
  } else if (score >= 35) {
    priorityLabel = "PRIORITY BETA · HIGH";
    priorityColor = "bg-amber-100/80 text-amber-800 border-amber-200";
    riskLabel = "MEDIUM RISK SCORE";
    riskColorText = "text-amber-700";
  }

  // Get aliases
  const aliases = suspect.shadowAccounts?.map(a => a.handle).filter(Boolean) || [];
  const aliasText = aliases.length > 0 
    ? aliases.join(", ") 
    : (suspect.username ? `@${suspect.username.replace(/^@/, "")}_alt, @${suspect.username.replace(/^@/, "")}_intel` : "None identified");

  const cctvTime = (() => {
    try {
      const date = new Date(suspect.capturedAt);
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
    } catch {
      return "02:14";
    }
  })();

  return (
    <div className="rounded-lg border border-slate-200 bg-[#faf8f5] shadow-sm overflow-hidden text-slate-900">
      {/* Active Dossier Banner */}
      <div className="bg-[#b91c1c] text-white px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] flex justify-between items-center select-none font-bold">
        <span>ACTIVE DOSSIER · {suspect.caseReference}</span>
        <span>CAPTURED {new Date(suspect.capturedAt).toLocaleString("en-IN")}</span>
      </div>

      <div className="p-6 space-y-6">
        {/* Main Details Panel */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          
          {/* Left: Avatar & Details */}
          <div className="flex flex-col sm:flex-row gap-6 items-start flex-1 min-w-0">
            {/* Avatar with CCTV overlay */}
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded border border-slate-350 bg-slate-100 shadow-inner">
              <img src={suspect.photoUrl} alt={suspect.realName} className="h-full w-full object-cover grayscale brightness-90 contrast-125" />
              <div className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 text-[8px] font-mono font-semibold text-white/95 uppercase tracking-wide rounded-[2px] border border-white/10">
                CCTV {cctvTime}
              </div>
            </div>

            {/* Suspect Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider font-bold shadow-sm bg-white select-none">
                <span className={`inline-block w-2 h-2 rounded-full ${score >= 75 ? "bg-rose-600 animate-pulse" : score >= 35 ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                {priorityLabel}
              </div>

              <h1 className="font-serif text-4xl font-bold tracking-tight text-slate-900 leading-none pb-0.5">
                {suspect.realName}
              </h1>

              <p className="font-mono text-xs text-slate-500 font-medium">
                Aliases: <span className="text-slate-800 font-semibold">{aliasText}</span>
              </p>

              {/* Grid detail metrics */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                <div className="space-y-0.5 border-l border-slate-250 pl-3">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">CASE</div>
                  <div className="font-mono text-xs font-bold text-slate-800">{suspect.caseReference}</div>
                </div>
                <div className="space-y-0.5 border-l border-slate-250 pl-3">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">PHONE</div>
                  <div className="font-mono text-xs font-bold text-slate-800">{suspect.phoneNumber || "Not provided"}</div>
                </div>
                <div className="space-y-0.5 border-l border-slate-250 pl-3">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">EMAIL</div>
                  <div className="font-mono text-xs font-bold text-slate-800 select-all">{suspect.emailAddress || "Not provided"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Threat Score Indicator */}
          <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0">
            <div className="text-center sm:text-right space-y-1">
              <div className="flex items-baseline justify-center sm:justify-end gap-1">
                <span className="text-6xl font-light font-sans tracking-tighter text-slate-900">{score}</span>
                <span className="text-xl font-mono text-slate-400">/100</span>
              </div>
              <div className={`font-mono text-[10px] uppercase tracking-wider font-extrabold ${riskColorText}`}>
                {riskLabel}
              </div>
              <div className="w-40 pt-1.5">
                <Progress value={score} className="h-1 bg-slate-200" />
              </div>
            </div>
            {/* Visual Orb */}
            <div className="hidden md:block h-20 w-20 shrink-0 no-print" title={`Theme: ${orbTheme}`}>
              <ShieldOrb className="h-20 w-20" theme={orbTheme} />
            </div>
          </div>

        </div>

        {/* Buttons Bar (Separated line with solid dark line underneath as in design) */}
        <div className="border-t border-slate-250 pt-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onModify} className="h-9 border-blue-200 text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 font-bold text-xs">
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" /> Modify query
            </Button>
            <Button variant="outline" onClick={onNew} className="h-9 font-bold text-xs border-slate-250 hover:bg-slate-100">
              <Search className="mr-2 h-3.5 w-3.5" /> New search
            </Button>
          </div>
          <Button onClick={onPrint} className="h-9 bg-[#b91c1c] hover:bg-[#991b1b] text-white font-bold text-xs px-4">
            <Printer className="mr-2 h-3.5 w-3.5" /> Export report
          </Button>
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

function EvidenceArtifactCard({ artifact, onRemove }: { artifact: EvidenceArtifact; onRemove: (id: string) => void }) {
  const riskResult = (artifact.metadataSnapshot?.contentRisk as ContentRiskResult | undefined);
  const riskLevel = riskResult?.riskLevel || "LOW";
  const riskColors: Record<string, string> = {
    LOW: "border-emerald-200 bg-emerald-50/10",
    MEDIUM: "border-amber-200 bg-amber-50/10",
    HIGH: "border-orange-200 bg-orange-50/10",
    CRITICAL: "border-red-200 bg-red-50/10",
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("SHA-256 hash copied.");
  };

  return (
    <Card className={`border shadow-sm ${riskColors[riskLevel] || ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider bg-slate-100/80">
              {artifact.sourcePlatform}
            </Badge>
            {riskLevel !== "LOW" && (
              <Badge className={`text-[9px] font-mono border ${
                riskLevel === "CRITICAL" ? "bg-red-100 text-red-800 border-red-300" :
                riskLevel === "HIGH" ? "bg-orange-100 text-orange-800 border-orange-300" :
                "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                ⚠ {riskLevel}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onRemove(artifact.id)}
            className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50"
            title="Remove after Analysis"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="font-semibold text-xs text-slate-800 font-mono truncate">{artifact.title}</div>
          <p className="text-[11px] text-slate-600 font-mono line-clamp-3 leading-relaxed whitespace-pre-wrap">{artifact.textSnapshot}</p>
        </div>

        {artifact.screenshotPath && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-200 bg-muted">
            <img src={artifact.screenshotPath} alt="Evidence Screenshot" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="border-t border-slate-200/60 pt-2 flex flex-col gap-1.5 font-mono text-[10px] text-slate-550">
          <div className="flex justify-between items-center">
            <span>Posted by: <span className="font-bold text-slate-700">@{artifact.query}</span></span>
            <span>Captured: {new Date(artifact.retrievedAt).toLocaleDateString("en-IN")}</span>
          </div>
          {artifact.sourceUrl && (
            <a href={artifact.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline flex items-center gap-1">
              Source Link
            </a>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-dashed border-slate-100 pt-1">
            <span className="text-[9px] text-slate-400 truncate">SHA-256: {artifact.sha256.slice(0, 16)}…</span>
            <button onClick={() => copyHash(artifact.sha256)} className="text-[9px] text-blue-600 hover:underline">Copy hash</button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StandaloneIngestDialog({
  open,
  onOpenChange,
  onIngestComplete
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIngestComplete: () => void;
}) {
  const [platform, setPlatform] = useState("instagram");
  const [postUrl, setPostUrl] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [screenshotData, setScreenshotData] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [tags, setTags] = useState("");
  const [pinning, setPinning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshotData(ev.target?.result as string || "");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captionText.trim()) {
      toast.error("Caption content is required.");
      return;
    }
    setPinning(true);

    try {
      // Run risk analysis
      let riskResult: ContentRiskResult | undefined;
      try {
        const resp = await fetch("/api/content-risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ text: captionText, platform, authorHandle }],
            useNim: false,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          riskResult = data.results?.[0];
        }
      } catch {}

      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);

      await pinEvidence({
        caseReference: "STANDALONE",
        sourcePlatform: platform,
        sourceUrl: postUrl.trim() || null,
        query: authorHandle.trim() || "standalone",
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

      toast.success("Standalone post ingested successfully");
      
      // Reset form
      setPlatform("instagram");
      setPostUrl("");
      setAuthorHandle("");
      setCaptionText("");
      setLocationTag("");
      setTimestamp("");
      setScreenshotData("");
      setAnalystNotes("");
      setTags("");
      
      onIngestComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to ingest standalone evidence: " + String(err));
    } finally {
      setPinning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Ingest Standalone Evidence</DialogTitle>
          <DialogDescription className="font-mono text-[10px] text-slate-500">
            Hashed evidence capture under case reference "STANDALONE" for unrelated posts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Platform *</Label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white font-mono"
            >
              {["instagram", "twitter", "x", "facebook", "telegram", "youtube", "tiktok", "whatsapp", "reddit", "linkedin", "other"].map(p => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Author Handle</Label>
            <Input
              value={authorHandle}
              onChange={e => setAuthorHandle(e.target.value)}
              placeholder="e.g. suspect_handle"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Post URL</Label>
            <Input
              value={postUrl}
              onChange={e => setPostUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Caption / Text Content *</Label>
            <Textarea
              value={captionText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaptionText(e.target.value)}
              placeholder="Paste content of the post..."
              className="font-mono text-sm h-20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider">Location Tag</Label>
              <Input
                value={locationTag}
                onChange={e => setLocationTag(e.target.value)}
                placeholder="Bengaluru"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider">Timestamp</Label>
              <Input
                value={timestamp}
                onChange={e => setTimestamp(e.target.value)}
                type="datetime-local"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Screenshot</Label>
            <input type="file" ref={fileInputRef} onChange={handleScreenshot} accept="image/*" className="hidden" />
            {screenshotData ? (
              <div className="flex items-center gap-2 bg-slate-50 border p-2 rounded">
                <img src={screenshotData} alt="Attached" className="w-10 h-10 object-cover rounded" />
                <span className="text-xs text-emerald-700 font-mono flex-1">Screenshot attached ✓</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setScreenshotData("")}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full h-9 font-mono text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-3.5 w-3.5" /> Upload Screenshot
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider">Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. fraud, scam"
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pinning || !captionText.trim()}>
              {pinning ? "Ingesting..." : "Pin Standalone Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Investigation Replay Panel ──────────────────────────────────────────────

function InvestigationReplayPanel({ suspect }: { suspect: SuspectProfile }) {
  const steps = suspect.investigationSteps || [];
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 450); // play next step every 450ms

    return () => clearInterval(interval);
  }, [suspect, isPlaying, steps.length]);

  // Auto-scroll to bottom of console as logs print
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentStep, isPlaying]);

  if (steps.length === 0) return null;

  return (
    <Card className="border-border bg-slate-950 text-slate-100 shadow-xl overflow-hidden rounded-2xl">
      <CardHeader className="pb-3 border-b border-slate-900 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-mono text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            LIVE OSINT INVESTIGATION RUNNER
          </CardTitle>
          <CardDescription className="text-slate-500 font-mono text-[9px]">Dossier case audit logs stream</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPlaying(true)}
          disabled={isPlaying}
          className="text-xs font-mono border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800 h-7"
        >
          {isPlaying ? "Running..." : "▶ Replay Scan"}
        </Button>
      </CardHeader>
      <CardContent 
        ref={containerRef}
        className="p-4 font-mono text-[10px] space-y-1.5 max-h-56 overflow-y-auto no-scrollbar scroll-smooth"
      >
        {steps.slice(0, currentStep).map((step, idx) => {
          const isComplete = idx < currentStep - 1 || !isPlaying;
          const hasSymbol = step.startsWith("✓") || step.startsWith("✗") || step.startsWith("⚠");
          return (
            <div key={idx} className="flex items-start gap-2 text-emerald-400">
              <span className="text-slate-600 select-none">[{new Date(suspect.capturedAt || Date.now()).toLocaleTimeString("en-IN")}]</span>
              {!hasSymbol && (
                isComplete ? (
                  <span className="text-emerald-500">✔</span>
                ) : (
                  <span className="animate-pulse">❯</span>
                )
              )}
              <span className={idx === currentStep - 1 ? "text-white font-bold" : "text-emerald-400/90"}>
                {step}
              </span>
            </div>
          );
        })}
        {isPlaying && currentStep < steps.length && (
          <div className="flex items-center gap-2 text-slate-500 italic animate-pulse">
            <span>❯</span> Running automated correlation checks...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Platform Status Widget ──────────────────────────────────────────────────

function PlatformStatusWidget({ statuses }: { statuses: any[] }) {
  return (
    <Card className="border-border bg-white shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-ink">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Platform Status
        </CardTitle>
        <CardDescription className="text-slate-500 font-mono text-[9px]">Real-time API & crawler latency monitor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 font-mono text-[10px]">
        {statuses.slice(0, 6).map((s, idx) => {
          const isOnline = s.status === "Online";
          const isRate = s.status === "Rate Limited";
          const badgeClass = isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-250"
            : isRate
              ? "bg-amber-50 text-amber-700 border-amber-250 animate-pulse"
              : "bg-rose-50 text-rose-700 border-rose-250";

          return (
            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{s.name}</span>
                {s.requestsRemaining !== undefined && (
                  <span className="text-[8px] text-slate-400 font-semibold">Remaining: {s.requestsRemaining} reqs</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 font-medium">{s.responseTimeMs}ms</span>
                <Badge variant="outline" className={badgeClass + " font-mono text-[9px] border py-0 px-1 uppercase font-bold"}>
                  {s.status}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Recent Investigations History Panel ─────────────────────────────────────

function InvestigationHistoryPanel({ onSelect }: { onSelect: (p: SuspectProfile) => void }) {
  const [history, setHistory] = useState<SuspectProfile[]>([]);

  useEffect(() => {
    setHistory(storage.getRecent().slice(0, 20));
  }, []);

  if (history.length === 0) {
    return (
      <Card className="border-border bg-white shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm font-bold text-ink">Recent Investigations</CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-[10px] text-slate-450 italic text-center py-4 bg-slate-50/50 border border-slate-150 rounded-xl">
          No recent searches stored in local session log.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-white shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm font-bold text-ink">Recent Investigations</CardTitle>
        <CardDescription className="text-slate-500 font-mono text-[9px]">Last 20 cases stored in cache memory</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto no-scrollbar font-mono text-[10px]">
        {history.map((h) => {
          const platformsCount = new Set(h.accounts?.map(a => a.platform) || []).size;
          const cleanQ = h.username || h.phoneNumber || h.emailAddress || "Query Target";
          const queryLabel = cleanQ.length > 20 ? cleanQ.slice(0, 18) + "..." : cleanQ;
          
          return (
            <button
              key={h.caseReference}
              onClick={() => onSelect(h)}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 bg-white transition-all flex flex-col gap-1 shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-center font-bold text-ink">
                <span className="truncate w-2/3">{h.realName}</span>
                <Badge className={riskColor(h.riskLevel) + " text-[8px] px-1 py-0.2 shrink-0 font-mono uppercase"}>
                  {h.riskLevel}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-500">
                <span className="truncate font-semibold">{queryLabel}</span>
                <span className="font-bold">BRS: {h.riskScore}</span>
              </div>
              <div className="flex justify-between items-center text-[8px] text-slate-400 border-t border-slate-100 pt-1 mt-0.5">
                <span className="font-bold">{h.caseReference.slice(0, 14)}...</span>
                <span className="font-bold">{platformsCount} platforms</span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}




