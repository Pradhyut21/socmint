"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Square, Terminal, CheckCircle2, AlertCircle, AlertTriangle, 
  ExternalLink, Pin, Plus, Search, Users, Check, Loader2, ShieldCheck, 
  ChevronRight, ChevronDown, FileText, Info, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { getProvidersForInput, PROVIDERS, OsintProvider, EntityType } from "@/lib/providers/osint";
import { detectEntityType } from "@/lib/osintRunner";
import { NormalizedFinding, ToolkitExecution, SuspectProfile } from "@/lib/types";
import { pinEvidence } from "@/lib/evidence/evidenceCaptureService";

// Standard OSINT Framework category node tree
interface FrameworkNode {
  name: string;
  children?: FrameworkNode[];
  toolId?: string;
  link?: string;
}

const OSINT_FRAMEWORK_TREE: FrameworkNode[] = [
  {
    name: "Username Enumeration",
    children: [
      { name: "Username Correlation Engine (Username search)", toolId: "sherlock" },
      { name: "Platform Discovery (Deep username profiling)", toolId: "maigret" },
      { name: "Search Intel (Dorks/Social check)", toolId: "search_intel" },
    ]
  },
  {
    name: "Email Address",
    children: [
      { name: "Holehe (Registered services check)", toolId: "holehe" },
      { name: "Search Intel (Dorks/Breach check)", toolId: "search_intel" },
      { name: "OSINT Intelligence Pipeline (Email reputation)", toolId: "spiderfoot" },
    ]
  },
  {
    name: "Phone Number",
    children: [
      { name: "PhoneInfoga (Carrier/Lookup)", toolId: "phoneinfoga" },
      { name: "Search Intel (Directories)", toolId: "search_intel" }
    ]
  },
  {
    name: "Domain & Infrastructure",
    children: [
      { name: "theHarvester (Subdomains/Emails)", toolId: "theharvester" },
      { name: "OSINT Intelligence Pipeline (IP/Domain footprint)", toolId: "spiderfoot" },
      { name: "Recon-ng (Workspace import)", toolId: "reconng" },
    ]
  }
];

export default function ToolkitPage() {
  const [suspects, setSuspects] = useState<SuspectProfile[]>([]);
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectProfile | null>(null);
  const [query, setQuery] = useState("");
  const [activeProviderId, setActiveProviderId] = useState<string>("sherlock");
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Execution states
  const [running, setRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [executionHistory, setExecutionHistory] = useState<ToolkitExecution[]>([]);
  const [findings, setFindings] = useState<NormalizedFinding[]>([]);
  const [pinnedFindingIds, setPinnedFindingIds] = useState<Set<string>>(new Set());
  
  // Epieos Manual Import Form States
  const [importDisplayName, setImportDisplayName] = useState("");
  const [importEmail, setImportEmail] = useState("");
  const [importPhone, setImportPhone] = useState("");
  const [importUsername, setImportUsername] = useState("");
  const [importSourceUrl, setImportSourceUrl] = useState("https://epieos.com");
  const [importProfileUrl, setImportProfileUrl] = useState("");
  const [importCompany, setImportCompany] = useState("");
  const [importEducation, setImportEducation] = useState("");
  const [importCountry, setImportCountry] = useState("");
  const [importRegion, setImportRegion] = useState("");
  const [importNotes, setImportNotes] = useState("");
  const [importConfidence, setImportConfidence] = useState("medium");
  
  // Expanded nodes for OSINT Framework tree view
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "Username Enumeration": true
  });
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const activeProvider = PROVIDERS.find(p => p.id === activeProviderId) || PROVIDERS[0];

  // Load suspects and executions on mount
  useEffect(() => {
    const list = storage.getRecent();
    setSuspects(list);
    if (list.length > 0) {
      setSelectedSuspect(list[0]);
      // Pre-fill query with primary username or domain
      setQuery(list[0].username || list[0].domainIntel?.query || "");
      setImportEmail(list[0].emailAddress || "");
      setImportPhone(list[0].phoneNumber || "");
      setImportUsername(list[0].username || "");
    }
  }, []);

  // Fetch execution history for the active suspect
  useEffect(() => {
    if (!selectedSuspect) return;
    
    // 1. Fetch from server API to guarantee persistence
    const fetchServerToolkitData = async () => {
      try {
        const resp = await fetch(`/api/toolkit?case=${encodeURIComponent(selectedSuspect.caseReference)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.executions && data.executions.length > 0) {
            setExecutionHistory(data.executions);
            setFindings(data.findings);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to fetch server toolkit data:", e);
      }
      
      // 2. Fallback to suspect profile arrays if server is blank
      setExecutionHistory(selectedSuspect.toolkitExecutions || []);
      setFindings(selectedSuspect.toolkitFindings || []);
    };
    
    fetchServerToolkitData();
  }, [selectedSuspect]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  const handleSuspectSelect = (suspectId: string) => {
    const s = suspects.find(x => x.caseReference === suspectId);
    if (s) {
      setSelectedSuspect(s);
      setQuery(s.username || s.domainIntel?.query || "");
      setImportEmail(s.emailAddress || "");
      setImportPhone(s.phoneNumber || "");
      setImportUsername(s.username || "");
      toast.info(`Loaded suspect dossier: ${s.realName}`);
    }
  };

  const handleRunProvider = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query (username, email, phone, or domain).");
      return;
    }
    
    if (!selectedSuspect) {
      toast.error("Please select or open an active case dossier first.");
      return;
    }

    setRunning(true);
    setActiveTab("run");
    setTerminalLogs([]);
    
    // Start polling the server for logs in real-time
    const pollingInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/toolkit?case=${encodeURIComponent(selectedSuspect.caseReference)}`);
        if (resp.ok) {
          const data = await resp.json();
          const activeExec = data.executions?.find((e: any) => e.providerId === activeProvider.id);
          if (activeExec && activeExec.logs) {
            setTerminalLogs(activeExec.logs);
          }
        }
      } catch (e) {
        console.error("Failed to poll logs:", e);
      }
    }, 800);

    try {
      // Trigger server-side execution
      const response = await fetch("/api/toolkit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseReference: selectedSuspect.caseReference,
          run: true,
          query: query.trim(),
          providerIds: [activeProvider.id]
        })
      });

      clearInterval(pollingInterval);

      if (response.ok) {
        const data = await response.json();
        const finalExec = data.executions?.find((e: any) => e.providerId === activeProvider.id);
        if (finalExec && finalExec.logs) {
          setTerminalLogs(finalExec.logs);
        }
        
        setExecutionHistory(data.executions || []);
        setFindings(data.findings || []);

        const success = finalExec?.status === "SUCCESS";
        if (success) {
          toast.success(`${activeProvider.name} scan completed!`);
          
          // Save back to suspect profile
          const updatedSuspect = {
            ...selectedSuspect,
            toolkitExecutions: data.executions || [],
            toolkitFindings: data.findings || []
          };
          
          // Update LocalStorage
          storage.pushRecent(updatedSuspect);
          
          setActiveTab("results");
        } else {
          toast.error(`${activeProvider.name} scan failed. Check logs.`);
        }
      } else {
        toast.error("Server execution failed.");
      }
    } catch (err) {
      clearInterval(pollingInterval);
      console.error("Toolkit execution failed:", err);
      toast.error("An error occurred during tool execution.");
    } finally {
      setRunning(false);
    }
  };

  const handlePinFinding = async (finding: NormalizedFinding) => {
    if (!selectedSuspect) return;
    
    try {
      const art = await pinEvidence({
        caseReference: selectedSuspect.caseReference,
        sourcePlatform: finding.source,
        sourceUrl: finding.url,
        query: finding.entity,
        title: finding.title,
        textSnapshot: `${finding.title}\n${finding.description}\nCategory: ${finding.category}\nProvider: ${finding.provider}\nCaptured: ${finding.timestamp}`,
        provenance: `toolkit_${finding.provider}`,
        tags: ["toolkit", finding.category.toLowerCase().replace(/\s/g, "_")]
      });

      // Mirror onto server side /api/evidence
      await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(art)
      });
      
      setPinnedFindingIds(prev => new Set([...prev, finding.id]));
      toast.success("Finding pinned to case evidence locker successfully!");
      storage.pushAudit("TOOLKIT_EVIDENCE_PINNED", `${finding.provider} - ${finding.title}`);
    } catch (e) {
      toast.error("Failed to pin finding as evidence.");
      console.error(e);
    }
  };

  const handleImportEpieosFinding = async () => {
    if (!selectedSuspect) {
      toast.error("Please select an active suspect dossier first.");
      return;
    }

    if (!importNotes.trim() && !importDisplayName.trim() && !importProfileUrl.trim()) {
      toast.error("Please provide at least a Display Name, Profile URL, or Notes to import.");
      return;
    }

    try {
      const rawData = {
        displayName: importDisplayName,
        email: importEmail,
        phone: importPhone,
        username: importUsername,
        sourceUrl: importSourceUrl,
        profileUrl: importProfileUrl,
        company: importCompany,
        education: importEducation,
        country: importCountry,
        region: importRegion,
        notes: importNotes,
        confidence: importConfidence
      };

      const newFindings: NormalizedFinding[] = [
        {
          id: `manual-import-${Date.now()}`,
          title: importDisplayName ? "Identity Profile Reference" : "Intelligence Reference Notes",
          description: importNotes || `Manual import: ${[importDisplayName, importCompany, importEducation, importCountry].filter(Boolean).join(" · ")}`,
          source: importSourceUrl || "Manual Input",
          url: importProfileUrl || null,
          confidence: (typeof importConfidence === "number" ? importConfidence : parseFloat(importConfidence) || 80) / 100,
          category: "IDENTITY",
          entity: query,
          provider: "Epieos (Manual)",
          timestamp: new Date().toISOString(),
        }
      ];

      const allMerged = [...newFindings, ...findings];
      
      const execId = `exec-epieos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const execution: ToolkitExecution = {
        id: execId,
        caseReference: selectedSuspect.caseReference,
        providerId: "epieos",
        query: query,
        timestamp: new Date().toISOString(),
        durationMs: 0,
        status: "SUCCESS",
        findingsCount: newFindings.length,
        logs: [
          "[INFO] Analyst manually imported Epieos findings.",
          `[+] Display Name: ${importDisplayName || "N/A"}`,
          `[+] Profile URL: ${importProfileUrl || "N/A"}`,
          `[+] Notes: ${importNotes || "N/A"}`
        ]
      };

      const updatedExecs = [execution, ...executionHistory].slice(0, 50);
      setExecutionHistory(updatedExecs);
      setFindings(allMerged);

      const updatedSuspect = {
        ...selectedSuspect,
        toolkitExecutions: updatedExecs,
        toolkitFindings: allMerged
      };
      storage.pushRecent(updatedSuspect);

      await fetch("/api/toolkit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseReference: selectedSuspect.caseReference,
          executions: [execution],
          findings: newFindings
        })
      });

      toast.success("Epieos findings successfully imported and correlated!");
      storage.pushAudit("TOOLKIT_EPIEOS_IMPORTED", `Imported ${newFindings.length} Epieos findings.`);

      setImportDisplayName("");
      setImportProfileUrl("");
      setImportCompany("");
      setImportEducation("");
      setImportCountry("");
      setImportRegion("");
      setImportNotes("");
      
      setActiveTab("results");
    } catch (e) {
      toast.error("Failed to import Epieos findings.");
      console.error(e);
    }
  };

  const toggleNode = (name: string) => {
    setExpandedNodes(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const loadFromFramework = (toolId: string) => {
    setActiveProviderId(toolId);
    setActiveTab("overview");
    toast.info(`Activated tool workspace: ${PROVIDERS.find(p => p.id === toolId)?.name}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      {/* Upper header controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Terminal className="h-7 w-7 text-stamp" /> OSINT Toolkit & Integrations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modular plugin environment for triggering and capturing public source intelligence.
          </p>
        </div>
        
        {/* Active case selector & query */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="font-mono text-[10px] uppercase text-muted-foreground font-bold mb-1">Active Suspect Dossier</label>
            <select
              value={selectedSuspect?.caseReference || ""}
              onChange={(e) => handleSuspectSelect(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-stamp"
            >
              {suspects.map((s) => (
                <option key={s.caseReference} value={s.caseReference}>
                  {s.realName} ({s.caseReference.slice(0, 12)})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col min-w-[200px]">
            <label className="font-mono text-[10px] uppercase text-muted-foreground font-bold mb-1">Scan Target / Input</label>
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. shadowtrader99"
                className="pr-8 h-9"
              />
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Column 1: Left sidebar - Tool Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">OSINT Provider Registry</CardTitle>
            </CardHeader>
            <CardContent className="px-2 py-0 pb-3">
              <nav className="space-y-1">
                {PROVIDERS.map((prov) => {
                  const isActive = prov.id === activeProviderId;
                  const supportsType = prov.supportedInputs.includes(detectEntityType(query));
                  return (
                    <button
                      key={prov.id}
                      onClick={() => { setActiveProviderId(prov.id); setActiveTab("overview"); }}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-xs font-mono transition-colors flex items-center justify-between ${
                        isActive 
                          ? "bg-ink text-paper" 
                          : "hover:bg-muted text-foreground/85"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Terminal className={`h-3.5 w-3.5 ${isActive ? "text-stamp" : "text-muted-foreground"}`} />
                        {prov.name}
                      </span>
                      {supportsType ? (
                        <Badge variant="outline" className="text-[9px] uppercase border-emerald-500/30 bg-emerald-500/5 text-emerald-600">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] uppercase border-amber-500/20 bg-amber-500/5 text-amber-600">Inactive</Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
              
              <div className="mt-4 px-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs font-mono"
                  onClick={() => setActiveTab("framework")}
                >
                  <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> OSINT Framework Tree
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2 & 3: Center - Provider Workspace */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full min-h-[600px] flex flex-col">
            <CardHeader className="border-b border-border bg-slate-50/50 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg font-semibold">{activeProvider.name} Workspace</CardTitle>
                <CardDescription className="text-xs">Configure and run simulated investigations</CardDescription>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(activeProvider.id === "epieos" 
                  ? ["overview", "capabilities", "manual_lookup", "import_findings", "compliance"] 
                  : ["overview", "run", "results"]
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-[10px] uppercase font-mono border transition-colors ${
                      activeTab === tab
                        ? "bg-ink text-paper border-ink"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.replace("_", " ")}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-5 flex flex-col">
              
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <div>
                      <h3 className="font-display font-semibold text-base mb-1.5">Overview</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{activeProvider.overview}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Platform Capabilities</h3>
                      <ul className="space-y-1.5 text-xs list-disc pl-5">
                        {activeProvider.capabilities.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">CLI / Installation Syntax</h3>
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-950">
                        <code>{activeProvider.installation}</code>
                      </pre>
                    </div>

                    {activeProvider.id === "epieos" ? (
                      <div className="pt-6 flex justify-end">
                        <Button 
                          onClick={() => setActiveTab("manual_lookup")} 
                          className="bg-stamp hover:bg-stamp-hover text-white font-mono text-xs"
                        >
                          Proceed to Manual Lookup
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-6 flex justify-end">
                        <Button 
                          onClick={handleRunProvider} 
                          disabled={running} 
                          className="bg-stamp hover:bg-stamp-hover text-white font-mono text-xs"
                        >
                          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                          Execute Simulated Run
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "capabilities" && activeProvider.id === "epieos" && (
                  <motion.div
                    key="capabilities"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <h3 className="font-display font-semibold text-base mb-1.5">Epieos Investigation Capabilities</h3>
                    <p className="text-sm text-muted-foreground">Epieos targets three primary identifier groups and crawls public registers to compile intelligence:</p>
                    <ul className="space-y-2.5 text-xs list-disc pl-5">
                      <li><strong>Email Search</strong>: Resolves Google profile details (Display Name, User ID), maps Google Calendar slot details, and identifies registered services.</li>
                      <li><strong>Phone Search</strong>: Locates carrier registration details and checks public profile links.</li>
                      <li><strong>Username Lookup</strong>: Enumerates existence and retrieves profile records.</li>
                    </ul>
                  </motion.div>
                )}

                {activeTab === "manual_lookup" && activeProvider.id === "epieos" && (
                  <motion.div
                    key="manual_lookup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <div>
                      <h3 className="font-display font-semibold text-base mb-1">Manual Intelligence Lookup</h3>
                      <p className="text-xs text-muted-foreground">Opening Epieos launches the official lookup portal. No automated scraping is conducted.</p>
                    </div>

                    <div className="space-y-3 border border-border bg-slate-50/50 p-4 rounded-xl">
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground font-bold">Investigator Target Email</label>
                        <Input value={importEmail} onChange={(e) => setImportEmail(e.target.value)} placeholder="name@domain.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground font-bold">Investigator Target Phone</label>
                        <Input value={importPhone} onChange={(e) => setImportPhone(e.target.value)} placeholder="+91 98765 43210" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground font-bold">Investigator Target Username</label>
                        <Input value={importUsername} onChange={(e) => setImportUsername(e.target.value)} placeholder="handle" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-4 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => {
                          const id = importEmail || importPhone || importUsername || query;
                          navigator.clipboard.writeText(id);
                          toast.success("Identifier copied to clipboard!");
                        }}
                      >
                        Copy Identifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => {
                          const notes = `Investigation Record - Epieos Lookup\nCase Reference: ${selectedSuspect?.caseReference || "STANDALONE"}\nTarget Identifiers:\n- Username: ${importUsername || "N/A"}\n- Email: ${importEmail || "N/A"}\n- Phone: ${importPhone || "N/A"}\nLookup time: ${new Date().toLocaleString()}`;
                          navigator.clipboard.writeText(notes);
                          toast.success("Investigation draft notes copied to clipboard!");
                        }}
                      >
                        Copy Investigation Notes
                      </Button>
                      <Button
                        className="bg-stamp hover:bg-stamp-hover text-white font-mono text-xs"
                        onClick={() => {
                          const qVal = importEmail || importPhone || importUsername || query;
                          window.open(`https://epieos.com/?q=${encodeURIComponent(qVal)}`, "_blank");
                          storage.pushAudit("TOOLKIT_EPIEOS_OPENED", qVal);
                        }}
                      >
                        Open Epieos <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {activeTab === "import_findings" && activeProvider.id === "epieos" && (
                  <motion.div
                    key="import_findings"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <div>
                      <h3 className="font-display font-semibold text-base mb-1">Import External Findings</h3>
                      <p className="text-xs text-muted-foreground">Manually register public Epieos information. Imported findings are correlated with other providers.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      <div className="space-y-1 col-span-2">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Display Name</label>
                        <Input value={importDisplayName} onChange={(e) => setImportDisplayName(e.target.value)} placeholder="Google/Social account display name" className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Source URL</label>
                        <Input value={importSourceUrl} onChange={(e) => setImportSourceUrl(e.target.value)} placeholder="https://epieos.com" className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Public Profile URL</label>
                        <Input value={importProfileUrl} onChange={(e) => setImportProfileUrl(e.target.value)} placeholder="Linked account profile URL" className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Company / Employer</label>
                        <Input value={importCompany} onChange={(e) => setImportCompany(e.target.value)} placeholder="Company" className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Education</label>
                        <Input value={importEducation} onChange={(e) => setImportEducation(e.target.value)} placeholder="College / school" className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Country</label>
                        <Input value={importCountry} onChange={(e) => setImportCountry(e.target.value)} placeholder="e.g. India" className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Region / City</label>
                        <Input value={importRegion} onChange={(e) => setImportRegion(e.target.value)} placeholder="e.g. Bengaluru" className="h-8" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Assigned Confidence</label>
                        <select
                          value={importConfidence}
                          onChange={(e) => setImportConfidence(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-stamp"
                        >
                          <option value="high">High (Analyst Verified)</option>
                          <option value="medium">Medium (Probable Match)</option>
                          <option value="low">Low (Exploratory Match)</option>
                        </select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Public Notes / Observations</label>
                        <textarea
                          value={importNotes}
                          onChange={(e) => setImportNotes(e.target.value)}
                          placeholder="Describe matching profiles, avatar findings, or calendar slots identified..."
                          className="w-full bg-background border border-border rounded-md p-2 text-xs h-16 outline-none focus:ring-1 focus:ring-stamp"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={handleImportEpieosFinding}
                        className="bg-stamp hover:bg-stamp-hover text-white font-mono text-xs"
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Import Finding into Case
                      </Button>
                    </div>
                  </motion.div>
                )}

                {activeTab === "compliance" && activeProvider.id === "epieos" && (
                  <motion.div
                    key="compliance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <div>
                      <h3 className="font-display font-semibold text-base mb-1">Epieos Compliance Audit</h3>
                      <p className="text-xs text-muted-foreground">SOCMINT Shield enforces a clear demarcation between automation and investigator research.</p>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed">
                      <div className="p-3 bg-slate-50 border border-border rounded-xl">
                        <span className="font-bold text-slate-800 block mb-1">✓ Supported Operations</span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-650">
                          <li>Manual redirections to the official Epieos user interface.</li>
                          <li>Analyst-verified import of public record findings.</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-rose-50/50 border border-rose-200/50 rounded-xl">
                        <span className="font-bold text-rose-700 block mb-1">✗ Restricted Operations (Prohibited)</span>
                        <ul className="list-disc pl-4 space-y-1 text-rose-800">
                          <li>Website scraping or automatic browser scripts.</li>
                          <li>Credential bypass or session hijacking.</li>
                          <li>Reverse engineered requests to Epieos endpoints.</li>
                        </ul>
                      </div>

                      <p className="italic text-muted-foreground text-[10px]">
                        Note: SOCMINT Shield intentionally performs only analyst-assisted integration for Epieos to comply with its Terms of Service.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === "run" && (
                  <motion.div
                    key="run"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex-1 flex flex-col h-full"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Terminal className="h-4 w-4 text-emerald-500" /> CLI Terminal Session
                      </span>
                      {running ? (
                        <Badge className="bg-emerald-500 text-white font-mono text-[9px] uppercase animate-pulse">Running</Badge>
                      ) : (
                        <Badge variant="outline" className="font-mono text-[9px] uppercase">Ready</Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] min-h-[300px] overflow-y-auto max-h-[450px] border border-slate-900 select-all shadow-inner space-y-1.5">
                      {terminalLogs.length === 0 ? (
                        <div className="text-slate-500 italic py-10 text-center">
                          Waiting for execution... Click "Execute Simulated Run" to initialize.
                        </div>
                      ) : (
                        terminalLogs.map((line, idx) => (
                          <div key={idx} className={line.startsWith("[ERROR]") ? "text-rose-500 font-bold" : line.startsWith("[+]") ? "text-emerald-300" : "text-slate-350"}>
                            {line}
                          </div>
                        ))
                      )}
                      <div ref={terminalEndRef} />
                    </div>
                  </motion.div>
                )}

                {activeTab === "results" && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="font-display font-semibold text-base">Normalized Scan Findings</h3>
                      <Badge variant="outline" className="font-mono text-xs">
                        Count: {findings.filter(f => f.provider === activeProvider.id).length}
                      </Badge>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {findings.filter(f => f.provider === activeProvider.id).length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground italic">
                          No normalized findings recorded. Run the provider scan first.
                        </div>
                      ) : (
                        findings
                          .filter(f => f.provider === activeProvider.id)
                          .map((finding) => {
                            const isPinned = pinnedFindingIds.has(finding.id);
                            return (
                              <div 
                                key={finding.id} 
                                className="p-3 border border-border rounded-xl bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors flex items-start justify-between gap-3 shadow-sm"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-display font-semibold text-sm text-foreground">{finding.title}</h4>
                                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                                      {finding.category}
                                    </Badge>
                                    <Badge className="bg-slate-100 text-slate-800 text-[9px] font-mono border-none">
                                      Conf: {Math.round(finding.confidence * 100)}%
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{finding.description}</p>
                                  {finding.url && (
                                    <a 
                                      href={finding.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="inline-flex items-center text-[10px] font-mono text-stamp hover:underline"
                                    >
                                      {finding.url} <ExternalLink className="ml-1 h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <Button
                                  variant={isPinned ? "secondary" : "outline"}
                                  size="icon"
                                  onClick={() => handlePinFinding(finding)}
                                  disabled={isPinned}
                                  className="h-8 w-8 shrink-0 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                >
                                  {isPinned ? <Check className="h-4 w-4 text-emerald-600" /> : <Pin className="h-4 w-4" />}
                                </Button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "framework" && (
                  <motion.div
                    key="framework"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 flex-1"
                  >
                    <div>
                      <h3 className="font-display font-semibold text-base mb-1">OSINT Framework Tree</h3>
                      <p className="text-xs text-muted-foreground">Select a category and load the corresponding tool into your active workspace.</p>
                    </div>

                    <div className="border border-border rounded-xl bg-slate-50/50 p-4 space-y-3 font-mono text-xs max-h-[400px] overflow-y-auto">
                      {OSINT_FRAMEWORK_TREE.map((category) => {
                        const isExpanded = !!expandedNodes[category.name];
                        return (
                          <div key={category.name} className="space-y-1">
                            <button
                              onClick={() => toggleNode(category.name)}
                              className="w-full flex items-center gap-1.5 font-bold text-foreground/80 hover:text-ink text-left"
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                              {category.name}
                            </button>
                            
                            {isExpanded && category.children && (
                              <div className="pl-6 space-y-1 border-l border-slate-200 ml-2 pt-1">
                                {category.children.map((child) => (
                                  <div key={child.name} className="flex items-center justify-between py-1 hover:bg-slate-100/50 px-2 rounded-md transition-colors">
                                    <span className="text-muted-foreground">{child.name}</span>
                                    {child.toolId && (
                                      <button
                                        onClick={() => loadFromFramework(child.toolId!)}
                                        className="text-[10px] bg-white border border-border hover:border-slate-350 hover:bg-muted font-mono rounded px-1.5 py-0.5 text-stamp"
                                      >
                                        Load tool
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
            </CardContent>
          </Card>
        </div>

        {/* Column 4: Right - Compliance & Metrics */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Compliance Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Compliance Boundaries
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3 text-xs">
              <div>
                <span className="font-semibold block text-slate-800">Supported:</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-650 font-medium">
                  {activeProvider.compliance.supported.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              
              <div>
                <span className="font-semibold block text-rose-600">Restricted (Do NOT execute):</span>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-rose-800">
                  {activeProvider.compliance.restricted.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              <div className="rounded bg-amber-50/50 border border-amber-200/50 p-2">
                <span className="font-semibold block text-amber-800 text-[10px] uppercase font-mono">Safe Alternative:</span>
                <p className="mt-1 text-amber-900 leading-relaxed text-[11px]">{activeProvider.compliance.safeAlternative}</p>
              </div>

              <div className="text-[10px] text-muted-foreground border-t border-border pt-2 italic">
                {activeProvider.compliance.socmintShieldIntegration}
              </div>
            </CardContent>
          </Card>

          {/* Cross-provider confidence analysis */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Provider Confidence
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Attribution Level:</span>
                {findings.length > 0 ? (
                  <Badge className="bg-emerald-500 text-white font-mono uppercase text-[9px]">Corroborated</Badge>
                ) : (
                  <Badge variant="outline" className="font-mono uppercase text-[9px]">Unverified</Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-slate-650">
                  <span>Confidence Rating</span>
                  <span className="font-bold">
                    {findings.length > 0 
                      ? `${Math.round(findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length * 100)}%` 
                      : "0%"}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${findings.length > 0 ? (findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length * 100) : 0}%` }}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Cross-Provider Correlations</span>
                {findings.length > 0 ? (
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <div className="flex items-center justify-between py-1 bg-slate-50 border border-slate-100 rounded px-2">
                      <span className="text-slate-600">Attribution matches:</span>
                      <span className="font-bold text-slate-800">
                        {findings.filter(f => findings.some(fo => fo.id !== f.id && fo.url === f.url)).length / 2} verified
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">Execute multiple sweeps (e.g. Username Correlation Engine + Platform Discovery) to match indicators.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Execution History Log */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-500" /> Session Run Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2.5 max-h-[220px] overflow-y-auto">
              {executionHistory.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic text-center py-6">
                  No execution logs for this session.
                </div>
              ) : (
                executionHistory.map((exec) => (
                  <div key={exec.id} className="font-mono text-[10px] border-b border-border pb-2 last:border-b-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {PROVIDERS.find(p => p.id === exec.providerId)?.name || exec.providerId}
                      </span>
                      <span className={`text-[9px] px-1 rounded uppercase ${exec.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {exec.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>{exec.durationMs}ms</span>
                      <span>{exec.findingsCount} items</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
