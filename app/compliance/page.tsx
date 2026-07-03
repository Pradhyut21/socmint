"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, ShieldCheck, FileCheck, ChevronDown, ChevronRight, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/lib/storage";
import { buildSeedAuditLogs } from "@/lib/mock-data";

export default function CompliancePage() {
  const [logs, setLogs] = useState<{ id: string; ts: string; action: string; detail?: string }[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const existing = storage.getAudit();
    setLogs(existing.length === 0 ? buildSeedAuditLogs() : existing);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Legal Compliance & Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every action against a suspect file is logged. Retention: 7 years.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Source legitimacy", body: "Only public OSINT sources are queried. No private API scraping. No password cracking. Aligned with KSP General Order 14/2024." },
          { icon: FileCheck, title: "Evidence integrity", body: "All dossiers carry a SHA-256 hash and IST timestamp. Section 65B IT Act certificate is generated on export." },
          { icon: ScrollText, title: "Audit ledger", body: "Investigator queries, exports, and credential changes are recorded immutably below and synced to the supervising officer." },
        ].map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
            <PolicyCard icon={p.icon} title={p.title} body={p.body} />
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-display">Audit ledger</CardTitle>
            <CardDescription>Most recent 200 actions, this device.</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No entries yet. Run a sweep to populate the ledger.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {logs.map((l: any, i: number) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.02, duration: 0.25 }}
                    className="flex flex-col gap-1.5 py-3.5"
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-rose-900 text-white font-mono text-[9px] uppercase font-bold py-0.5">
                          {l.action}
                        </Badge>
                        {l.caseId && (
                          <Badge variant="outline" className="text-[9px] border-slate-300 text-slate-600 font-bold">
                            CASE: {l.caseId}
                          </Badge>
                        )}
                        {l.searchType && (
                          <Badge variant="outline" className="text-[9px] border-slate-300 text-slate-600">
                            TYPE: {l.searchType}
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                        {new Date(l.ts || l.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="font-sans text-sm text-slate-800 font-semibold leading-relaxed">
                      {l.detail || `${l.action} query executed.`}
                    </div>

                    {l.officer && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold border-t border-dashed border-slate-100 pt-1.5 mt-0.5 font-mono">
                        <span>👮 Officer: <strong className="text-slate-700">{l.officer.name} ({l.officer.badge})</strong></span>
                        <span>Unit: <strong className="text-slate-600">{l.officer.unit}</strong></span>
                        {l.investigationTarget && (
                          <span>Target: <strong className="text-indigo-900">@{l.investigationTarget}</strong></span>
                        )}
                        {l.platformsQueried && l.platformsQueried.length > 0 && (
                          <span>Platforms: <strong className="text-slate-700">{l.platformsQueried.length}</strong></span>
                        )}
                        {l.evidenceCount !== undefined && (
                          <span>Evidence: <strong className="text-emerald-750">{l.evidenceCount} items</strong></span>
                        )}
                        {l.durationMs !== undefined && (
                          <span>Duration: <strong className="text-slate-600">{l.durationMs}ms</strong></span>
                        )}
                      </div>
                    )}
                  </motion.li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Safety Guardrails Card */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.35 }}>
        <Card className="mt-6 border-l-4 border-l-stamp">
          <CardHeader>
            <CardTitle className="font-display">OSINT Boundaries & Safety Guardrails</CardTitle>
            <CardDescription>
              SOCMINT Shield is configured with strict, compiler-enforced limitations to align with platform Terms of Service, data privacy acts (DPDP Act 2023), and cyber law.
            </CardDescription>
            <div className="relative mt-2 max-w-sm">
              <input
                type="text"
                placeholder="Search safety guardrails..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1 text-xs outline-none focus:ring-1 focus:ring-stamp"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {GUARDRAILS.filter(g => 
                g.title.toLowerCase().includes(filterText.toLowerCase()) ||
                g.restricted.toLowerCase().includes(filterText.toLowerCase()) ||
                g.safeAlternative.toLowerCase().includes(filterText.toLowerCase())
              ).map((g) => {
                const isExpanded = expandedRule === g.id;
                return (
                  <div key={g.id} className="border border-border rounded-lg bg-slate-50/50 p-2 text-xs transition-colors">
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : g.id)}
                      className="w-full flex items-center justify-between text-left font-semibold text-slate-800 focus:outline-none hover:text-stamp"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {g.title}
                      </span>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-2 pl-5 space-y-2 border-t border-border pt-2 text-slate-650">
                        <div>
                          <strong className="text-rose-600 block mb-0.5">Restricted Behavior:</strong>
                          <p className="leading-relaxed">{g.restricted}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded p-2 mt-1.5">
                          <strong className="text-emerald-700 flex items-center gap-1 mb-0.5">
                            <CheckCircle className="h-3 w-3" /> Safe Alternative Deployed:
                          </strong>
                          <p className="text-emerald-950 font-medium leading-relaxed">{g.safeAlternative}</p>
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }}>
        <div className="mt-6 rounded-md border border-evidence/30 bg-evidence/5 p-4 text-sm">
          <Badge variant="outline" className="font-mono text-[10px] uppercase">Notice</Badge>
          <p className="mt-2">SOCMINT Shield does not authorize surveillance of citizens outside the scope of a registered case file. Misuse is a punishable offense under the IT Act and Karnataka Police Act.</p>
        </div>
      </motion.div>

      <Separator className="my-8" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Last review · {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
  );
}

const GUARDRAILS = [
  {
    id: "g1",
    title: "1. Instagram Private Data Scraping",
    restricted: "Attempts to automatically collect followers, following, stories, comments, likes, tagged users, and emails/phone numbers via private platform APIs.",
    safeAlternative: "Analyze only public profiles, public posts, public hashtags, and public comments indexed in search results."
  },
  {
    id: "g2",
    title: "2. Automatic Facebook Profile Scraping",
    restricted: "Automated extraction of friends, timeline, photos, groups, and mutual friends.",
    safeAlternative: "Limiting checks to public URLs and search indexes."
  },
  {
    id: "g3",
    title: "3. Automated LinkedIn Scraping",
    restricted: "Collecting employment history, skills, connections, education, and company listings via automated scrapers.",
    safeAlternative: "Generating search engine dorks to search public index pages rather than scraping LinkedIn directly."
  },
  {
    id: "g4",
    title: "4. WhatsApp Enumeration",
    restricted: "Automated checks for WhatsApp status, last seen, or profile picture assignments.",
    safeAlternative: "Only support manual investigator verification steps if required."
  },
  {
    id: "g5",
    title: "5. Telegram Enumeration Beyond Public Data",
    restricted: "Discovering hidden usernames, scraping private groups, or intercepting contact lists.",
    safeAlternative: "Accessing only public channels, public messages, and public usernames."
  },
  {
    id: "g6",
    title: "6. Large-Scale Reverse Phone Intelligence",
    restricted: "Linking phone numbers to proprietary identity databases (TruePeopleSearch, WhitePages, Spokeo) without license permissions.",
    safeAlternative: "Generating pre-formatted directory dorks for manual verification by the analyst."
  },
  {
    id: "g7",
    title: "7. Automated Financial App Enumeration",
    restricted: "Using automated scrapers against Cash App, Venmo, Zelle, or UPI APIs to check accounts.",
    safeAlternative: "Limiting features to investigator-submitted identifiers rather than automated API scraping loops."
  },
  {
    id: "g8",
    title: "8. Automatic Face Recognition against Social Media",
    restricted: "Automated matching of face landmarks across global social media indices (Instagram, TikTok).",
    safeAlternative: "Support manual photo evidence uploading and metadata EXIF parsing without automated biometrics matching."
  },
  {
    id: "g9",
    title: "9. Continuous Social Media Crawling",
    restricted: "Frequent polling/monitoring of profiles for updates which triggers anti-bot bans.",
    safeAlternative: "Analyst-triggered, on-demand query sweeps."
  },
  {
    id: "g10",
    title: "10. Bulk OSINT Harvesting",
    restricted: "Running automated loops against thousands of names or phone numbers.",
    safeAlternative: "Restricting investigations to single case references and manual trigger."
  },
  {
    id: "g11",
    title: "11. Automatic Data Breach Downloading",
    restricted: "Downloading raw database leaks or hosting breached password dumps locally.",
    safeAlternative: "Only referencing legitimate lookup notifications (e.g. HIBP) or allowing investigators to record details manually."
  },
  {
    id: "g12",
    title: "12. Automatic Evidence Collection from Restricted Pages",
    restricted: "Bypassing cookies, authorization headers, or access controls to extract evidence automatically.",
    safeAlternative: "Manual evidence ingestion where investigators copy text snapshots and provide source URLs manually."
  },
  {
    id: "g13",
    title: "13. Bypassing Search Engine Restrictions",
    restricted: "Circumventing CAPTCHAs, search engine rate limits, or IP bans.",
    safeAlternative: "Using search caching, standard requests, and query throttling."
  },
  {
    id: "g14",
    title: "14. Live Tracking / Geolocation from Phones",
    restricted: "Determining real-time geolocation of a device from a phone number using non-public means.",
    safeAlternative: "Using only publicly posted geotagged photo metadata or voluntarily shared event records."
  },
  {
    id: "g15",
    title: "15. Hidden Profile Discovery",
    restricted: "Accessing private, deleted, or hidden social media records.",
    safeAlternative: "Limiting intelligence compilation strictly to publicly indexed, open-source records."
  }
];

function PolicyCard({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-stamp/10 text-stamp">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-display text-base font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
