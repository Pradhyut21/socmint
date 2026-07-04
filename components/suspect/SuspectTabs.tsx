"use client";

import React, { useRef, useState, type ReactNode } from "react";
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
  AlertCircle, Clock, Send, IndianRupee, PhoneCall, ShieldX, FilePlus, ExternalLink,
  Briefcase, Building2, GraduationCap, GitCommit, Info, Archive, Mail, Network,
} from "lucide-react";



import type { SuspectProfile, RiskLevel, PlatformAccount } from "@/lib/types";
import { riskColor } from "@/lib/utils";

// Import real forensic components from workspace
import TimelineView from "@/components/TimelineView";
import WikidataCard from "@/components/WikidataCard";
import NLPAnalyzer from "@/components/NLPAnalyzer";
import FaceScanCard from "@/components/FaceScanCard";
import ShadowAccounts from "@/components/ShadowAccounts";
import CryptoTraceCard from "@/components/CryptoTraceCard";
import DarkWebMonitor from "@/components/DarkWebMonitor";
import LegalRecords from "@/components/LegalRecords";
import EvidenceGraph from "@/components/EvidenceGraph";

import LocationMap from "@/components/LocationMap";
import EvasionTimeline from "@/components/EvasionTimeline";
import AiChat from "@/components/AiChat";
import SearchEngineEvidencePanel from "@/components/SearchEngineEvidencePanel";
import EvidencePackage from "@/components/EvidencePackage";
import ContentRiskPanel from "@/components/ContentRiskPanel";
import StylometryPanel from "@/components/StylometryPanel";
import ManualIngestPanel from "@/components/ManualIngestPanel";
import SearchIntelPanel from "@/components/SearchIntelPanel";
import IntelCorrelationTab from "@/components/suspect/IntelCorrelationTab";
import LinkedAccountsStreamTab from "@/components/suspect/LinkedAccountsStreamTab";
import WaybackArchiveTab from "@/components/WaybackArchiveTab";
import ContactDiscoveryTab from "@/components/ContactDiscoveryTab";
import OSINTFrameworkGraph from "@/components/OSINTFrameworkGraph";
import { ConfidenceTrend } from "@/components/ConfidenceTrend";
import { KeywordTagCloud } from "@/components/KeywordTagCloud";
import { Wifi } from "lucide-react";

interface TabDef {
  id: string;
  label: string;
  icon: typeof Users;
  badge?: { tone: "stamp" | "evidence" | "warn"; text: string };
  render: (p: SuspectProfile) => ReactNode;
}

export function SuspectTabs({ 
  profile, 
  onTabChange, 
  onTriggerSearch 
}: { 
  profile: SuspectProfile; 
  onTabChange?: (id: string) => void;
  onTriggerSearch?: (query: string, type: string) => void;
}) {
  const TABS: TabDef[] = [
    { id: "overview", label: "Overview", icon: Users, render: (p) => <OverviewTab p={p} onTabChange={onTabChange} onTriggerSearch={onTriggerSearch} /> },
    { id: "correlation-shield", label: "Intelligence Correlation", icon: Brain, badge: profile.investigationQuality ? { tone: "evidence" as const, text: `${profile.investigationQuality.score}%` } : undefined, render: (p) => <IntelCorrelationTab p={p} /> },
    { id: "accounts", label: "Linked Accounts", icon: Share2, render: (p) => <AccountsTab p={p} /> },
    { id: "live-account-scan", label: "Live Account Scan", icon: Wifi, render: (p) => <LinkedAccountsStreamTab username={p.username.replace(/^@/, "")} /> },

    { id: "timeline", label: "Post Timeline", icon: MessageSquare, render: (p) => <TimelineView suspect={p} /> },
    { id: "face", label: "Face Scan", icon: ScanFace, render: (p) => <FaceScanCard suspect={p} /> },
    { id: "crypto", label: "Crypto Trace", icon: Bitcoin,
      badge: profile.cryptoTrace ? { tone: "warn", text: String(profile.cryptoTrace.transactions?.length || 0) } : undefined,
      render: (p) => <CryptoTraceCard suspect={p} /> },
    { id: "financial", label: "Financial / UPI", icon: IndianRupee,
      badge: profile.upiFootprint && profile.upiFootprint.ncrp?.status === "FOUND_PUBLIC_MENTION"
        ? { tone: "stamp" as const, text: String(profile.upiFootprint.ncrp.complaintCount || 1) }
        : profile.financialFootprint && profile.financialFootprint.ncrp?.length
          ? { tone: "stamp" as const, text: String(profile.financialFootprint.ncrp.length) }
          : undefined,
      render: (p) => <FinancialTab p={p} /> },
    { id: "darkweb", label: "Dark Web & Leaks", icon: AlertTriangle, render: (p) => <DarkWebMonitor suspect={p} /> },
    { id: "legal", label: "Legal & Public Records", icon: Gavel, render: (p) => <LegalRecords suspect={p} /> },
    { id: "evidence-graph", label: "Evidence Graph", icon: GitCommit, render: (p) => <EvidenceGraph suspect={p} /> },
    { id: "reasoning-log", label: "Reasoning Log", icon: Clock, render: (p) => <ReasoningLogView p={p} /> },
    { id: "geo", label: "Geotag Trail", icon: MapPin, render: (p) => <LocationMap suspect={p} /> },

    { id: "evasion", label: "Evasion Timeline", icon: Clock,
      badge: profile.aliasResults?.some(a => a.evasionPattern) ? { tone: "stamp", text: "!" } : undefined,
      render: (p) => <EvasionTimeline suspect={p} /> },
    {
      id: "content-risk",
      label: "Content Risk",
      icon: AlertTriangle,
      badge: (() => {
        const highRiskPosts = profile.posts.filter(post => post.flagLevel === "HIGH_RISK" || post.flagLevel === "SUSPICIOUS");
        return highRiskPosts.length > 0 ? { tone: "stamp" as const, text: String(highRiskPosts.length) } : undefined;
      })(),
      render: (p) => <ContentRiskPanel suspect={p} />,
    },

    { id: "stylometry", label: "Language Analysis", icon: Brain, render: (p) => <StylometryPanel suspect={p} /> },
    { id: "search-intel", label: "Search Intel", icon: Globe, render: (p) => <SearchIntelPanel suspect={p} key={p.caseReference} /> },
    { id: "ingest", label: "Evidence Ingest", icon: FilePlus, render: (p) => <ManualIngestPanel suspect={p} /> },
    { id: "osint-graph", label: "OSINT Graph", icon: Network, render: (p) => <OSINTFrameworkGraph suspect={p} /> },
    { id: "chat", label: "AI Chat", icon: Bot, render: (p) => <AiChat suspect={p} /> },
    { id: "wayback", label: "Archive Trail", icon: Archive, render: (p) => <WaybackArchiveTab suspect={p} /> },
    { id: "contact", label: "Contact Discovery", icon: Mail, render: (p) => <ContactDiscoveryTab suspect={p} /> },
    { id: "evidence", label: "Court Certificate", icon: FileCheck, render: (p) => <EvidencePackage suspect={p} /> },
  ];

  const [active, setActive] = useState(TABS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  const current = TABS.find((t) => t.id === active)!;

  return (
    <div className="space-y-4">
      {/* Scrollable Tabs navigation header */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur md:-mx-8 md:px-8 no-print">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => scroll(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div ref={scrollRef} className="flex flex-1 overflow-x-auto scroll-smooth no-scrollbar" style={{ scrollbarWidth: "none" }}>
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
                    {t.badge && t.badge.text && (
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

function OverviewTab({ 
  p, 
  onTabChange, 
  onTriggerSearch 
}: { 
  p: SuspectProfile;
  onTabChange?: (id: string) => void;
  onTriggerSearch?: (query: string, type: string) => void;
}) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  // Risk breakdown factors logic
  const flaggedPosts = p.posts.filter((post) => post.flagLevel !== "NORMAL").length;
  const unconfirmedAccounts = p.accounts.filter((a) => a.confidence !== "CONFIRMED").length;

  const threatKeywords = p.riskSubscores.language || 0;
  const platformSpread = p.riskSubscores.network || 0;

  const contentRisk    = Math.min(25, flaggedPosts * 7);
  const identityRisk   = Math.min(25 - contentRisk, unconfirmedAccounts * 2);
  const legalProximity = p.riskSubscores.legal || 0;

  const signalsList: { label: string; value: number; impact: "HIGH" | "MEDIUM" | "LOW" }[] = [];

  if (threatKeywords > 0) {
    signalsList.push({
      label: "Threat/Suspicious Keywords Lexicon Hits",
      value: threatKeywords,
      impact: threatKeywords >= 15 ? "HIGH" : threatKeywords >= 5 ? "MEDIUM" : "LOW",
    });
  }
  if (platformSpread > 0) {
    signalsList.push({
      label: "Public Profile Discovered Footprint",
      value: platformSpread,
      impact: platformSpread >= 15 ? "HIGH" : platformSpread >= 5 ? "MEDIUM" : "LOW",
    });
  }
  if (contentRisk > 0) {
    signalsList.push({
      label: `Suspicious Flagged Content (${flaggedPosts} post(s))`,
      value: contentRisk,
      impact: contentRisk >= 15 ? "HIGH" : contentRisk >= 5 ? "MEDIUM" : "LOW",
    });
  }
  if (identityRisk > 0) {
    signalsList.push({
      label: `Identity Inconsistencies / Unconfirmed Accounts (${unconfirmedAccounts} account(s))`,
      value: identityRisk,
      impact: identityRisk >= 15 ? "HIGH" : identityRisk >= 5 ? "MEDIUM" : "LOW",
    });
  }
  if (legalProximity > 0) {
    signalsList.push({
      label: "Court/Registry Public Records Matches",
      value: legalProximity,
      impact: legalProximity >= 15 ? "HIGH" : legalProximity >= 5 ? "MEDIUM" : "LOW",
    });
  }
  if (p.cryptoTrace && typeof p.cryptoTrace.riskScore === "number" && p.cryptoTrace.riskScore > 0) {
    const isOverride = p.riskScore === p.cryptoTrace.riskScore;
    const scoreVal = p.cryptoTrace.riskScore;
    signalsList.push({
      label: `High-Risk Cryptocurrency Transactions ${isOverride ? "(Overriding Score)" : ""}`,
      value: scoreVal,
      impact: scoreVal >= 15 ? "HIGH" : scoreVal >= 5 ? "MEDIUM" : "LOW",
    });
  }


  const highImpact = signalsList.filter(s => s.impact === "HIGH");
  const medImpact  = signalsList.filter(s => s.impact === "MEDIUM");
  const lowImpact  = signalsList.filter(s => s.impact === "LOW");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {p.nexusAnalysis && (
        <Card className="lg:col-span-3 border-l-4 border-l-blue-600 bg-blue-50/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
              <Sparkle /> AI Executive Briefing & Action Plan
            </CardTitle>
            <CardDescription className="text-slate-600 font-mono text-[10px]">Cross-signal forensic synthesis completed automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm font-mono">
            {p.nexusAnalysis.investigator_brief && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-inner text-slate-100 mb-4">
                <div className="text-[10px] font-bold text-blue-400 uppercase mb-2 tracking-wider font-mono">📝 AI Investigator Brief (OSINT Synthesis)</div>
                <div className="prose prose-sm prose-invert font-mono text-[11px] leading-relaxed max-w-none whitespace-pre-wrap">
                  {p.nexusAnalysis.investigator_brief}
                </div>
              </div>
            )}

            <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-sm">
              <div className="text-[10px] font-bold text-blue-800 uppercase mb-1">Key Finding Summary</div>
              <div className="text-ink font-semibold leading-relaxed">{p.nexusAnalysis.key_finding}</div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold text-slate-700 uppercase">Correlated Signals</div>
                <ul className="space-y-2">
                  {p.nexusAnalysis.connected_signals.map((c, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 p-2.5 bg-white shadow-sm">
                      <div className="text-[10px] text-ink font-bold">{c.signal1} <span className="text-slate-500">↔</span> {c.signal2}</div>
                      <div className="mt-1 text-[10px] text-slate-700 font-medium leading-relaxed">{c.connection}</div>
                    </li>
                  ))}
                  {p.nexusAnalysis.connected_signals.length === 0 && (
                    <li className="text-[10px] text-slate-500 italic p-1">No multi-platform signals cross-referenced.</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold text-slate-700 uppercase">Operational Anomalies</div>
                <ul className="space-y-2">
                  {p.nexusAnalysis.anomalies.map((a, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-2.5 bg-white shadow-sm">
                      <span className="text-[10px] text-ink font-semibold leading-relaxed">{a.description}</span>
                      <Badge className={riskColor(a.severity as RiskLevel) + " font-mono text-[9px] shrink-0 uppercase py-0.5 px-1.5"}>{a.severity}</Badge>
                    </li>
                  ))}
                  {p.nexusAnalysis.anomalies.length === 0 && (
                    <li className="text-[10px] text-slate-500 italic p-1">No anomalies flagged.</li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
              <div className="text-[10px] font-bold text-amber-900 uppercase mb-1">Recommended Next Steps</div>
              <div className="text-ink font-semibold leading-relaxed">{p.nexusAnalysis.investigator_priority}</div>
            </div>

            {/* AI Suggested Actions */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold text-slate-800 uppercase mb-2 tracking-wider font-mono">⚡ AI Suggested Next Actions</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 font-mono text-[10px] border-slate-300 hover:bg-slate-100 hover:text-ink transition-all gap-1.5 bg-white text-ink font-bold shadow-sm"
                  onClick={() => onTabChange && onTabChange("stylometry")}
                >
                  🔍 Search Similar Usernames
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 font-mono text-[10px] border-slate-300 hover:bg-slate-100 hover:text-ink transition-all gap-1.5 bg-white text-ink font-bold shadow-sm"
                  onClick={() => onTabChange && onTabChange("evidence")}
                >
                  📄 Generate Court Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 font-mono text-[10px] border-slate-300 hover:bg-slate-100 hover:text-ink transition-all gap-1.5 bg-white text-ink font-bold shadow-sm"
                  onClick={() => onTabChange && onTabChange("timeline")}
                >
                  📊 Analyze Timeline
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 font-mono text-[10px] border-slate-300 hover:bg-slate-100 hover:text-ink transition-all gap-1.5 bg-white text-ink font-bold shadow-sm"
                  onClick={() => onTabChange && onTabChange("network")}
                >
                  🕸️ Find Related Accounts
                </Button>
                {p.phoneNumber && p.phoneNumber !== "Not provided" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-[10px] border-slate-300 hover:bg-slate-100 hover:text-ink transition-all gap-1.5 bg-white text-ink font-bold shadow-sm"
                    onClick={() => onTriggerSearch && onTriggerSearch(p.phoneNumber, "phone")}
                  >
                    📞 Run Phone Intelligence
                  </Button>
                )}
                {p.emailAddress && p.emailAddress !== "Not provided" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-[10px] border-slate-300 hover:bg-slate-100 hover:text-ink transition-all gap-1.5 bg-white text-ink font-bold shadow-sm"
                    onClick={() => onTriggerSearch && onTriggerSearch(p.emailAddress, "email")}
                  >
                    ✉️ Run Email Intelligence
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      )}

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
                <span className="text-slate-600 font-bold">{k}</span>
                <span className="font-bold text-ink">{v}</span>
              </div>
              <Progress value={v} className="h-1.5" />
            </div>
          ))}
          <Separator />
          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-slate-700 font-bold">Risk signals</div>
            <ul className="space-y-2 text-sm">
              {(p.riskSignals || []).map((s, i) => (
                <li key={i} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stamp" /><span className="text-ink font-medium">{s}</span></li>
              ))}
            </ul>
          </div>

          <Separator />
          {/* Collapsible Risk Breakdown Section */}
          <div className="pt-2">
            <button
              onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
              className="flex items-center justify-between w-full text-xs font-mono font-bold text-slate-650 hover:text-ink transition-colors p-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <span>🔍 RISK ENGINE DETAILED BREAKDOWN</span>
              <span className="text-[10px]">{isBreakdownOpen ? "[-] Collapse" : "[+] Expand"}</span>
            </button>
            {isBreakdownOpen && (
              <div className="mt-3 space-y-3 font-mono text-xs p-3 border border-slate-200 rounded-xl bg-white shadow-inner">
                {signalsList.length === 0 ? (
                  <p className="text-slate-550 italic">No significant risk signal indicators identified.</p>
                ) : (
                  <>
                    {highImpact.length > 0 && (
                      <div>
                        <div className="font-bold text-red-600 uppercase text-[9px] mb-1.5">🚨 High Impact Signals (≥15)</div>
                        <ul className="space-y-1">
                          {highImpact.map((s, i) => (
                            <li key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-700">{s.label}</span>
                              <span className="font-bold text-red-600">+{s.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {medImpact.length > 0 && (
                      <div className="mt-2.5">
                        <div className="font-bold text-amber-600 uppercase text-[9px] mb-1.5">⚠️ Medium Impact Signals (5-14)</div>
                        <ul className="space-y-1">
                          {medImpact.map((s, i) => (
                            <li key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-700">{s.label}</span>
                              <span className="font-bold text-amber-600">+{s.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {lowImpact.length > 0 && (
                      <div className="mt-2.5">
                        <div className="font-bold text-slate-500 uppercase text-[9px] mb-1.5">ℹ️ Low Impact Signals (&lt;5)</div>
                        <ul className="space-y-1">
                          {lowImpact.map((s, i) => (
                            <li key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-700">{s.label}</span>
                              <span className="font-bold text-slate-500">+{s.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="overflow-hidden rounded-md border border-border">
            <img src={p.photoUrl} alt={p.realName} className="aspect-square w-full bg-muted object-cover" />
          </div>
          <Field label="Real name" value={p.realName} attribution={p.evidenceAttribution?.realName} />
          <Field label="Primary handle" value={p.username.startsWith("@") ? p.username : "@" + p.username} mono attribution={p.evidenceAttribution?.username || { value: p.username, source: "Swept platform registries", confidence: "85%", discoveredBy: "runRecursiveIdentityReconstruction()" }} />
          <Field label="Email" value={p.emailAddress} mono attribution={p.evidenceAttribution?.emailAddress} />
          <Field label="Phone" value={p.phoneNumber} mono attribution={p.evidenceAttribution?.phoneNumber} />
          <Field label="Case reference" value={p.caseReference} mono />

        </CardContent>
      </Card>


      {/* Platform Status Widget */}
      {p.platformStatuses && p.platformStatuses.length > 0 && (
        <Card className="border-border bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-ink">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Platform Status
            </CardTitle>
            <CardDescription className="text-slate-500 font-mono text-[9px]">API and crawler status logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-[10px] p-4 pt-1">
            {p.platformStatuses.slice(0, 6).map((s, idx) => {
              const isOnline = s.status === "Online";
              const isRate = s.status === "Rate Limited";
              const badgeClass = isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                : isRate
                  ? "bg-amber-50 text-amber-700 border-amber-250 animate-pulse"
                  : "bg-rose-50 text-rose-700 border-rose-250";

              return (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                  <span className="font-bold text-slate-800">{s.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400">{s.responseTimeMs}ms</span>
                    <Badge variant="outline" className={badgeClass + " font-mono text-[9px] border py-0 px-1 uppercase font-bold"}>
                      {s.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}


      {p.searchIntel?.results && p.searchIntel.results.length > 0 && (
        <Card className="lg:col-span-3 border-l-4 border-l-purple-600 bg-purple-50/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
              <Globe className="w-5 h-5 text-purple-605" /> Search Intelligence Discovery Summary
            </CardTitle>
            <CardDescription className="text-slate-600 font-mono text-[10px]">
              Top public web discoveries and dork hits matching suspect profile vectors.
            </CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-xs pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              {p.searchIntel.results.slice(0, 4).map((f) => (
                <div key={f.id} className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between gap-1">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-ink text-paper text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded">
                        {f.source}
                      </Badge>
                      {f.riskTags.slice(0, 2).map(tag => (
                        <Badge key={tag} className="bg-red-500/10 text-red-500 border border-red-500/25 text-[8px] font-bold">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="font-bold text-[11px] text-ink mt-1 hover:underline truncate">
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5">
                          {f.title} <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                        </a>
                      ) : (
                        f.title
                      )}
                    </div>
                    <p className="text-[10px] text-slate-700 font-medium leading-relaxed line-clamp-2 mt-0.5 font-sans">
                      {f.snippet}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {p.searchIntel.results.length > 4 && (
              <div className="text-right text-[10px] text-muted-foreground mt-2">
                And {p.searchIntel.results.length - 4} more findings. View the "Search Intel" tab for the full list.
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {p.education && p.education.length > 0 && (
        <Card className="lg:col-span-3 border-l-4 border-l-cyan-600 bg-slate-50/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
              <Sparkle /> Education & Professional Background (Sourced from LinkedIn)
            </CardTitle>
            <CardDescription className="text-slate-600 font-mono text-[10px]">
              LinkedIn public profile data parsed.
              {p.resumeUrl && (
                <a href={p.resumeUrl} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline font-bold font-sans">
                  [View LinkedIn Resume]
                </a>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h5 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">Education Details (College & School)</h5>
                <div className="space-y-3 font-mono text-xs">
                  {p.education.map((edu, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
                      <div className="flex justify-between text-ink font-bold">
                        <span className="text-[11px]">{edu.institution}</span>
                        <span className="text-[9px] text-slate-500 font-normal">{edu.period}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1 font-semibold">{edu.degree}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">Professional Experience</h5>
                <div className="space-y-3 font-mono text-xs">
                  {p.experience?.map((exp, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
                      <div className="flex justify-between text-ink font-bold">
                        <span className="text-[11px]">{exp.role}</span>
                        <span className="text-[9px] text-slate-500 font-normal">{exp.period}</span>
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold">{exp.company}</div>
                      <p className="text-[10px] text-slate-655 mt-1.5 leading-relaxed font-medium">{exp.details}</p>
                    </div>
                  ))}
                </div>
              </div>
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

function Field({ 
  label, 
  value, 
  mono,
  attribution
}: { 
  label: string; 
  value: string; 
  mono?: boolean;
  attribution?: import("@/lib/types").FieldAttribution;
}) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      className="relative flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 cursor-help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">{label}</span>
      <span className={`${mono ? "font-mono text-xs" : "text-sm"} font-semibold text-ink`}>{value}</span>

      {hovered && attribution && (
        <div className="absolute right-0 top-6 z-50 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-slate-100 shadow-xl font-mono text-[9px] leading-relaxed transition-all pointer-events-none">
          <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 mb-1.5 uppercase">🔍 Evidence Attribution</div>
          <div><span className="text-slate-400">Value:</span> <span className="text-white font-bold">{attribution.value}</span></div>
          <div><span className="text-slate-400">Source:</span> <span className="text-white font-semibold">{attribution.source}</span></div>
          <div><span className="text-slate-400">Confidence:</span> <span className="text-emerald-400 font-bold">{attribution.confidence}</span></div>
          <div><span className="text-slate-400">Discovered By:</span> <span className="text-blue-300 font-semibold">{attribution.discoveredBy}</span></div>
        </div>
      )}
    </div>
  );
}


function AccountsTab({ p }: { p: SuspectProfile }) {
  const [showWeak, setShowWeak] = useState(false);

  if (!p.accounts || p.accounts.length === 0) {
    return <Placeholder text="No linked public platform accounts confirmed for this subject." />;
  }

  const getConfidenceScore = (confidence?: string): number => {
    if (confidence === "CONFIRMED") return 95;
    if (confidence === "PROBABLE") return 78;
    if (confidence === "POSSIBLE") return 55;
    return 35; // Weak
  };

  const sortedAccounts = [...p.accounts].sort((a, b) => getConfidenceScore(b.confidence) - getConfidenceScore(a.confidence));
  const displayedAccounts = sortedAccounts.filter(a => {
    const score = getConfidenceScore(a.confidence);
    if (score < 50) return showWeak;
    return true;
  });
  const hasWeakAccounts = sortedAccounts.some(a => getConfidenceScore(a.confidence) < 50);

  const platformColor: Record<string, string> = {
    linkedin: "text-blue-700 bg-blue-50 border-blue-200",
    instagram: "text-pink-700 bg-pink-50 border-pink-200",
    github: "text-slate-700 bg-slate-100 border-slate-200",
    twitter: "text-sky-700 bg-sky-50 border-sky-200",
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h4 className="text-xs font-semibold text-slate-650 uppercase tracking-wider mb-2 font-mono">
          🔍 Profile Keyword & Subject Fingerprint
        </h4>
        <KeywordTagCloud accounts={p.accounts} realName={p.realName} />
      </div>
      {hasWeakAccounts && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowWeak(!showWeak)}
            className="font-mono text-xs font-bold text-slate-700 border-slate-250 bg-white shadow-sm transition-all"
          >
            {showWeak ? "🙈 Hide Low Confidence Results" : "👁️ Show Low Confidence Results"}
          </Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {displayedAccounts.map((a, idx) => {
          const score = getConfidenceScore(a.confidence);
          const tierName = score >= 85 ? "Confirmed" : score >= 70 ? "Probable" : score >= 50 ? "Possible" : "Weak";
          const tierRange = score >= 85 ? "85–100" : score >= 70 ? "70–84" : score >= 50 ? "50–69" : "<50";
          const badgeClass = score >= 85 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : score >= 70 ? "bg-indigo-50 text-indigo-750 border-indigo-200"
            : score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-rose-50 text-rose-700 border-rose-200";

          return (
            <Card key={idx} className="card-3d bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-1 flex-wrap border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-indigo-900 font-bold">{a.platform}</span>
                    <Badge variant="outline" className={`font-mono text-[8px] uppercase font-extrabold px-1.5 py-0 border ${badgeClass}`}>
                      {tierName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(a.confidence === "CONFIRMED" || (a as any).verified) && <Badge variant="outline" className="text-[10px] border-slate-300 font-semibold text-slate-700">verified</Badge>}
                    {a.profilePicUrl && (
                      <ReverseImageDropdown imageUrl={a.profilePicUrl} />
                    )}
                  </div>
                </div>

                {/* Avatar + Info side-by-side */}
                <div className="flex items-start gap-3 pt-1">
                  {a.profilePicUrl && (
                    <img
                      src={a.profilePicUrl}
                      alt={`${a.username}'s avatar`}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-ink truncate">
                      {a.username ? (a.username.startsWith("@") ? a.username : "@" + a.username) : "—"}
                    </div>
                    {a.displayName && a.displayName !== a.username && (
                      <div className="text-[11px] text-slate-600 font-semibold truncate">
                        {a.displayName}
                      </div>
                    )}
                    {a.bio && <p className="text-xs text-slate-750 font-medium line-clamp-2 mt-1 leading-relaxed">{a.bio}</p>}
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                  <span>{a.followers?.toLocaleString() ?? "—"} followers</span>
                  <span>Last: {a.creationDate || (a as any).lastActive || "—"}</span>
                </div>
                <div className="pt-2 text-right">
                  <a href={a.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-800 font-bold hover:underline inline-flex items-center gap-1">
                    Inspect Source <ChevronRight className="w-3 h-3" />
                  </a>
                </div>


                {/* Confidence Explanation Breakdown */}
                {(() => {
                  const { pct, matched, notMatched } = explainConfidence(a, p);
                  return (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 font-mono text-[9px] text-ink">
                      <div className="flex justify-between font-bold text-slate-650">
                        <span>Attribution Confidence</span>
                        <span className="font-bold text-ink">{tierName} ({tierRange})</span>
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {matched.length > 0 && (
                          <div className="text-emerald-650 font-semibold truncate" title={matched.join(", ")}>
                            ✓ Matched: {matched.join(", ")}
                          </div>
                        )}
                        {notMatched.length > 0 && (
                          <div className="text-slate-400 font-medium truncate" title={notMatched.join(", ")}>
                            ✗ Not Matched: {notMatched.join(", ")}
                          </div>
                        )}
                        {a.mergeJustification && (
                          <div className="mt-3 pt-2.5 border-t border-dashed border-indigo-200 text-indigo-950 bg-indigo-50/30 p-2.5 rounded-xl text-[9px] font-mono leading-relaxed">
                            <div className="font-bold text-indigo-850 mb-1">🔗 Merged because:</div>
                            <div className="flex flex-col gap-0.5 mb-1.5">
                              {matched.map((m, idx) => (
                                <div key={idx} className="text-emerald-700 font-semibold">✓ {m}</div>
                              ))}
                              {notMatched.map((nm, idx) => (
                                <div key={idx} className="text-slate-400 font-medium">✗ {nm}</div>
                              ))}
                            </div>
                            <div className="flex justify-between font-bold text-indigo-900 mt-1 border-t border-indigo-100 pt-1.5">
                              <span>Overall Merge Confidence:</span>
                              <span>{pct}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* GitHub Intelligence Panel */}
                {a.platform === "github" && (a as any).githubIntel && (
                  <GithubIntelPanel intel={(a as any).githubIntel} username={a.username} />
                )}
                {/* Reddit Intelligence Panel */}
                {a.platform === "reddit" && (a as any).redditIntel && (
                  <RedditIntelPanel intel={(a as any).redditIntel} />
                )}
                {/* LinkedIn Intelligence Panel */}
                {a.platform === "linkedin" && ((a as any).headline || (a as any).jobTitle || (a as any).company || (a as any).education) && (
                  <LinkedinIntelPanel account={a as any} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Similar Profiles Section */}
      {p.suggestedProfiles && p.suggestedProfiles.length > 0 && (
        <Card className="border-l-4 border-l-violet-500 bg-violet-50/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
              <Users className="h-4 w-4 text-violet-600" />
              Similar Profiles Found Online
              <Badge className="ml-2 bg-violet-100 text-violet-800 border-violet-200 font-mono text-[10px]">
                {p.suggestedProfiles.length} results
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-600 font-mono text-[10px]">
              Discovered via progressive name-prefix search across LinkedIn, Instagram, GitHub & Twitter. These may be the same person or namesakes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {p.suggestedProfiles.slice(0, 12).map((sp, idx) => {
                const colorClass = platformColor[sp.platform] || "text-slate-700 bg-slate-100 border-slate-200";
                const matchPct = Math.min(100, sp.matchScore);
                return (
                  <a
                    key={idx}
                    href={sp.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-xl border bg-white p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${colorClass}`}>
                        {sp.platform}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 font-semibold">
                        Match: {matchPct}%
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-ink truncate">@{sp.handle}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 truncate font-medium">{sp.name}</div>
                    {sp.bio && (
                      <p className="text-[9px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{sp.bio}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      {sp.followers ? (
                        <span className="text-[9px] font-mono text-slate-500">{sp.followers.toLocaleString()} followers</span>
                      ) : <span />}
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-violet-600 transition-colors" />
                    </div>
                    {/* Match score bar */}
                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500"
                        style={{ width: `${matchPct}%` }}
                      />
                    </div>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Sweep Directory */}
      <Card className="border-border bg-white shadow-sm mt-6">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
            <Share2 className="h-4 w-4 text-indigo-650" />
            Platform Sweep Directory
            <Badge className="ml-2 bg-slate-100 text-slate-800 border-slate-200 font-mono text-[10px]">
              {p.platformStatuses?.length || 20} checked
            </Badge>
          </CardTitle>
          <CardDescription className="text-slate-600 font-mono text-[10px]">
            Comprehensive status listing of all platforms queried during the OSINT sweep.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {(p.platformStatuses || []).sort((a, b) => a.name.localeCompare(b.name)).map((s, idx) => {
              const isFound = s.status === "FOUND" || s.status === "Online";
              const isRate = s.status === "RATE LIMITED";
              const isPrivate = s.status === "PRIVATE";
              const badgeClass = isFound
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isRate
                  ? "bg-amber-50 text-amber-700 border-amber-250 font-bold"
                  : isPrivate
                    ? "bg-purple-50 text-purple-700 border-purple-250 font-bold"
                    : "bg-slate-50 text-slate-500 border-slate-200 font-medium";

              const statusLabel = isFound ? "FOUND" : s.status;

              return (
                <div 
                  key={idx} 
                  className={`rounded-xl border p-2.5 flex flex-col justify-between h-[68px] font-mono text-[10px] bg-slate-50/50 hover:bg-slate-50 transition-colors ${
                    isFound ? "border-emerald-350 bg-emerald-50/10" : "border-slate-200"
                  }`}
                >
                  <span className="font-bold text-slate-850 truncate">{s.name}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-slate-400 font-semibold">{s.responseTimeMs || 50}ms</span>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${badgeClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialTab({ p }: { p: SuspectProfile }) {
  // Support both backend upiFootprint and mock financialFootprint formats
  const u = p.upiFootprint;
  const f = p.financialFootprint;

  if (!u && !f) return <Placeholder text="No Indian financial footprint recorded for this subject." />;

  const statusTone = (s: string) =>
    s === "OPEN" || s === "FOUND_PUBLIC_MENTION" ? "bg-stamp text-primary-foreground font-bold" :
    s === "UNDER_INVESTIGATION" ? "bg-warn text-ink font-bold" : "bg-slate-100 text-slate-700 font-bold";

  // If we have real upiFootprint data from backend
  if (u) {
    const totalComplaints = u.ncrp.complaintCount || (u.ncrp.status === "FOUND_PUBLIC_MENTION" ? 1 : 0);
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
                <IndianRupee className="h-4 w-4 text-stamp" /> UPI handles
              </CardTitle>
              <CardDescription>Probable VPAs across Payment Service Providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {u.probableUpiIds.map((handle: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-ink font-semibold">
                  <span>{handle.id}</span>
                  <Badge variant="outline" className="text-[10px] border-slate-350">{handle.source}</Badge>
                </div>
              ))}
              {u.probableUpiIds.length === 0 && (
                <p className="text-xs text-slate-600 font-mono font-medium">No inferred UPI handles identified.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
                <PhoneCall className="h-4 w-4 text-stamp" /> Truecaller
              </CardTitle>
              <CardDescription>Carrier intelligence and community signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-ink">
              {u.truecaller.status === "PUBLIC_DATA_UNAVAILABLE" || !u.truecaller.name ? (
                <p className="text-xs text-slate-655 font-mono font-medium">Truecaller public details unavailable.</p>
              ) : (
                <>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">Display name</div>
                    <div className="font-bold text-sm text-ink">{u.truecaller.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase text-slate-600 font-bold">Carrier</span>
                      <div className="font-mono font-semibold text-slate-800">{u.truecaller.carrier || "Unknown"}</div>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-slate-600 font-bold">Circle</span>
                      <div className="font-mono font-semibold text-slate-800">{u.truecaller.telecomCircle || "Unknown"}</div>
                    </div>
                  </div>
                  {u.truecaller.spamScore !== undefined && (
                    <div>
                      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                        <span>Spam score</span>
                        <span className="font-bold text-rose-800">{u.truecaller.spamScore}/100</span>
                      </div>
                      <Progress value={u.truecaller.spamScore} className="mt-1 h-1.5" />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
                <ShieldX className="h-4 w-4 text-stamp" /> NCRP summary
              </CardTitle>
              <CardDescription>National Cyber Crime Reporting Portal hits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-ink">
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Status</span>
                <Badge className={statusTone(u.ncrp.status) + " font-mono text-[10px]"}>{u.ncrp.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Complaint Hits</span>
                <span className="font-mono font-bold text-rose-800">{totalComplaints}</span>
              </div>
              <p className="text-[10px] text-slate-700 font-medium font-mono mt-2 leading-relaxed border-t border-slate-200 pt-2">{u.ncrp.note}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback to friend's mock financialFootprint schema
  if (f) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
                <IndianRupee className="h-4 w-4 text-stamp" /> UPI handles
              </CardTitle>
              <CardDescription>Probable VPAs across PSPs · last seen {f.upi.lastSeen}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {f.upi.handles.map((h) => (
                <div key={h} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-ink font-semibold">
                  <span>{h}</span>
                  <Badge variant="outline" className="text-[10px] border-slate-350">{h.split("@")[1]}</Badge>
                </div>
              ))}
              <div className="pt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                Banks linked: {f.upi.banks.join(" · ")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
                <PhoneCall className="h-4 w-4 text-stamp" /> Truecaller
              </CardTitle>
              <CardDescription>Carrier intelligence & community spam signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-ink">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">Display name</div>
                <div className="font-bold text-sm text-ink">{f.truecaller.name}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="font-mono text-[10px] uppercase text-slate-600 font-bold">Carrier</span><div className="font-mono font-semibold text-slate-800">{f.truecaller.carrier}</div></div>
                <div><span className="font-mono text-[10px] uppercase text-slate-600 font-bold">Circle</span><div className="font-mono font-semibold text-slate-800">{f.truecaller.circle}</div></div>
              </div>
              <div>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                  <span>Spam score</span>
                  <span className="font-bold text-rose-800">{f.truecaller.spamScore}/100 · {f.truecaller.spamReports} reports</span>
                </div>
                <Progress value={f.truecaller.spamScore} className="mt-1 h-1.5" />
              </div>
              <div className="flex flex-wrap gap-1">
                {f.truecaller.tags.map((t) => (
                  <Badge key={t} className="bg-stamp/10 text-stamp text-[10px] font-mono border-transparent">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base text-ink">
                <ShieldX className="h-4 w-4 text-stamp" /> NCRP summary
              </CardTitle>
              <CardDescription>National Cyber Crime Reporting Portal hits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-ink">
              <div className="flex justify-between"><span className="text-slate-600 font-semibold">Total complaints</span><span className="font-mono font-bold text-rose-800">{f.ncrp.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 font-semibold">Open / Investigating</span><span className="font-mono font-bold text-stamp">{f.ncrp.filter(c => c.status !== "CLOSED").length}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 font-semibold">Total amount alleged</span><span className="font-mono font-bold">₹ {f.ncrp.reduce((s,c) => s + (c.amountInr ?? 0), 0).toLocaleString("en-IN")}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-ink">NCRP complaint history</CardTitle>
            <CardDescription>Live mirror from cybercrime.gov.in (mock)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left font-mono text-[10px] uppercase tracking-wider text-slate-700 font-bold">
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
                    <tr key={c.id} className="border-b border-slate-150 last:border-0 text-slate-800 font-medium">
                      <td className="py-2 pr-3 font-mono text-xs text-ink font-semibold">{c.id}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{c.date}</td>
                      <td className="py-2 pr-3">{c.category}</td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{c.jurisdiction}</td>
                      <td className="py-2 pr-3 text-right font-mono font-bold text-ink">{c.amountInr ? `₹ ${c.amountInr.toLocaleString("en-IN")}` : "—"}</td>
                      <td className="py-2 pr-3"><Badge className={statusTone(c.status) + " font-mono text-[10px] border-transparent"}>{c.status.replace("_", " ")}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {f.bankAccounts && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="font-display text-ink">Linked bank accounts</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {f.bankAccounts.map((b) => (
                <div key={b.accountMasked} className="flex items-center justify-between rounded-md border border-slate-200 p-3 bg-slate-50 shadow-sm">
                  <div>
                    <div className="font-bold text-ink">{b.bank}</div>
                    <div className="font-mono text-xs text-slate-600 font-semibold">{b.ifsc} · {b.accountMasked}</div>
                  </div>
                  {b.flagged && <Badge className="bg-stamp text-primary-foreground text-[10px] font-bold border-transparent">FLAGGED</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

function Placeholder({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-250 p-6 text-center text-sm text-slate-650 font-bold bg-slate-50">{text}</div>;
}

function LinkedInFieldAttributionCard({
  label,
  field
}: {
  label: string;
  field?: any;
}) {
  const [showSources, setShowSources] = useState(false);
  if (!field || !field.value) return null;

  const engineSources: any[] = field.sources || [];
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2 font-mono text-[10px]">
      <div className="flex justify-between items-start gap-2">
        <div>
          <span className="text-slate-500 font-bold uppercase text-[9px] block tracking-wide">{label}</span>
          <span className="text-ink font-bold text-[11px] leading-snug mt-0.5 block">{field.value}</span>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 border font-mono text-[9px] uppercase font-bold shrink-0">
          {field.confidence}% Confidence
        </Badge>
      </div>

      <div className="flex items-center justify-between text-slate-655 border-t border-slate-150 pt-2 flex-wrap gap-1.5">
        <div>
          <span className="font-semibold text-slate-500">Found By:</span>{" "}
          <span className="text-indigo-900 font-bold">
            {engineSources.length > 0
              ? engineSources.map(s => `✓ ${s.engine}`).join(", ")
              : `✓ ${field.source || "Public Search Index"}`}
          </span>
        </div>
        <button
          onClick={() => setShowSources(!showSources)}
          className="text-cyan-800 font-bold hover:underline"
        >
          {showSources ? "Hide Sources" : "Show Sources"}
        </button>
      </div>

      {showSources && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mt-2 space-y-1.5 w-full">
          <div className="font-bold text-slate-700 text-[9px] uppercase border-b border-slate-200 pb-1">Contributing Sources</div>
          {engineSources.length > 0 ? (
            engineSources.map((src, idx) => (
              <div key={idx} className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-indigo-900">✓ {src.engine}</span>
                <span className="text-slate-655 font-semibold">Val: "{src.value}"</span>
                <span className="font-bold text-emerald-705">{src.confidence}%</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center text-[9px]">
              <span className="font-bold text-indigo-900">✓ {field.source}</span>
              <span className="text-slate-550">{field.acquisitionMethod}</span>
              <span className="font-bold text-emerald-705">{field.confidence}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkedinIntelPanel({ account }: { account: PlatformAccount }) {
  const [showAudit, setShowAudit] = useState(false);
  const NA = <span className="text-slate-400 italic">Not publicly available</span>;
  const intel = account.linkedinIntel;

  // If there's no rich intelligence, fall back to the simple view
  if (!intel) {
    return (
      <div className="mt-3 border-t border-slate-200 pt-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">LinkedIn Intel</span>
          <Badge className="ml-auto bg-blue-50 text-blue-700 border-blue-200 font-mono text-[8px] border">HTML Extracted</Badge>
        </div>

        {account.headline && (
          <p className="text-[11px] font-semibold text-ink leading-snug">{account.headline}</p>
        )}

        <div className="grid grid-cols-1 gap-1.5 font-mono text-[10px]">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1.5">
            <Briefcase className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide w-12 shrink-0">Role</span>
            <span className="text-ink font-semibold">{account.jobTitle ?? NA}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
            <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide w-12 shrink-0">Company</span>
            <span className="text-ink font-semibold">{account.company ?? NA}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 border border-violet-100 px-2.5 py-1.5">
            <GraduationCap className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wide w-12 shrink-0">Education</span>
            <span className="text-ink font-semibold">{account.education ?? NA}</span>
          </div>
        </div>
      </div>
    );
  }

  const isAuth = intel.fullName?.acquisitionMethod === "AUTHENTICATED_SESSION";

  // Build audit fields list
  const auditFields = [
    { name: "Full Name", field: intel.fullName },
    { name: "Headline", field: intel.headline },
    { name: "Location", field: intel.location },
    { name: "Profile URL", field: intel.profileUrl },
    { name: "Summary", field: intel.summary },
    { name: "Current Role", field: intel.currentRole },
    { name: "Current Company", field: intel.currentCompany },
  ].filter(f => f.field);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 space-y-4 text-xs font-mono text-ink">
      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
        <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">LinkedIn Professional Intelligence</span>
        <Badge className={`ml-auto border text-[8px] font-mono ${
          isAuth ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
        }`}>
          {isAuth ? "Session Certified" : "HTML Extracted"}
        </Badge>
      </div>

      {/* Task 4: Field Attribution Display Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <LinkedInFieldAttributionCard label="Full Name" field={intel.fullName} />
        <LinkedInFieldAttributionCard label="Headline" field={intel.headline} />
        <LinkedInFieldAttributionCard label="Location" field={intel.location} />
        <LinkedInFieldAttributionCard label="Current Company" field={intel.currentCompany} />
        <LinkedInFieldAttributionCard label="Current Role" field={intel.currentRole} />
        <LinkedInFieldAttributionCard label="Profile URL" field={intel.profileUrl} />
      </div>

      <LinkedInFieldAttributionCard label="Summary" field={intel.summary} />

      {/* Task 3 & 5: Search Engine Evidence Panel */}
      <SearchEngineEvidencePanel logs={intel.acquisitionLogs} matrix={intel.mergeMatrix} />

      {/* Experience Timeline */}
      {intel.experiences && intel.experiences.length > 0 && (
        <div className="space-y-2">
          <div className="text-[9px] uppercase text-slate-500 font-bold flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Career Experience Timeline
          </div>
          <div className="relative border-l border-slate-250 pl-3 ml-2.5 space-y-3.5">
            {intel.experiences.map((exp: any, idx: number) => (
              <div key={idx} className="relative">
                {/* Timeline node dot */}
                <span className="absolute -left-[16.5px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white" />
                <div>
                  <span className="font-bold text-ink text-[11px]">{exp.title.value}</span>
                  <span className="text-slate-550 text-[10px]"> at </span>
                  <span className="font-bold text-blue-800 text-[11px]">{exp.company.value}</span>
                  {exp.duration?.value && (
                    <span className="text-slate-500 text-[9px] block font-semibold mt-0.5">⏱️ {exp.duration.value}</span>
                  )}
                  {exp.description?.value && (
                    <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{exp.description.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {intel.educations && intel.educations.length > 0 && (
        <div className="space-y-2">
          <div className="text-[9px] uppercase text-slate-500 font-bold flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Academic Credentials
          </div>
          <div className="grid gap-2">
            {intel.educations.map((edu: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 flex gap-2">
                <GraduationCap className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink text-[11px] block">{edu.institution.value}</span>
                  <span className="text-[10px] text-slate-655 mt-0.5 block font-semibold">
                    {edu.degree?.value && edu.degree.value !== "Degree" ? edu.degree.value : ""} 
                    {edu.fieldOfStudy?.value ? ` in ${edu.fieldOfStudy.value}` : ""}
                  </span>
                  {edu.duration?.value && (
                    <span className="text-slate-500 text-[9px] font-medium block mt-0.5">⏱️ {edu.duration.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {intel.skills && intel.skills.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] uppercase text-slate-500 font-bold">Endorsed Skill Keywords</div>
          <div className="flex flex-wrap gap-1">
            {intel.skills.map((skill: any, idx: number) => (
              <Badge key={idx} variant="outline" className="text-[9px] font-mono font-medium border-slate-200 text-slate-700 bg-slate-50">
                {skill.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Forensic Audit Panel */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between font-mono text-[10px] uppercase font-bold text-slate-700 border-b border-slate-200"
        >
          <span className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Forensic Provenance Audit Logs
          </span>
          <span>{showAudit ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showAudit && (
          <div className="p-2.5 overflow-x-auto">
            <table className="w-full text-[9px] text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="py-1">Field</th>
                  <th className="py-1">Acquisition Method</th>
                  <th className="py-1">Verification</th>
                  <th className="py-1">Confidence</th>
                  <th className="py-1">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditFields.map((f, idx) => {
                  const val = f.field!;
                  const isVerified = val.verificationStatus === "VERIFIED";
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 font-bold text-ink">{f.name}</td>
                      <td className="py-1.5 text-slate-600">{val.acquisitionMethod}</td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {val.verificationStatus}
                        </span>
                      </td>
                      <td className="py-1.5 font-bold text-ink">{val.confidence}%</td>
                      <td className="py-1.5 text-slate-500 max-w-[120px] truncate" title={val.source}>{val.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



function GithubIntelPanel({ intel, username }: { intel: import("@/lib/types").GithubIntelligence; username: string }) {
  const years  = Math.floor(intel.accountAgeDays / 365);
  const months = Math.floor((intel.accountAgeDays % 365) / 30);
  const ageLabel = years > 0 ? `${years}y ${months}m` : `${months} months`;

  // Compute local fallbacks if backend expansion fields are missing
  const totalStars = intel.totalStars ?? intel.topRepos.reduce((sum, r) => sum + r.stars, 0);
  const totalForks = intel.totalForks ?? intel.topRepos.reduce((sum, r) => sum + r.forks, 0);
  const primaryLanguage = intel.primaryLanguage ?? (intel.techStack[0] || "N/A");
  const mostStarredRepo = intel.mostStarredRepo ?? (intel.topRepos[0]?.name || "N/A");
  const seniority = intel.seniorityEstimate ?? (
    (intel.accountAgeDays > 1825 && intel.publicRepos > 20)
      ? "Senior Developer"
      : (intel.accountAgeDays > 730 && intel.publicRepos > 5)
        ? "Mid-Level Developer"
        : "Junior / Hobbyist Developer"
  );

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 space-y-4 text-xs font-mono text-ink">
      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
        <GitBranch className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">GitHub Developer Intelligence Dashboard</span>
        <Badge className="ml-auto bg-indigo-50 text-indigo-700 border-indigo-200 text-[8px] font-mono border">Expanded Metrics</Badge>
      </div>

      {/* Seniority Estimate Banner */}
      <div className="p-2.5 bg-indigo-50/50 border border-indigo-150 rounded-xl flex items-center justify-between">
        <span className="text-[10px] uppercase text-slate-500 font-bold">Forensic Seniority Estimate</span>
        <Badge className="bg-indigo-650 text-white font-mono text-[9px] uppercase">{seniority}</Badge>
      </div>

      {/* Contribution Summary */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="text-sm font-bold text-ink">{totalStars.toLocaleString()}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Total Stars</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="text-sm font-bold text-ink">{totalForks.toLocaleString()}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Total Forks</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/50">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide block">Primary Language</span>
          <span className="font-bold text-slate-800">{primaryLanguage}</span>
        </div>
        <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/50">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide block">Most Starred Repo</span>
          <span className="font-bold text-slate-800 truncate block">{mostStarredRepo}</span>
        </div>
      </div>

      {/* Repository Categories */}
      {intel.repoCategories && intel.repoCategories.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Repository Categories</div>
          <div className="flex flex-wrap gap-1.5">
            {intel.repoCategories.map(cat => (
              <span key={cat.category} className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-700">
                {cat.category}: <strong>{cat.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {intel.techStack.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-550 mb-1.5">Technology Stack</div>
          <div className="flex flex-wrap gap-1">
            {intel.techStack.map(lang => (
              <span key={lang} className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[9px] font-bold text-indigo-800">
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Repository Topics */}
      {intel.allTopics && intel.allTopics.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Aggregated Topics</div>
          <div className="flex flex-wrap gap-1">
            {intel.allTopics.map(topic => (
              <span key={topic} className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] text-slate-600 font-semibold">
                #{topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Repositories */}
      {intel.topRepos.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Top Repositories</div>
          <div className="space-y-1.5">
            {intel.topRepos.map(repo => (
              <a
                key={repo.name}
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              >
                <div className="min-w-0">
                  <div className="font-bold text-ink truncate group-hover:text-indigo-700 transition-colors">
                    {repo.name}
                  </div>
                  {repo.description && (
                    <div className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">
                      {repo.description}
                    </div>
                  )}
                  {repo.language && (
                    <span className="text-[8px] text-slate-400 mt-1 block">{repo.language}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[9px] font-bold text-amber-700">★ {repo.stars.toLocaleString()}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Organizations */}
      {intel.organizations.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Organizations</div>
          <div className="flex flex-wrap gap-1">
            {intel.organizations.map(org => (
              <a
                key={org.login}
                href={`https://github.com/${org.login}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[9px] font-bold text-green-800 hover:underline"
              >
                @{org.login}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hireable */}
      {intel.hireable === true && (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono text-[9px] border w-max">
          ✓ Open to work
        </Badge>
      )}
    </div>
  );
}


// ─── Reddit Intel Panel ──────────────────────────────────────────────────────

function RedditIntelPanel({ intel }: { intel: import("@/lib/types").RedditIntelligence }) {
  const cakeDayStr = new Date(intel.cakeDay).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
  });
  const years  = Math.floor(intel.accountAgeDays / 365);
  const months = Math.floor((intel.accountAgeDays % 365) / 30);
  const ageLabel = years > 0 ? `${years}y ${months}m` : `${months} months`;

  return (
    <div className="mt-3 border-t border-slate-200 pt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">Reddit Intel</span>
        {intel.isGold && (
          <span className="ml-1 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[8px] font-mono font-bold text-amber-700">✦ GOLD</span>
        )}
      </div>

      {/* Karma breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-1.5">
          <div className="text-xs font-bold text-orange-800">{intel.linkKarma.toLocaleString()}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Post Karma</div>
        </div>
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-1.5">
          <div className="text-xs font-bold text-orange-800">{intel.commentKarma.toLocaleString()}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Comment Karma</div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-1.5">
          <div className="text-xs font-bold text-ink">{ageLabel}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Age</div>
        </div>
      </div>

      {/* Cake day + frequency */}
      <div className="flex justify-between font-mono text-[10px] text-slate-600">
        <span>🎂 Cake day: <span className="font-bold text-ink">{cakeDayStr}</span></span>
        {intel.postingFrequency > 0 && (
          <span>~<span className="font-bold text-ink">{intel.postingFrequency}</span> posts/wk</span>
        )}
      </div>

      {/* Top communities */}
      {intel.topSubreddits.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">Top Communities</div>
          <div className="flex flex-wrap gap-1">
            {intel.topSubreddits.map(({ subreddit, count }) => (
              <a
                key={subreddit}
                href={`https://reddit.com/r/${subreddit}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[9px] font-mono font-bold text-orange-800 hover:underline"
              >
                r/{subreddit}
                <span className="ml-0.5 text-[8px] text-orange-500">×{count}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Top keywords */}
      {intel.topKeywords.length > 0 && (
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">Frequent Keywords</div>
          <div className="flex flex-wrap gap-1">
            {intel.topKeywords.slice(0, 8).map(word => (
              <span key={word} className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-mono text-slate-700 font-semibold">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reverse Image Dropdown ──────────────────────────────────────────────────

function ReverseImageDropdown({ imageUrl }: { imageUrl: string }) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchUrls = {
    GoogleLens: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
    TinEye: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`,
    Yandex: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
    Bing: `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${encodeURIComponent(imageUrl)}`,
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600 hover:bg-slate-100 hover:text-ink transition-colors"
        title="Reverse Image Investigation."
      >
        📷 Reverse Image
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-35 w-36 rounded-md border border-slate-250 bg-white py-1 shadow-lg font-mono text-[10px]">
          {Object.entries(searchUrls).map(([engine, url]) => (
            <a
              key={engine}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-ink transition-colors"
              onClick={() => setOpen(false)}
            >
              Search on {engine}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Confidence Explanation Helper ──────────────────────────────────────────

const explainConfidence = (a: any, p: SuspectProfile) => {
  const matched: string[] = [];
  const notMatched: string[] = [];

  // Username
  const cleanPUsername = (p.username || "").replace("@", "").toLowerCase();
  const cleanAUsername = (a.username || "").replace("@", "").toLowerCase();
  if (cleanAUsername && cleanPUsername && (cleanAUsername.includes(cleanPUsername) || cleanPUsername.includes(cleanAUsername))) {
    matched.push("Username");
  } else {
    notMatched.push("Username");
  }

  // Display Name
  const cleanPName = (p.realName || "").toLowerCase().split(" ")[0];
  const cleanAName = (a.displayName || "").toLowerCase();
  if (cleanAName && cleanPName && cleanAName.includes(cleanPName)) {
    matched.push("Display Name");
  } else {
    notMatched.push("Display Name");
  }

  // Company
  if (a.company) {
    matched.push("Company");
  } else {
    notMatched.push("Company");
  }

  // Location
  const hasLoc = (p.locations || []).some(loc => loc.source.toLowerCase().includes(a.platform.toLowerCase()));
  if (hasLoc) {
    matched.push("Location");
  } else {
    notMatched.push("Location");
  }

  // Website
  if (a.profileUrl || (a.githubIntel && a.githubIntel.blog)) {
    matched.push("Website");
  } else {
    notMatched.push("Website");
  }

  // Bio Similarity
  if (a.bio && !a.bio.startsWith("Public")) {
    matched.push("Bio Similarity");
  } else {
    notMatched.push("Bio Similarity");
  }

  // Education
  if (a.education) {
    matched.push("Education");
  } else {
    notMatched.push("Education");
  }

  // Avatar
  if (a.profilePicUrl && !a.profilePicUrl.includes("dicebear")) {
    matched.push("Avatar");
  } else {
    notMatched.push("Avatar");
  }

  // Repository Links
  if (a.platform === "github" && a.githubIntel && a.githubIntel.publicRepos > 0) {
    matched.push("Repository Links");
  } else if (a.platform === "github") {
    notMatched.push("Repository Links");
  }

  // Email Username Match
  if (p.emailAddress) {
    const emailUser = p.emailAddress.split("@")[0]?.toLowerCase();
    if (emailUser && (cleanAUsername.includes(emailUser) || emailUser.includes(cleanAUsername))) {
      matched.push("Email Username Match");
    } else {
      notMatched.push("Email Username Match");
    }
  }

  // UPI Alias Match
  if (p.upiFootprint && p.upiFootprint.upi && Array.isArray(p.upiFootprint.upi.handles)) {
    const matchedUpi = p.upiFootprint.upi.handles.some((h: string) => {
      const prefix = h.split("@")[0]?.toLowerCase();
      return prefix && (cleanAUsername.includes(prefix) || prefix.includes(cleanAUsername));
    });
    if (matchedUpi) {
      matched.push("UPI Alias Match");
    } else {
      notMatched.push("UPI Alias Match");
    }
  }

  const scoreMap = {
    CONFIRMED: "95%",
    PROBABLE: "75%",
    POSSIBLE: "45%",
  };

  const pct = scoreMap[a.confidence as "CONFIRMED" | "PROBABLE" | "POSSIBLE"] || "50%";

  return { pct, matched, notMatched };
};

function ReasoningLogView({ p }: { p: SuspectProfile }) {
  const steps = p.reasoningSteps || [];

  if (steps.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 bg-white font-mono max-w-2xl mx-auto my-6 flex flex-col items-center justify-center min-h-[300px] shadow-sm">
        <Info className="w-8 h-8 text-slate-500 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-slate-700">No reasoning steps logged for this investigation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono">
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-indigo-650" />
          <h4 className="text-sm font-semibold text-ink uppercase">
            Decision Replay Log
          </h4>
        </div>
        <div className="mt-2 border-t border-slate-100 pt-3">
          <ConfidenceTrend steps={steps} />
        </div>
      </div>

      <div className="relative border-l-2 border-slate-200 pl-8 ml-4 space-y-8 py-2">
        {steps.map((step, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-md font-bold text-[10px] text-indigo-750 font-mono">
              {idx + 1}
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50/50 shadow-sm transition-all space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-bold text-slate-650">
                <span className="bg-slate-100 text-slate-750 px-2 py-0.5 rounded border border-slate-250">
                  ⚙️ {step.module}
                </span>
                <span className="text-slate-600 font-mono">⏱️ {step.timestamp} | {step.durationMs}ms</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <span className="text-[9px] text-slate-600 font-bold block mb-1 uppercase">Input</span>
                  <span className="text-slate-750 font-semibold break-all leading-normal select-all">{step.input}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <span className="text-[9px] text-slate-650 font-bold block mb-1 uppercase">Output</span>
                  <span className="text-indigo-850 font-semibold break-all leading-normal select-all">{step.output}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl text-xs flex justify-between items-center flex-wrap gap-2 leading-relaxed">
                <div>
                  <span className="font-bold text-slate-800 uppercase mr-1.5 text-[9px] block">Evidence Discovered</span>
                  <span className="text-slate-700 font-medium">{step.evidenceGenerated}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-emerald-650 font-bold block uppercase">Confidence Delta</span>
                  <span className="text-emerald-700 font-bold text-sm">+{step.confidenceDelta}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




