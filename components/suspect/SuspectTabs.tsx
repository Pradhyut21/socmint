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
  AlertCircle, Clock, Send, IndianRupee, PhoneCall, ShieldX,
} from "lucide-react";

import type { SuspectProfile, RiskLevel } from "@/lib/types";
import { riskColor } from "@/lib/mock-data";

// Import real forensic components from workspace
import TimelineView from "@/components/TimelineView";
import WikidataCard from "@/components/WikidataCard";
import NLPAnalyzer from "@/components/NLPAnalyzer";
import FaceScanCard from "@/components/FaceScanCard";
import ShadowAccounts from "@/components/ShadowAccounts";
import CryptoTraceCard from "@/components/CryptoTraceCard";
import DarkWebMonitor from "@/components/DarkWebMonitor";
import LegalRecords from "@/components/LegalRecords";
import NetworkGraph from "@/components/NetworkGraph";
import LocationMap from "@/components/LocationMap";
import EvasionTimeline from "@/components/EvasionTimeline";
import AiChat from "@/components/AiChat";
import EvidencePackage from "@/components/EvidencePackage";

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
    { id: "network", label: "Network Graph", icon: GitBranch, render: (p) => <NetworkGraph suspect={p} /> },
    { id: "geo", label: "Geotag Trail", icon: MapPin, render: (p) => <LocationMap suspect={p} /> },
    { id: "evasion", label: "Evasion Timeline", icon: Clock,
      badge: profile.aliasResults?.some(a => a.evasionPattern) ? { tone: "stamp", text: "!" } : undefined,
      render: (p) => <EvasionTimeline suspect={p} /> },
    { id: "chat", label: "AI Chat", icon: Bot, render: (p) => <AiChat suspect={p} /> },
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

function OverviewTab({ p }: { p: SuspectProfile }) {
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="overflow-hidden rounded-md border border-border">
            <img src={p.photoUrl} alt={p.realName} className="aspect-square w-full bg-muted object-cover" />
          </div>
          <Field label="Real name" value={p.realName} />
          <Field label="Primary handle" value={p.username.startsWith("@") ? p.username : "@" + p.username} mono />
          <Field label="Email" value={p.emailAddress} mono />
          <Field label="Phone" value={p.phoneNumber} mono />
          <Field label="Case reference" value={p.caseReference} mono />
        </CardContent>
      </Card>
      
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

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">{label}</span>
      <span className={`${mono ? "font-mono text-xs" : "text-sm"} font-semibold text-ink`}>{value}</span>
    </div>
  );
}

function AccountsTab({ p }: { p: SuspectProfile }) {
  if (!p.accounts || p.accounts.length === 0) {
    return <Placeholder text="No linked public platform accounts confirmed for this subject." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {p.accounts.map((a, idx) => (
        <Card key={idx} className="card-3d sheen-sweep bg-white border-slate-200 shadow-sm">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between">
              <div className="font-mono text-[10px] uppercase tracking-wider text-rose-800 font-bold">{a.platform}</div>
              {(a.confidence === "CONFIRMED" || (a as any).verified) && <Badge variant="outline" className="text-[10px] border-slate-300 font-semibold text-slate-700">verified</Badge>}
            </div>
            <div className="font-mono text-sm font-semibold text-ink">
              {a.username ? (a.username.startsWith("@") ? a.username : "@" + a.username) : "—"}
            </div>
            {a.bio && <p className="text-xs text-slate-700 font-medium line-clamp-2">{a.bio}</p>}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">
              <span>{a.followers?.toLocaleString() ?? "—"} followers</span>
              <span>Last: {a.creationDate || (a as any).lastActive || "—"}</span>
            </div>
            <div className="pt-2 text-right">
              <a href={a.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-800 font-bold hover:underline inline-flex items-center gap-1">
                Inspect Source <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
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
