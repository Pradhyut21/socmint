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
    { id: "wikidata", label: "Wikidata Registry", icon: Globe, render: (p) => <WikidataCard suspect={p} /> },
    { id: "nlp", label: "NLP Analysis", icon: Brain, render: (p) => <NLPAnalyzer suspect={p} /> },
    { id: "face", label: "Face Scan", icon: ScanFace, render: (p) => <FaceScanCard suspect={p} /> },
    { id: "shadow", label: "Shadow Profiles", icon: EyeOff,
      badge: profile.shadowAccounts && profile.shadowAccounts.length > 0 ? { tone: "stamp", text: String(profile.shadowAccounts.length) } : undefined,
      render: (p) => <ShadowAccounts suspect={p} /> },
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
    { id: "dark", label: "Dark Web Logs", icon: AlertTriangle, render: (p) => <DarkWebMonitor suspect={p} /> },
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
              {(p.riskSignals || []).map((s, i) => (
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
            <img src={p.photoUrl} alt={p.realName} className="aspect-square w-full bg-muted object-cover animate-pulse-fast" />
          </div>
          <Field label="Real name" value={p.realName} />
          <Field label="Primary handle" value={p.username.startsWith("@") ? p.username : "@" + p.username} mono />
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

function AccountsTab({ p }: { p: SuspectProfile }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {p.accounts.map((a, idx) => (
        <Card key={idx} className="card-3d sheen-sweep">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between">
              <div className="font-mono text-[10px] uppercase tracking-wider text-stamp">{a.platform}</div>
              {(a.confidence === "CONFIRMED" || (a as any).verified) && <Badge variant="outline" className="text-[10px]">verified</Badge>}
            </div>
            <div className="font-mono text-sm font-semibold">{a.username.startsWith("@") ? a.username : "@" + a.username}</div>
            {a.bio && <p className="text-xs text-muted-foreground line-clamp-2">{a.bio}</p>}
            <div className="flex justify-between border-t border-border pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{a.followers?.toLocaleString() ?? "—"} followers</span>
              <span>Last: {a.creationDate || (a as any).lastActive || "—"}</span>
            </div>
            <div className="pt-2 text-right">
              <a href={a.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-evidence hover:underline inline-flex items-center gap-1">
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
    s === "OPEN" || s === "FOUND_PUBLIC_MENTION" ? "bg-stamp text-primary-foreground" :
    s === "UNDER_INVESTIGATION" ? "bg-warn text-ink" : "bg-muted text-foreground";

  // If we have real upiFootprint data from backend
  if (u) {
    const totalComplaints = u.ncrp.complaintCount || (u.ncrp.status === "FOUND_PUBLIC_MENTION" ? 1 : 0);
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <IndianRupee className="h-4 w-4 text-stamp" /> UPI handles
              </CardTitle>
              <CardDescription>Probable VPAs across Payment Service Providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {u.probableUpiIds.map((handle: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 font-mono text-xs">
                  <span>{handle.id}</span>
                  <Badge variant="outline" className="text-[10px]">{handle.source}</Badge>
                </div>
              ))}
              {u.probableUpiIds.length === 0 && (
                <p className="text-xs text-muted-foreground font-mono">No inferred UPI handles identified.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <PhoneCall className="h-4 w-4 text-stamp" /> Truecaller
              </CardTitle>
              <CardDescription>Carrier intelligence and community signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {u.truecaller.status === "PUBLIC_DATA_UNAVAILABLE" || !u.truecaller.name ? (
                <p className="text-xs text-muted-foreground font-mono">Truecaller public details unavailable.</p>
              ) : (
                <>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Display name</div>
                    <div className="font-semibold">{u.truecaller.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">Carrier</span>
                      <div className="font-mono">{u.truecaller.carrier || "Unknown"}</div>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">Circle</span>
                      <div className="font-mono">{u.truecaller.telecomCircle || "Unknown"}</div>
                    </div>
                  </div>
                  {u.truecaller.spamScore !== undefined && (
                    <div>
                      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider">
                        <span className="text-muted-foreground">Spam score</span>
                        <span className="font-semibold text-stamp">{u.truecaller.spamScore}/100</span>
                      </div>
                      <Progress value={u.truecaller.spamScore} className="mt-1 h-1.5" />
                    </div>
                  )}
                </>
              )}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusTone(u.ncrp.status) + " font-mono text-[10px]"}>{u.ncrp.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Complaint Hits</span>
                <span className="font-mono font-semibold">{totalComplaints}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2 leading-relaxed border-t border-border/40 pt-2">{u.ncrp.note}</p>
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

  return null;
}

function Placeholder({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
