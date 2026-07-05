"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, ShieldCheck, FileCheck, ChevronDown, ChevronRight, Search, AlertTriangle, CheckCircle, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/lib/storage";
import { buildSeedAuditLogs } from "@/lib/mock-data";

// Translate internal action codes to human-readable labels
function actionLabel(action: string) {
  const map: Record<string, { label: string; color: string }> = {
    INVESTIGATE:         { label: "INVESTIGATE",  color: "bg-forest text-ivory" },
    EXPORT_REPORT:       { label: "EXPORT",        color: "bg-ember text-ivory" },
    ANALYST_UPDATED:     { label: "PROFILE",       color: "bg-forest-2 text-ivory" },
    HISTORY_CLEARED:     { label: "CLEAR",         color: "bg-rust text-ivory" },
    CASE_DELETED:        { label: "DELETE",         color: "bg-rust text-ivory" },
    ALERT_AUDITED:       { label: "ALERT",          color: "bg-forest-2 text-ivory" },
    EVIDENCE_MANIFEST_EXPORTED: { label: "EXPORT", color: "bg-ember text-ivory" },
  };
  const m = map[action];
  return m ?? { label: action.slice(0, 10), color: "bg-forest-2 text-ivory" };
}

export default function CompliancePage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const existing = storage.getAudit();
    setLogs(existing.length === 0 ? buildSeedAuditLogs() : existing);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-forest">Legal Compliance & Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every action against a suspect file is logged. Retention: 7 years.</p>
      </div>

      {/* Policy cards */}
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {[
          { icon: ShieldCheck, title: "Source legitimacy", body: "Only public OSINT sources are queried. No private API scraping. No password cracking. Aligned with KSP General Order 14/2024." },
          { icon: FileCheck,   title: "Evidence integrity",  body: "All dossiers carry a SHA-256 hash and IST timestamp. Section 65B IT Act certificate is generated on export." },
          { icon: ScrollText,  title: "Audit ledger",        body: "Investigator queries, exports, and credential changes are recorded immutably below and synced to the supervising officer." },
        ].map((p, i) => (
          <motion.div key={p.title} className="h-full" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col space-y-2.5 p-5">
                <div className="inline-flex h-9 w-9 items-center justify-center bg-stamp/10 text-stamp">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="font-display text-base font-semibold text-forest">{p.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Audit ledger */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-lg text-forest">Audit Ledger</CardTitle>
            <CardDescription className="font-mono text-[11px] uppercase tracking-wider">
              {logs.length} entries · this device
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No entries yet. Run a sweep to populate the ledger.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((l: any, i: number) => {
                  const { label, color } = actionLabel(l.action);
                  const ts = new Date(l.ts || l.timestamp);
                  const formattedDate = ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                  const formattedTime = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

                  return (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.015, duration: 0.2 }}
                      className="grid gap-2 px-5 py-4"
                      style={{ gridTemplateColumns: "5rem 1fr auto" }}
                    >
                      {/* Action badge */}
                      <div className="pt-0.5">
                        <span className={`inline-block font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 ${color}`}>
                          {label}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-forest leading-snug truncate">
                          {l.detail || `${l.action} action recorded.`}
                        </p>
                        {l.officer && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              {l.officer.name}
                              {l.officer.badge && <span className="text-[9px] opacity-70">({l.officer.badge})</span>}
                            </span>
                            {l.investigationTarget && (
                              <span>→ <span className="text-forest font-semibold">@{l.investigationTarget}</span></span>
                            )}
                            {l.caseId && (
                              <span className="opacity-70">{l.caseId}</span>
                            )}
                            {l.platformsQueried?.length > 0 && (
                              <span>{l.platformsQueried.length} platforms</span>
                            )}
                            {l.evidenceCount !== undefined && (
                              <span>{l.evidenceCount} evidence</span>
                            )}
                            {l.durationMs !== undefined && (
                              <span>{(l.durationMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-right shrink-0 font-mono text-[10px] text-muted-foreground leading-tight">
                        <div className="font-semibold">{formattedDate}</div>
                        <div className="opacity-70">{formattedTime}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Safety guardrails */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.3 }}>
        <Card className="border-l-4 border-l-stamp">
          <CardHeader>
            <CardTitle className="font-display text-lg text-forest">OSINT Boundaries & Safety Guardrails</CardTitle>
            <CardDescription>
              Strict, compiler-enforced limitations aligned with the DPDP Act 2023 and platform Terms of Service.
            </CardDescription>
            <div className="relative mt-2 max-w-xs">
              <input
                type="text"
                placeholder="Search guardrails..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-background border border-border pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-stamp"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {GUARDRAILS.filter(g =>
                g.title.toLowerCase().includes(filterText.toLowerCase()) ||
                g.restricted.toLowerCase().includes(filterText.toLowerCase())
              ).map((g) => {
                const isExpanded = expandedRule === g.id;
                return (
                  <div key={g.id} className="border border-border bg-paper/50 text-xs">
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : g.id)}
                      className="w-full flex items-center justify-between gap-2 p-3 text-left font-semibold text-forest hover:text-stamp transition-colors focus:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-warn shrink-0" />
                        {g.title}
                      </span>
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      }
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border/60">
                        <div className="pt-2">
                          <p className="font-semibold text-rust mb-1">Restricted:</p>
                          <p className="text-forest/80 leading-relaxed">{g.restricted}</p>
                        </div>
                        <div className="border border-stamp/20 bg-stamp/5 p-2">
                          <p className="font-semibold text-stamp flex items-center gap-1 mb-1">
                            <CheckCircle className="h-3 w-3" /> Safe Alternative:
                          </p>
                          <p className="text-forest/80 leading-relaxed">{g.safeAlternative}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notice */}
      <div className="border border-stamp/25 bg-stamp/5 p-4 text-sm text-forest">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stamp block mb-1">Notice</span>
        SOCMINT Shield does not authorize surveillance of citizens outside the scope of a registered case file. Misuse is a punishable offense under the IT Act and Karnataka Police Act.
      </div>

      <Separator />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Last review · {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

const GUARDRAILS = [
  { id: "g1",  title: "1. Instagram Private Data Scraping",        restricted: "Automatically collecting followers, following, stories, comments, likes, tagged users, and contact details via private APIs.",  safeAlternative: "Analyze only public profiles and search-indexed posts." },
  { id: "g2",  title: "2. Facebook Profile Scraping",              restricted: "Automated extraction of friends, timeline, photos, groups, and mutual friends.",                                               safeAlternative: "Public URLs and search indexes only." },
  { id: "g3",  title: "3. LinkedIn Automated Scraping",            restricted: "Collecting employment history, skills, connections, and company data via automated scrapers.",                                  safeAlternative: "Search engine dorks against the public index." },
  { id: "g4",  title: "4. WhatsApp Enumeration",                   restricted: "Automated checks for status, last seen, or profile pictures.",                                                                  safeAlternative: "Manual investigator verification only." },
  { id: "g5",  title: "5. Telegram Beyond Public Data",            restricted: "Discovering hidden usernames, scraping private groups, or intercepting contact lists.",                                         safeAlternative: "Public channels and publicly visible usernames." },
  { id: "g6",  title: "6. Reverse Phone Intelligence",             restricted: "Linking phone numbers to proprietary identity databases without license.",                                                       safeAlternative: "Pre-formatted dorks for manual analyst verification." },
  { id: "g7",  title: "7. Financial App Enumeration",              restricted: "Automated scraping against UPI, Cash App, Venmo, or Zelle APIs.",                                                               safeAlternative: "Investigator-submitted identifiers only." },
  { id: "g8",  title: "8. Facial Recognition Automation",          restricted: "Automated face matching across social media indices.",                                                                           safeAlternative: "Manual photo upload with EXIF metadata parsing." },
  { id: "g9",  title: "9. Continuous Social Media Crawling",       restricted: "Frequent polling of profiles for updates, triggering anti-bot bans.",                                                           safeAlternative: "Analyst-triggered, on-demand sweeps." },
  { id: "g10", title: "10. Bulk OSINT Harvesting",                 restricted: "Automated loops against thousands of names or phone numbers.",                                                                  safeAlternative: "Single case reference per manually triggered investigation." },
  { id: "g11", title: "11. Breach Data Downloading",               restricted: "Downloading raw database leaks or hosting breached dumps locally.",                                                              safeAlternative: "Referencing HIBP lookup notifications only." },
  { id: "g12", title: "12. Restricted Page Evidence Collection",   restricted: "Bypassing cookies, auth headers, or access controls.",                                                                          safeAlternative: "Manual evidence ingestion with investigator-provided source URLs." },
  { id: "g13", title: "13. Search Engine Restriction Bypass",      restricted: "Circumventing CAPTCHAs, rate limits, or IP bans.",                                                                              safeAlternative: "Standard requests with query throttling and caching." },
  { id: "g14", title: "14. Live Device Geolocation",               restricted: "Determining real-time geolocation from a phone number via non-public means.",                                                   safeAlternative: "Publicly geotagged photo metadata or voluntarily shared records." },
  { id: "g15", title: "15. Hidden Profile Discovery",              restricted: "Accessing private, deleted, or hidden social media records.",                                                                    safeAlternative: "Publicly indexed, open-source records only." },
];
