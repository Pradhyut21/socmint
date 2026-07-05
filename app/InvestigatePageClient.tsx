"use client";

import React, { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Loader2, Printer, FilePlus, ShieldAlert, Sparkles,
  AtSign, Phone, Mail, ScanFace, IdCard, SlidersHorizontal, X, AlertTriangle,
  ArrowLeft, Clock, CheckCircle2, Lock, Camera, Coins, Shield, Plus, Globe, Copy, Zap,
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
import { printDossier } from "@/lib/export/pdfExport";
import { riskColor } from "@/lib/utils";
import type { SuspectProfile, DossierInput, EvidenceArtifact, ContentRiskResult, PlatformAccount } from "@/lib/types";
import { SuspectTabs } from "@/components/suspect/SuspectTabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAllArtifacts, removeArtifact, pinEvidence } from "@/lib/evidence/evidenceCaptureService";

// Dynamically import WebGL ShieldOrb to prevent server-side compile errors
const ShieldOrb = dynamic(
  () => import("@/components/visual/ShieldOrb").then((mod) => mod.ShieldOrb),
  { ssr: false }
);

const SEARCH_TYPES = [
  { value: "username", label: "Username", icon: AtSign, placeholder: "shadowtrader99" },
  { value: "name", label: "Real name", icon: IdCard, placeholder: "Vikram Rathore" },
  { value: "email", label: "Email", icon: Mail, placeholder: "name@protonmail.com" },
  { value: "crypto", label: "Crypto wallet", icon: Coins, placeholder: "BTC, ETH, or LTC address" },
  { value: "face", label: "Face scan", icon: ScanFace, placeholder: "Upload or capture image" },
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
  // State for live updates
  const [liveAccounts, setLiveAccounts] = useState<PlatformAccount[]>([]);
  const [liveMessages, setLiveMessages] = useState<string[]>([]);

  const [showApiSettings, setShowApiSettings] = useState(false);
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
  // Optional disambiguating hint for "Real name" searches (username/college/company)
  const [nameContext, setNameContext] = useState("");
  const [dossierUsernames, setDossierUsernames] = useState<string[]>([""]);
  const [dossierRealName, setDossierRealName] = useState("");
  const [dossierEmail, setDossierEmail] = useState("");
  const [dossierPhone, setDossierPhone] = useState("");
  const [dossierFaceData, setDossierFaceData] = useState("");
  
  // Quick Scan / Deep Scan toggle
  const [quickScan, setQuickScan] = useState(true); // Default to Quick Scan (fast mode)
  
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
  const runSweep = async (queryVal: string, typeVal: string, dossier?: DossierInput, nameContextVal?: string) => {
    setError(null);
    setLoading(true);
    setStage(0);
    setSuspect(null); // Clear previous results

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
      const requestBody: Record<string, any> = { query: queryVal, type: typeVal, quickScan };
      if (typeVal === "dossier" && dossier) {
        requestBody.dossier = dossier;
      }
      if (nameContextVal) {
        requestBody.nameContext = nameContextVal;
      }

      const tokenOverride = typeof window !== "undefined" ? localStorage.getItem("github_token_override") : null;

      // Use EventSource for Server-Sent Events
      const params = new URLSearchParams();
      Object.keys(requestBody).forEach(key => {
        params.append(key, typeof requestBody[key] === 'object' ? JSON.stringify(requestBody[key]) : requestBody[key]);
      });
      if (tokenOverride) {
        params.append('githubToken', tokenOverride);
      }

      // Make POST request to streaming endpoint
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tokenOverride) {
        headers["x-github-token"] = tokenOverride;
      }

      console.log("[STREAMING] Calling /api/investigate-live with:", { query: queryVal, type: typeVal, quickScan });

      const response = await fetch("/api/investigate-live", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Investigation failed");
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("No response body");
      }

      setLiveAccounts([]);
      setLiveMessages([]);

      console.log("[STREAMING] Starting to read SSE stream...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[STREAMING] ✅ Stream ended naturally");
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "status") {
                setLiveMessages(prev => [...prev, data.message]);
                console.log("[STREAMING] Status:", data.message);
              } else if (data.type === "account_found") {
                console.log("[STREAMING] ✅ Account found event received:", data);
                console.log("[STREAMING] Account profilePicUrl:", data.account?.profilePicUrl);
                setLiveMessages(prev => [...prev, data.message]);
                
                if (data.account) {
                  console.log("[STREAMING] Account data:", data.account);
                  console.log("[STREAMING] Account has profilePicUrl?", !!data.account.profilePicUrl);
                  console.log("[STREAMING] Full account object keys:", Object.keys(data.account));
                  
                  setLiveAccounts(prev => {
                    const newAccounts = [...prev, data.account];
                    console.log("[STREAMING] Total accounts now:", newAccounts.length);
                    return newAccounts;
                  });
                  
                  // Create or update partial profile immediately
                  setSuspect(prev => {
                    const newAccount = data.account;
                    console.log("[STREAMING] Adding account to profile, profilePicUrl:", newAccount.profilePicUrl);
                    const existingAccounts = prev ? prev.accounts || [] : [];
                    
                    // Check if account already exists
                    const accountExists = existingAccounts.some(acc => 
                      acc.platform === newAccount.platform && acc.username === newAccount.username
                    );
                    
                    if (accountExists) {
                      console.log("[STREAMING] Account already in profile, skipping");
                      return prev;
                    }
                    
                    const updatedAccounts = [...existingAccounts, newAccount];
                    
                    // Helper function: Select best profile picture with priority: Instagram → GitHub → YouTube → others
                    const selectBestProfilePic = (accounts: any[], fallbackName: string) => {
                      const instagram = accounts.find(a => a.platform === "instagram" && a.profilePicUrl)?.profilePicUrl;
                      const github = accounts.find(a => a.platform === "github" && a.profilePicUrl)?.profilePicUrl;
                      const youtube = accounts.find(a => a.platform === "youtube" && a.profilePicUrl)?.profilePicUrl;
                      const anyOther = accounts.find(a => a.profilePicUrl)?.profilePicUrl;
                      return instagram || github || youtube || anyOther || 
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&size=256&background=0D8ABC&color=fff&bold=true`;
                    };
                    
                    if (!prev) {
                      // First account - create new profile
                      console.log("[STREAMING] 🚀 Creating initial profile with first account");
                      const partialProfile: SuspectProfile = {
                        username: queryVal,
                        realName: queryVal,
                        phoneNumber: "Not provided",
                        emailAddress: "Not provided",
                        photoUrl: selectBestProfilePic(updatedAccounts, queryVal),
                        riskScore: 0,
                        riskLevel: "LOW",
                        riskSubscores: { language: 0, behavioral: 0, network: 0, legal: 0 },
                        riskSignals: [],
                        accounts: updatedAccounts,
                        posts: [],
                        legalRecords: [],
                        aliasResults: [],
                        network: { nodes: [], links: [] },
                        locations: [],
                        caseReference: `TEMP-${Date.now()}`,
                        capturedAt: new Date().toISOString(),
                      };
                      
                      // Stop showing loading skeleton, switch to accounts tab
                      setLoading(false);
                      setActiveTab("accounts");
                      console.log("[STREAMING] ✅ Profile created, UI should show results now");
                      
                      return partialProfile;
                    } else {
                      // Update existing profile with new account and refresh photoUrl with priority
                      console.log("[STREAMING] Adding account to existing profile");
                      return {
                        ...prev,
                        accounts: updatedAccounts,
                        photoUrl: selectBestProfilePic(updatedAccounts, prev.realName || prev.username)
                      };
                    }
                  });
                } else {
                  console.log("[STREAMING] ⚠️ No account data in event");
                }
              } else if (data.type === "complete") {
                // Final profile ready
                console.log("[STREAMING] 🎉 Complete event received, setting final profile");
                clearInterval(stageTimer);
                
                const finalProfile = data.profile as SuspectProfile;
                
                // CRITICAL FIX: Merge liveAccounts that were reported during streaming
                // The final profile should already include these, but we ensure no accounts are lost
                setSuspect((prev) => {
                  if (!prev) {
                    // No partial profile was built, use final as-is
                    console.log("[STREAMING] No partial profile, using final profile");
                    return finalProfile;
                  }
                  
                  // Merge accounts from partial profile (built during streaming) into final profile
                  const finalAccountKeys = new Set(
                    finalProfile.accounts.map(acc => `${acc.platform}::${acc.username.toLowerCase()}`)
                  );
                  
                  const missingAccounts = prev.accounts.filter(acc => {
                    const key = `${acc.platform}::${acc.username.toLowerCase()}`;
                    return !finalAccountKeys.has(key);
                  });
                  
                  if (missingAccounts.length > 0) {
                    console.log(`[STREAMING] ⚠️ Found ${missingAccounts.length} accounts in partial profile missing from final, merging...`);
                    return {
                      ...finalProfile,
                      accounts: [...finalProfile.accounts, ...missingAccounts]
                    };
                  }
                  
                  console.log("[STREAMING] All accounts present in final profile");
                  return finalProfile;
                });
                
                setLoading(false);
                setActiveTab("accounts"); // Always switch to accounts when complete
                
                const profile = finalProfile;
                
                // Handle duplicate detection and storage
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

                // Background AI Nexus Analysis
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
                
                return;
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks or heartbeat messages
              if (!line.startsWith(':')) {
                console.log("[STREAMING] Failed to parse SSE line:", line);
              }
            }
          }
        }
      }

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
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-6">
      {/* Show loading banner at top if still loading but have partial results */}
      {loading && suspect && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-3"
        >
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Search in progress...</p>
            <p className="text-xs text-blue-700">{SWEEP_STAGES[stage]}</p>
          </div>
        </motion.div>
      )}
      
      <AnimatePresence mode="wait">
        {loading && !suspect ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <SweepSkeleton stageText={SWEEP_STAGES[stage]} />
          </motion.div>
        ) : !suspect ? (
          <motion.div key="hero" className="flex h-[calc(100vh-9rem)] items-center overflow-hidden [&>*]:w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: "easeOut" }}>
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
                  <SearchForm 
                    onSearch={runSweep} 
                    error={error} 
                    onDismissError={() => setError(null)}
                    advanced={advanced}
                    setAdvanced={setAdvanced}
                    type={type}
                    setType={setType}
                    showApiSettings={showApiSettings}
                    setShowApiSettings={setShowApiSettings}
                    githubTokenInput={githubTokenInput}
                    setGithubTokenInput={setGithubTokenInput}
                    query={query}

                      setQuery={setQuery}
                      nameContext={nameContext}
                      setNameContext={setNameContext}
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
                      quickScan={quickScan}
                      setQuickScan={setQuickScan}
                    />

                    {/* Bulk Triage Results */}
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
  showApiSettings, setShowApiSettings,
  githubTokenInput, setGithubTokenInput,
  query, setQuery,
  nameContext, setNameContext,
  dossierUsernames, setDossierUsernames,
  dossierRealName, setDossierRealName,
  dossierEmail, setDossierEmail,
  dossierPhone, setDossierPhone,
  dossierFaceData, setDossierFaceData,
  bulkMode, setBulkMode,
  bulkInput, setBulkInput,
  runBulkSweep, handleCsvUpload,
  quickScan, setQuickScan,
}: {
  onSearch: (query: string, type: string, dossier?: DossierInput, nameContext?: string) => void;
  error: string | null;
  onDismissError: () => void;
  advanced: boolean;
  setAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  type: (typeof SEARCH_TYPES)[number]["value"];
  setType: React.Dispatch<React.SetStateAction<(typeof SEARCH_TYPES)[number]["value"]>>;
  showApiSettings: boolean;
  setShowApiSettings: React.Dispatch<React.SetStateAction<boolean>>;
  githubTokenInput: string;
  setGithubTokenInput: React.Dispatch<React.SetStateAction<string>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  nameContext: string;
  setNameContext: React.Dispatch<React.SetStateAction<string>>;
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
  quickScan: boolean;
  setQuickScan: React.Dispatch<React.SetStateAction<boolean>>;
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
    onSearch(query.trim(), type, undefined, type === "name" ? nameContext.trim() || undefined : undefined);
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
    <div className="space-y-6">
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

      {/* Two-card home: side by side, natural height, top-aligned */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {/* Brand Hero card */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="classified-banner px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em]">
          Restricted · For authorized auditors only · KSP Cyber Cell
        </div>
        <div className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:p-10">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-stamp/30 bg-stamp/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-stamp">
                <ShieldAlert className="h-3.5 w-3.5" />
                SOCMINT Sweep · public sources only
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowApiSettings(true)}
                className="h-6 rounded-full font-mono text-[9px] uppercase tracking-wider px-3 border-indigo-200 text-indigo-650 bg-indigo-50 hover:bg-indigo-100/50"
              >
                ⚙️ API settings
              </Button>
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

      {/* Investigation form card */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Sparkles className="h-4 w-4 text-evidence animate-pulse" /> Begin investigation
          </CardTitle>
          <div className="flex gap-1.5">
            <Button variant={!advanced ? "default" : "outline"} size="sm" onClick={() => { setAdvanced(false); setBulkMode(false); }} className="h-7 text-[10px] font-mono uppercase tracking-wider px-3">Quick</Button>
            <Button variant={advanced ? "default" : "outline"} size="sm" onClick={() => { setAdvanced(true); setBulkMode(false); }} className="h-7 text-[10px] font-mono uppercase tracking-wider px-3">Dossier</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!advanced ? (
            /* ═══════════ QUICK SCAN FORM ═══════════ */
            <div className="space-y-4">
              {/* Identifier chips — stacked vertically */}
              <div>
                <Label className="mb-2 block text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Identifier type</Label>
                <div className="grid grid-cols-1 gap-2">
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
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${active ? "border-stamp bg-stamp text-primary-foreground shadow-sm" : "border-border bg-card text-foreground hover:border-stamp/40 hover:bg-muted"}`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {t.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {type === "face" ? (
                <div className="space-y-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  {useCamera && (
                    <div className="flex flex-col items-center justify-center bg-background p-4 border border-border max-w-xs mx-auto">
                      <div className="relative w-40 h-40 bg-black overflow-hidden border border-stamp/30 mb-3">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute left-0 right-0 h-0.5 bg-evidence animate-bounce top-1/2" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={stopCamera}>Cancel</Button>
                        <Button type="button" size="sm" onClick={capturePhoto}>Capture</Button>
                      </div>
                    </div>
                  )}
                  {!useCamera && !query && (
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
                      <Button type="button" variant="outline" className="h-20 flex flex-col gap-2 font-mono text-xs uppercase" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5 text-muted-foreground" /> Upload File
                      </Button>
                      <Button type="button" variant="outline" className="h-20 flex flex-col gap-2 font-mono text-xs uppercase" onClick={startCamera}>
                        <Camera className="h-5 w-5 text-muted-foreground" /> Camera Scan
                      </Button>
                    </div>
                  )}
                  {query && (
                    <div className="flex items-center gap-4 bg-muted/30 border border-border p-3 max-w-md mx-auto">
                      <img src={query} alt="Capture" className="w-12 h-12 object-cover border border-border" />
                      <span className="text-xs text-evidence font-mono flex-1">Face photo captured ✓</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setQuery("")}><X className="h-4 w-4 text-muted-foreground" /></Button>
                    </div>
                  )}
                  {query && (
                    <div className="text-center pt-2">
                      <Button onClick={() => onSearch(query, "face")} className="h-11 px-8">
                        Run sweep <FilePlus className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={submitSimple} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Search · {current.label}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={current.placeholder} className="h-11 pl-10" />
                      </div>
                      <Button type="submit" disabled={!query.trim()} className="h-11 px-5 shrink-0 font-semibold">
                        Run sweep <FilePlus className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {type === "name" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                        Additional context <span className="text-muted-foreground/60">(optional)</span>
                      </Label>
                      <Input
                        value={nameContext}
                        onChange={(e) => setNameContext(e.target.value)}
                        placeholder="Known username, college, or company — helps match the right LinkedIn profile"
                        className="h-10"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Common names return many LinkedIn matches. A username, college, or employer narrows the search to the right person.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Scan depth</Label>
                    <div className="flex rounded-md border border-border bg-paper p-1 gap-1">
                      <button type="button" onClick={() => setQuickScan(true)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold transition-colors ${quickScan ? "bg-stamp text-primary-foreground shadow-sm" : "text-forest/60 hover:text-forest"}`}>
                        <Zap className="h-3.5 w-3.5" /> Quick · 15 sites
                      </button>
                      <button type="button" onClick={() => setQuickScan(false)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold transition-colors ${!quickScan ? "bg-stamp text-primary-foreground shadow-sm" : "text-forest/60 hover:text-forest"}`}>
                        <Shield className="h-3.5 w-3.5" /> Deep · 400+ sites
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {quickScan ? "Fast mode — 20-30s. Reliable content-verified platforms." : "Thorough mode — 1-3min. Full 400+ site sweep with correlation."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-stamp" />
                    All queries are logged to the compliance audit ledger.
                  </div>
                </form>
              )}
            </div>
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
      </div>{/* end two-card grid */}

      {/* Developer API settings Dialog */}
      <Dialog open={showApiSettings} onOpenChange={setShowApiSettings}>
        <DialogContent className="sm:max-w-md font-mono text-xs bg-white text-slate-800 border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-sm uppercase text-indigo-950 font-bold">Developer API Credentials</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-500 font-medium">
              Configure target API authentication keys overrides to prevent rate limits during heavy testing. Keys are stored safely in local browser storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-700">GitHub Personal Access Token (PAT)</Label>
              <Input
                type="password"
                placeholder="ghp_..."
                value={githubTokenInput}
                onChange={(e) => setGithubTokenInput(e.target.value)}
                className="font-mono text-xs bg-slate-50 border border-slate-250 rounded-xl"
              />
              <p className="text-[9px] text-slate-500 leading-normal">
                Used dynamically in `fetchGithubActivity()` to authenticate public requests (limits increase from 60/hr to 5,000/hr).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { 
                setGithubTokenInput(""); 
                localStorage.removeItem("github_token_override"); 
                toast.success("API credentials cleared"); 
                setShowApiSettings(false); 
              }}
              className="font-bold font-mono text-[10px] uppercase"
            >
              Clear Keys
            </Button>
            <Button 
              size="sm" 
              onClick={() => { 
                localStorage.setItem("github_token_override", githubTokenInput.trim()); 
                toast.success("API credentials saved"); 
                setShowApiSettings(false); 
              }}
              className="font-bold font-mono text-[10px] uppercase bg-indigo-600 hover:bg-indigo-750 text-white"
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <img 
              src={suspect.photoUrl?.replace(/&amp;/g, '&')} 
              alt={suspect.realName} 
              className="h-full w-full object-cover"
              onError={(e) => {
                console.log('[HEADER] Profile photo failed to load:', suspect.photoUrl);
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(suspect.realName)}&size=256&background=0D8ABC&color=fff&bold=true`;
              }}
              onLoad={() => {
                console.log('[HEADER] Profile photo loaded successfully:', suspect.photoUrl);
              }}
            />
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
              onChange={e => setCaptionText(e.target.value)}
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




