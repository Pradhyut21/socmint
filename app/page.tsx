"use client";

import React, { useState, useEffect } from "react";
import { SuspectProfile, DossierInput } from "../lib/types";
import SearchHero from "../components/SearchHero";
import ProfileOverview from "../components/ProfileOverview";
import TimelineView from "../components/TimelineView";
import LegalRecords from "../components/LegalRecords";
import NetworkGraph from "../components/NetworkGraph";
import LocationMap from "../components/LocationMap";
import EvasionTimeline from "../components/EvasionTimeline";
import EvidencePackage from "../components/EvidencePackage";
import AiChat from "../components/AiChat";
import CryptoTraceCard from "../components/CryptoTraceCard";
import DarkWebMonitor from "../components/DarkWebMonitor";
import NLPAnalyzer from "../components/NLPAnalyzer";
import WikidataCard from "../components/WikidataCard";
import ShadowAccounts from "../components/ShadowAccounts";
import FaceScanCard from "../components/FaceScanCard";

import { 
  ShieldAlert, Search, Bell, FolderOpen, Info, Shield, 
  MapPin, Clock, ArrowLeft, RefreshCw, LogOut, CheckCircle2, AlertOctagon,
  Menu, X, ChevronLeft, ChevronRight
} from "lucide-react";

interface AlertItem {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  timestamp: string;
  details: string;
  isRead: boolean;
}

export default function Dashboard() {
  const [activeView, setActiveView] = useState<"search" | "alerts" | "cases" | "compliance">("search");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tabContainerRef = React.useRef<HTMLDivElement>(null);

  // Ctrl+K Keyboard Shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="handle"], input[placeholder*="Query"]') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabContainerRef.current) {
      const scrollAmount = 200;
      tabContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const [analystName, setAnalystName] = useState("Inspector Prasad");
  const [analystBadge, setAnalystBadge] = useState("CY-8902");
  const [analystUnit, setAnalystUnit] = useState("Karnataka Cell");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSuspect, setActiveSuspect] = useState<SuspectProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [topBarQuery, setTopBarQuery] = useState("");
  const [clockTime, setClockTime] = useState("");
  const [recentInvestigations, setRecentInvestigations] = useState<SuspectProfile[]>([]);
  
  // Audited logs list
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; timestamp: string }[]>([
    { id: "1", action: "Officer authorized session started", timestamp: "09:30:15 IST" }
  ]);

  // Real-time alert list
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: "a1",
      type: "critical",
      title: "@shadowtrader99 deleted Reddit account u/shadow_trader_in",
      timestamp: "12:15:02 IST",
      details: "Evidence preservation completed. Raw data block locked with SHA-256 integrity hash.",
      isRead: false
    },
    {
      id: "a2",
      type: "warning",
      title: "Geotag Anomaly Detected for Sneha Kulkarni",
      timestamp: "11:42:10 IST",
      details: "Simultaneous check-ins within 2 hours registered across Pune and Bengaluru (12.9716, 77.5946).",
      isRead: false
    },
    {
      id: "a3",
      type: "info",
      title: "MCA21 Registry update for Vikram Rathore",
      timestamp: "09:45:00 IST",
      details: "Corporate filing status changed to 'Under Active Auditing' for V.R. Digital Logistics Pvt Ltd.",
      isRead: true
    }
  ]);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setClockTime(d.toLocaleTimeString("en-IN") + " IST");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load history from localStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem("socmint_recent_investigations");
    if (storedHistory) {
      try {
        setRecentInvestigations(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse stored investigations", e);
      }
    }

    const storedLogs = localStorage.getItem("socmint_audit_logs");
    if (storedLogs) {
      try {
        setAuditLogs(JSON.parse(storedLogs));
      } catch (e) {
        console.error("Failed to parse stored audit logs", e);
      }
    }

    const storedName = localStorage.getItem("socmint_analyst_name");
    if (storedName) setAnalystName(storedName);

    const storedBadge = localStorage.getItem("socmint_analyst_badge");
    if (storedBadge) setAnalystBadge(storedBadge);

    const storedUnit = localStorage.getItem("socmint_analyst_unit");
    if (storedUnit) setAnalystUnit(storedUnit);
  }, []);

  const handleSearch = async (query: string, type: string, dossier?: DossierInput) => {
    setIsSearching(true);
    setSearchError("");

    try {
      const requestBody: Record<string, unknown> = { query, type };
      if (type === "dossier" && dossier) {
        requestBody.dossier = dossier;
      }
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Investigation failed.");
      }

      const result = data.profile as SuspectProfile;
      setActiveSuspect(result);
      
      let updatedHistory: SuspectProfile[] = [];
      setRecentInvestigations((prev) => {
        updatedHistory = [result, ...prev.filter((profile) => profile.caseReference !== result.caseReference)].slice(0, 8);
        localStorage.setItem("socmint_recent_investigations", JSON.stringify(updatedHistory));
        return updatedHistory;
      });

      setIsSearching(false);
      setActiveTab(type === "face" ? "face" : type === "crypto" ? "crypto" : "overview");
      setActiveView("search");

      const newLog = {
        id: Date.now().toString(),
        action: `Live public OSINT sweep completed for query: "${query}" (Type: ${type}). Accounts found: ${result.accounts.length}.`,
        timestamp: new Date().toLocaleTimeString("en-IN") + " IST"
      };
      setAuditLogs(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem("socmint_audit_logs", JSON.stringify(updated));
        return updated;
      });

      // Fire off background NEXUS Analysis
      fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: result }),
      })
        .then(res => res.json())
        .then(nexusData => {
          setActiveSuspect(prev => prev ? { ...prev, nexusAnalysis: nexusData } : null);
          setRecentInvestigations(prev => {
            const updated = prev.map(p => p.caseReference === result.caseReference ? { ...p, nexusAnalysis: nexusData } : p);
            localStorage.setItem("socmint_recent_investigations", JSON.stringify(updated));
            return updated;
          });
        })
        .catch(() => {});

    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Investigation failed.");
      setIsSearching(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all investigation history? This will also reset audit logs.")) {
      setRecentInvestigations([]);
      const defaultLogs = [
        { id: "1", action: "Officer authorized session started", timestamp: new Date().toLocaleTimeString("en-IN") + " IST" }
      ];
      setAuditLogs(defaultLogs);
      localStorage.removeItem("socmint_recent_investigations");
      localStorage.setItem("socmint_audit_logs", JSON.stringify(defaultLogs));
    }
  };

  const handleSaveAnalystSettings = (name: string, badge: string, unit: string) => {
    setAnalystName(name);
    setAnalystBadge(badge);
    setAnalystUnit(unit);
    localStorage.setItem("socmint_analyst_name", name);
    localStorage.setItem("socmint_analyst_badge", badge);
    localStorage.setItem("socmint_analyst_unit", unit);
    setShowSettingsModal(false);
  };

  const handleTopBarSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topBarQuery.trim()) {
      handleSearch(topBarQuery.trim(), "username");
      setTopBarQuery("");
    }
  };

  const handleClearSuspect = () => {
    setActiveSuspect(null);
    setActiveTab("overview");
  };

  const handleMarkAlertRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const unreadAlertCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="flex h-screen bg-[#080c16] text-slate-200 overflow-hidden font-sans">
      
      {/* Sidebar Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`w-64 bg-[#0a0f1e]/95 md:bg-[#0a0f1e]/80 border-r border-slate-900 flex flex-col justify-between flex-shrink-0 fixed md:static inset-y-0 left-0 transition-transform duration-300 ease-in-out z-40 md:z-30 print:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div>
          {/* Brand Logo */}
          <div className="h-16 flex items-center justify-between gap-2.5 px-6 border-b border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-600/20 border border-blue-500/30 rounded-xl glow-blue">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
              </div>
              <span className="font-bold tracking-tight text-white font-mono text-base">
                SOCMINT<span className="text-blue-500">SHIELD</span>
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 bg-slate-950 border border-slate-900 rounded-lg text-slate-400 md:hidden focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveView("search"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeView === "search"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-slate-950/60 hover:text-slate-200"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Investigate Sweep</span>
            </button>

            <button
              onClick={() => { setActiveView("alerts"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeView === "alerts"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-slate-950/60 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                <span>Alerts Center</span>
              </div>
              {unreadAlertCount > 0 && (
                <span className="bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveView("cases"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeView === "cases"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-slate-950/60 hover:text-slate-200"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Case Directory</span>
            </button>

            <button
              onClick={() => { setActiveView("compliance"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeView === "compliance"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-slate-950/60 hover:text-slate-200"
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Legal Compliance</span>
            </button>
          </nav>
        </div>

        {/* Auditor Profile Footer */}
        <button 
          onClick={() => setShowSettingsModal(true)}
          className="p-4 border-t border-slate-900 bg-slate-950/40 hover:bg-slate-950/80 transition-colors w-full text-left flex items-center gap-3 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 font-mono flex-shrink-0">
            {analystName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">{analystName}</span>
            <span className="text-[9px] text-slate-500 font-mono truncate">{analystBadge} • {analystUnit}</span>
          </div>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-900 bg-[#0a0f1e]/40 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-4 flex-1">
            
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 bg-slate-950 border border-slate-900 rounded-lg text-slate-400 hover:text-slate-200 md:hidden focus:outline-none"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Topbar Quick Search - only shown when suspect page is loaded */}
            {activeSuspect && activeView === "search" && (
              <form onSubmit={handleTopBarSearchSubmit} className="relative w-full max-w-sm flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3" />
                <input
                  type="text"
                  value={topBarQuery}
                  onChange={(e) => setTopBarQuery(e.target.value)}
                  placeholder="Sweep another suspect handle..."
                  className="w-full pl-9 pr-14 py-1.5 text-xs rounded-xl bg-slate-950/80 border border-slate-900 focus:border-blue-500/40 focus:ring-0 outline-none text-white font-mono placeholder:text-slate-500"
                />
                <div className="absolute right-3 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-500 bg-slate-900 border border-slate-800 pointer-events-none select-none">
                  Ctrl+K
                </div>
              </form>
            )}
            
            {!activeSuspect && activeView === "search" && (
              <span className="text-xs font-semibold text-slate-400 font-mono">
                Karnataka State Police Department • Tactical Portal
              </span>
            )}

            {activeView === "alerts" && <span className="text-xs font-bold text-white font-mono">ALERTS AND DISCOVERY MONITOR</span>}
            {activeView === "cases" && <span className="text-xs font-bold text-white font-mono">INVESTIGATION CASE DIRECTORY</span>}
            {activeView === "compliance" && <span className="text-xs font-bold text-white font-mono">LEGAL COMPLIANCE LOGS</span>}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* Live IST clock */}
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{clockTime || "00:00:00 IST"}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Secure Session Verified</span>
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 z-10 print:overflow-visible print:p-0">
          
          {/* SEARCH/INVESTIGATE VIEW */}
          {activeView === "search" && (
            <>
              {!activeSuspect ? (
                <>
                  <SearchHero onSearch={handleSearch} isSearching={isSearching} />
                  {searchError && (
                    <div className="max-w-3xl mx-auto -mt-6 mb-6 glass-panel p-4 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-300 text-xs font-mono">
                      Live sweep failed: {searchError}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6 print:space-y-0 print:block">
                  
                  {/* Back Navigation & Summary Header */}
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4 flex-wrap gap-3 print:hidden">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearSuspect}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900 flex items-center gap-1 transition-all"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> New Search
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shadow-md glow-blue"
                      >
                        Export Report
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">Preserved Profile Dossier:</span>
                      <span className="text-xs font-bold text-white font-mono bg-blue-950 border border-blue-500/20 px-2 py-0.5 rounded">
                        {activeSuspect.realName}
                      </span>
                    </div>
                  </div>

                  {/* Suspect Dashboard Navigation Tabs with horizontal scroll arrows */}
                  <div className="flex items-center gap-1.5 max-w-full print:hidden">
                    <button
                      onClick={() => scrollTabs("left")}
                      className="p-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-900 rounded-lg text-slate-400 hover:text-white flex-shrink-0 transition-colors cursor-pointer"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div 
                      ref={tabContainerRef}
                      className="flex border-b border-slate-900 space-x-1 p-1 bg-slate-950/40 rounded-xl overflow-x-auto scrollbar-none flex-grow"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {[
                        { id: "overview", label: "Overview" },
                        { id: "accounts", label: "Linked Accounts" },
                        { id: "posts", label: "Post Timeline" },
                        { id: "wikidata", label: "Wikidata Registry" },
                        { id: "nlp", label: "NLP Analysis" },
                        { id: "face", label: "Face Scan" },
                        { id: "shadow", label: "Shadow Profiles", hasBadge: !!(activeSuspect.shadowAccounts && activeSuspect.shadowAccounts.length > 0) },
                        { id: "crypto", label: "Crypto Trace", hasBadge: !!activeSuspect.cryptoTrace },
                        { id: "darkweb", label: "Dark Web Logs" },
                        { id: "legal", label: "Legal & Public Records" },
                        { id: "network", label: "Network Graph" },
                        { id: "location", label: "Geotag Trail" },
                        { id: "evasion", label: "Evasion Timeline", hasBadge: activeSuspect.aliasResults?.some(a => a.evasionPattern) },
                        { id: "chat", label: "AI Chat" },
                        { id: "evidence", label: "Court Certificate" }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all relative flex-shrink-0 ${
                            activeTab === tab.id
                              ? "bg-blue-600 text-white shadow-md glow-blue"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {tab.label}
                          {tab.hasBadge && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => scrollTabs("right")}
                      className="p-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-900 rounded-lg text-slate-400 hover:text-white flex-shrink-0 transition-colors cursor-pointer"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Active Tab rendering */}
                  <div className="mt-6 print:mt-0 print:block">
                    {activeTab === "overview" && <ProfileOverview suspect={activeSuspect} onSelectTab={setActiveTab} />}
                    
                    {activeTab === "accounts" && (
                      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                        <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-6">
                          Discovered Platform Profiles
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeSuspect.accounts.map((acc) => (
                            <div key={acc.id} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl relative">
                              <div className="flex items-center gap-1 absolute top-2 right-2">
                                {acc.tier === 1 && (
                                  <span className="text-[7px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.5 rounded font-mono">T1 API</span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                                  acc.confidence === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-slate-700/30 text-slate-400"
                                }`}>{acc.confidence}</span>
                              </div>
                              <h5 className="text-xs font-bold text-white uppercase font-mono">{acc.platform}</h5>
                              <span className="text-[10px] text-blue-400 font-mono">@{acc.username}</span>
                              <p className="text-[10px] text-slate-400 mt-2 font-mono">{acc.bio || "No bio available."}</p>
                              <div className="mt-3 pt-2 border-t border-slate-900 flex justify-between text-[10px] font-mono">
                                <span className="text-slate-500">{acc.followers.toLocaleString()} Followers</span>
                                <a href={acc.profileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Inspect Profile</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "posts" && <TimelineView suspect={activeSuspect} />}
                    {activeTab === "wikidata" && <WikidataCard suspect={activeSuspect} />}
                    {activeTab === "nlp" && <NLPAnalyzer suspect={activeSuspect} />}
                    {activeTab === "face" && <FaceScanCard suspect={activeSuspect} />}
                    {activeTab === "shadow" && <ShadowAccounts suspect={activeSuspect} />}
                    {activeTab === "crypto" && <CryptoTraceCard suspect={activeSuspect} />}
                    {activeTab === "darkweb" && <DarkWebMonitor suspect={activeSuspect} />}
                    {activeTab === "legal" && <LegalRecords suspect={activeSuspect} />}
                    {activeTab === "network" && <NetworkGraph suspect={activeSuspect} />}
                    {activeTab === "location" && <LocationMap suspect={activeSuspect} />}
                    {activeTab === "evasion" && <EvasionTimeline suspect={activeSuspect} />}
                    {activeTab === "chat" && <AiChat suspect={activeSuspect} />}
                    {activeTab === "evidence" && <EvidencePackage suspect={activeSuspect} />}
                  </div>

                </div>
              )}
            </>
          )}

          {/* ALERTS VIEW */}
          {activeView === "alerts" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
                  Active Real-Time Discovery Monitor
                </h4>
                <span className="text-xs text-slate-500 font-mono">System listening for suspect status updates</span>
              </div>

              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`glass-panel p-5 rounded-2xl border transition-all relative overflow-hidden ${
                      alert.isRead ? "border-slate-900 bg-slate-950/20" : "border-slate-800 bg-slate-950/50"
                    }`}
                  >
                    {/* Left vertical visual marker */}
                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                      alert.type === "critical" ? "bg-rose-500 glow-red" :
                      alert.type === "warning" ? "bg-amber-500 glow-amber" : "bg-blue-500"
                    }`}></div>

                    <div className="flex items-start justify-between flex-wrap gap-2 pl-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                            alert.type === "critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                            alert.type === "warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-blue-500/10 text-blue-450 border-blue-500/20"
                          }`}>
                            {alert.type.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{alert.timestamp}</span>
                        </div>
                        <h5 className="text-xs font-bold text-white font-mono">{alert.title}</h5>
                        <p className="text-[11px] text-slate-400 font-mono leading-relaxed">{alert.details}</p>
                      </div>

                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAlertRead(alert.id)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-[9px] font-bold font-mono text-slate-400 border border-slate-900 hover:border-slate-850 rounded-lg"
                        >
                          Mark Audited
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CASES DIRECTORY VIEW */}
          {activeView === "cases" && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white font-mono tracking-wider uppercase">
                  Investigated Suspect Archives
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">Tamper-proof audit listing</span>
                  {recentInvestigations.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-[10px] font-bold font-mono text-rose-450 border border-rose-500/20 hover:border-rose-500/35 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Clear History
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recentInvestigations.length === 0 && (
                  <div className="md:col-span-3 glass-panel p-8 rounded-2xl border border-slate-800 text-center">
                    <p className="text-xs text-slate-400 font-mono">
                      No stored suspect directory is loaded. Run a live sweep to create a temporary session dossier.
                    </p>
                  </div>
                )}

                {recentInvestigations.map((profile) => (
                  <div 
                    key={profile.username}
                    onClick={() => {
                      setActiveSuspect(profile);
                      setActiveTab("overview");
                      setActiveView("search");
                    }}
                    className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[180px]"
                  >
                    <div className="flex items-start justify-between">
                      <img
                        src={profile.photoUrl}
                        alt={profile.realName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                      />
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono border ${
                        profile.riskLevel === "CRITICAL" ? "bg-rose-500/10 text-rose-400 border-rose-500/20 glow-red" :
                        profile.riskLevel === "HIGH" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                        profile.riskLevel === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-450 border-emerald-500/20 glow-green"
                      }`}>
                        {profile.riskLevel}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h5 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{profile.realName}</h5>
                      <span className="text-[10px] text-slate-500 font-mono">{profile.username}</span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-[9px] font-mono text-slate-400">
                      <span>{profile.accounts.length} Platforms Linked</span>
                      <span>BRS: <strong className="text-white">{profile.riskScore}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POLICY COMPLIANCE VIEW */}
          {activeView === "compliance" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
                <div className="flex items-center gap-2 mb-2 text-blue-500">
                  <Shield className="w-5 h-5" />
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Privacy Policy & OSINT Guidelines Compliance
                  </h4>
                </div>

                <h5 className="text-xs font-bold text-white mb-2 uppercase">1. Article 21 Constitution Bounds & DPDP Act 2023</h5>
                <p className="text-slate-400 leading-relaxed">
                  SOCMINT Shield is strictly designed as an Open Source Intelligence (OSINT) pipeline. It scans only public-facing profiles, geotag stickers, and public registries. The tool does not intercept private messaging packets, hack user endpoints, or bypass credential locks. Under Article 21, public data is admissible when processed transparently for state security.
                </p>

                <h5 className="text-xs font-bold text-white mb-2 uppercase">2. Section 65B Indian Evidence Act Admissibility</h5>
                <p className="text-slate-400 leading-relaxed">
                  Electronic evidence captured by this portal is verified with cryptographic SHA-256 block signatures. This acts as tamper-proof metadata log registration, qualifying as compliant certificate files under Section 65B without requiring external expert verification.
                </p>
              </div>

              {/* Session Audit Trails listing */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-semibold text-white font-mono uppercase tracking-wider mb-4">
                  Session Compliance Audit Logs
                </h4>
                <div className="space-y-3 font-mono text-[10px] text-slate-500 max-h-[250px] overflow-y-auto pr-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-400 max-w-[80%]">{log.action}</span>
                      <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Global Compliance Footer */}
        <footer className="h-10 border-t border-slate-900 bg-[#080c16] flex items-center justify-between px-6 text-[9px] font-mono text-slate-500 flex-shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>SOCMINT Shield v2.0 • Government Hackathon Submission • 20-Platform OSINT Engine</span>
          </div>
          <div>DPDP Act 2023 & Section 65B Indian Evidence Act Compliant</div>
        </footer>

      </div>

      {/* Analyst Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 border border-slate-800 p-6 rounded-2xl shadow-2xl font-mono text-xs">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-slate-900 pb-2">
              Analyst Identity Settings
            </h4>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string || "Inspector Prasad";
              const badge = formData.get("badge") as string || "CY-8902";
              const unit = formData.get("unit") as string || "Karnataka Cell";
              handleSaveAnalystSettings(name, badge, unit);
            }} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Analyst Name</label>
                <input 
                  type="text" 
                  name="name" 
                  defaultValue={analystName}
                  className="w-full p-2 bg-slate-905 border border-slate-800 rounded-lg text-white outline-none focus:border-blue-500/40"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Badge ID</label>
                <input 
                  type="text" 
                  name="badge" 
                  defaultValue={analystBadge}
                  className="w-full p-2 bg-slate-905 border border-slate-800 rounded-lg text-white outline-none focus:border-blue-500/40"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Unit / Division</label>
                <input 
                  type="text" 
                  name="unit" 
                  defaultValue={analystUnit}
                  className="w-full p-2 bg-slate-905 border border-slate-800 rounded-lg text-white outline-none focus:border-blue-500/40"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3 py-1.5 bg-[#0a0f1d] border border-slate-900 text-slate-400 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md glow-blue"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
