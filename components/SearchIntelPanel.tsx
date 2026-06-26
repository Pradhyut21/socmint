"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Copy, ExternalLink, ShieldAlert, FileText, CheckCircle2, 
  Search, Loader2, Pin, AlertCircle, Fingerprint, Shield, BookmarkCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { SuspectProfile, SearchIntelQuery, SearchIntelResult, SearchIntelBundle } from "@/lib/types";
import { getArtifactsByCaseRef, pinEvidence } from "@/lib/evidence/evidenceCaptureService";
import { deduplicateResults } from "@/lib/search/searchIntel";

interface SearchIntelPanelProps {
  suspect: SuspectProfile;
}

const CATEGORY_LABELS: Record<string, string> = {
  exact_match: "Exact Matches",
  social_profiles: "Social Profiles",
  scam_complaints: "Scam / Complaints",
  documents_files: "Documents / Files",
  forums_pastes: "Forums / Pastes",
  messaging_handles: "Messaging / Contact Handles",
  business_reputation: "Business & Reputation",
  legal_public_refs: "Legal & Public Refs",
  professional_academic: "Professional & Academic Discovery",
  custom: "Custom Search Dorks",
};

export default function SearchIntelPanel({ suspect }: SearchIntelPanelProps) {
  const [queries, setQueries] = useState<SearchIntelQuery[]>(suspect.searchIntel?.queries || []);
  const [findings, setFindings] = useState<SearchIntelResult[]>(suspect.searchIntel?.results || []);
  
  // Track loading state per query ID
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  // Track pinned item URLs/titles to prevent double-pinning
  const [pinnedItems, setPinnedItems] = useState<Set<string>>(new Set());

  // Load pinned evidence artifacts on mount or when findings update
  useEffect(() => {
    const loadPinnedStatus = () => {
      const artifacts = getArtifactsByCaseRef(suspect.caseReference);
      const pinned = new Set<string>();
      for (const art of artifacts) {
        if (art.sourceUrl) {
          pinned.add(art.sourceUrl.toLowerCase().trim());
        } else {
          pinned.add(art.title.toLowerCase().trim());
        }
      }
      setPinnedItems(pinned);
    };

    loadPinnedStatus();
  }, [suspect, findings]);



  // Persists merged findings back to the recent investigations cache in localStorage
  const persistFindings = (updatedFindings: SearchIntelResult[]) => {
    try {
      const stored = localStorage.getItem("socmint_recent_investigations");
      if (!stored) return;
      
      const recents = JSON.parse(stored);
      const updatedRecents = recents.map((item: SuspectProfile) => {
        if (item.caseReference === suspect.caseReference) {
          return {
            ...item,
            searchIntel: {
              ...(item.searchIntel || {}),
              results: updatedFindings
            }
          };
        }
        return item;
      });
      localStorage.setItem("socmint_recent_investigations", JSON.stringify(updatedRecents));
    } catch (e) {
      console.error("[Persist] Failed to update search intel findings cache:", e);
    }
  };

  const handleCopyQuery = (queryStr: string) => {
    navigator.clipboard.writeText(queryStr);
    toast.success("Dork query copied to clipboard", {
      description: "You can paste this directly into search engines."
    });
  };

  const handleRunLiveSearch = async (queryObj: SearchIntelQuery) => {
    setLoadingStates(prev => ({ ...prev, [queryObj.id]: true }));
    toast.loading(`Running public search for "${queryObj.label}"...`, { id: queryObj.id });

    try {
      const resp = await fetch("/api/search-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryObj.query,
          queryId: queryObj.id,
          category: queryObj.category
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Search execution failed.");
      }

      const results = (data.results || []) as SearchIntelResult[];
      
      if (results.length === 0) {
        toast.dismiss(queryObj.id);
        toast.info("No live findings returned.", {
          description: "Google search returned zero public results matching this query."
        });
        return;
      }

      // Merge and deduplicate
      const merged = deduplicateResults(findings, results);
      setFindings(merged);
      persistFindings(merged);

      toast.dismiss(queryObj.id);
      toast.success(`Discovered ${results.length} new finding(s)`, {
        description: `Successfully integrated and deduped open-web results.`
      });
    } catch (err) {
      toast.dismiss(queryObj.id);
      toast.error("Live search failed", {
        description: err instanceof Error ? err.message : "Connection error"
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [queryObj.id]: false }));
    }
  };

  const handlePinToEvidence = async (finding: SearchIntelResult) => {
    const itemKey = finding.url ? finding.url.toLowerCase().trim() : finding.title.toLowerCase().trim();
    if (pinnedItems.has(itemKey)) {
      toast.info("Already pinned", { description: "This finding is already registered in the court evidence dossier." });
      return;
    }

    try {
      await pinEvidence({
        caseReference: suspect.caseReference,
        sourcePlatform: finding.source || "Web Discovery",
        sourceUrl: finding.url || null,
        query: finding.matchedQueryIds.map(id => {
          const match = queries.find(q => q.id === id);
          return match ? match.query : "Dork query";
        }).join(" | "),
        title: finding.title,
        textSnapshot: finding.snippet,
        metadataSnapshot: {
          categories: finding.categories,
          confidence: finding.confidence,
          riskTags: finding.riskTags,
          origin: finding.origin,
          executedAt: finding.executedAt
        },
        tags: ["search-intel", ...finding.riskTags.map(t => t.toLowerCase().replace(/\s+/g, "-"))],
        provenance: "search_intel"
      });

      setPinnedItems(prev => {
        const next = new Set(prev);
        next.add(itemKey);
        return next;
      });

      toast.success("Pinned to Evidence Package", {
        description: "Registered Section 65B signature and calculated SHA-256."
      });
    } catch (e) {
      toast.error("Failed to pin evidence", { description: String(e) });
    }
  };

  // Group queries by category
  const queriesByCategory = queries.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, SearchIntelQuery[]>);

  // Group findings into high-signal buckets
  const getBucketName = (item: SearchIntelResult) => {
    const url = item.url ? item.url.toLowerCase() : "";
    const isSocial = item.categories.includes("social_profiles") || 
                     item.riskTags.includes("SOCIAL PROFILE") ||
                     item.riskTags.includes("DEVELOPER PROFILE") ||
                     /instagram\.com|x\.com|twitter\.com|facebook\.com|reddit\.com|youtube\.com|linkedin\.com|github\.com|gitlab\.com|t\.me/i.test(url);
    if (isSocial) return "Social Profiles";

    const isScam = item.categories.includes("scam_complaints") || 
                   item.riskTags.includes("COMPLAINT/SCAM") ||
                   /scam|fraud|complaint|cheater|consumercomplaint|cybercrime/i.test(item.title + " " + item.snippet);
    if (isScam) return "Scam / Complaint Mentions";

    const isForums = item.categories.includes("forums_pastes") || 
                     item.riskTags.includes("PASTE BIN") || 
                     item.riskTags.includes("EXPOSED DATA") ||
                     /pastebin\.com|justpaste\.it|paste\.org|leak|breach/i.test(url);
    if (isForums) return "Forums / Paste Mentions";

    const isDoc = item.categories.includes("documents_files") || /\.(pdf|docx|xlsx|csv|pptx|zip)/i.test(url);
    if (isDoc) return "Documents & Public Files";

    const isBusiness = item.categories.includes("business_reputation") || 
                       item.categories.includes("domain") || 
                       item.categories.includes("company") ||
                       item.categories.includes("professional_academic") ||
                       /zaubacorp|mca\.gov|abuseipdb|shodan|virustotal|urlvoid|linkedin\.com\/company/i.test(url);
    if (isBusiness) return "Business & Domain References";

    return "Raw & Uncategorized Findings";
  };

  const findingsByBucket = findings.reduce((acc, f) => {
    const bucket = getBucketName(f);
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(f);
    return acc;
  }, {} as Record<string, SearchIntelResult[]>);

  const bucketsOrder = [
    "Social Profiles",
    "Scam / Complaint Mentions",
    "Business & Domain References",
    "Documents & Public Files",
    "Forums / Paste Mentions",
    "Raw & Uncategorized Findings"
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-mono text-xs text-foreground">
      
      {/* Column 1 & 2: Dork Queries & Findings */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Section A: Generated Dorks */}
        <Card className="border border-border/80 bg-background/50 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-ink font-bold">
              <Fingerprint className="w-4 h-4 text-stamp" /> Advanced Dork Query Bundles
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Entity-aware search queries generated automatically for open-web investigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin">
            {/* Context Hints Section */}
            {suspect.searchIntel?.contextHints && (
              (suspect.searchIntel.contextHints.names.length > 0 ||
               suspect.searchIntel.contextHints.colleges.length > 0 ||
               suspect.searchIntel.contextHints.companies.length > 0)
            ) && (
              <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 mb-4 space-y-2 font-mono">
                <div className="font-bold text-[10px] text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-stamp" /> Professional/Academic Context Hints Sourced
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] leading-relaxed">
                  {suspect.searchIntel.contextHints.names.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-bold block">Extracted Names:</span>
                      <div className="flex flex-wrap gap-1">
                        {suspect.searchIntel.contextHints.names.map(name => (
                          <Badge key={name} variant="outline" className="bg-card text-[9px] font-normal font-mono border-border/60">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {suspect.searchIntel.contextHints.colleges.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-bold block">Extracted Colleges:</span>
                      <div className="flex flex-wrap gap-1">
                        {suspect.searchIntel.contextHints.colleges.map(coll => (
                          <Badge key={coll} variant="outline" className="bg-card text-[9px] font-normal font-mono border-border/60">{coll}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {suspect.searchIntel.contextHints.companies.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-bold block">Extracted Companies:</span>
                      <div className="flex flex-wrap gap-1">
                        {suspect.searchIntel.contextHints.companies.map(comp => (
                          <Badge key={comp} variant="outline" className="bg-card text-[9px] font-normal font-mono border-border/60">{comp}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {Object.keys(queriesByCategory).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground italic">
                No query dorks generated. Populate suspect usernames, email, or phone.
              </div>
            ) : (
              Object.entries(queriesByCategory).map(([cat, qList]) => (
                <div key={cat} className="space-y-2">
                  <Badge variant="outline" className="bg-muted text-[10px] tracking-wide uppercase px-2 py-0.5 rounded border border-border">
                    {CATEGORY_LABELS[cat] || cat}
                  </Badge>
                  <div className="grid gap-2 pl-1">
                    {qList.map((q) => (
                      <div 
                        key={q.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/65 hover:bg-card hover:border-border/120 transition-all"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-semibold text-foreground/90">{q.label}</div>
                          <div className="text-[11px] text-amber-500 break-all select-all font-mono">
                            {q.query}
                          </div>
                          {q.notes && <div className="text-[9px] text-muted-foreground">{q.notes}</div>}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopyQuery(q.query)}
                            title="Copy Query"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            asChild
                            title="Launch in New Tab"
                          >
                            <a 
                              href={`https://www.google.com/search?q=${encodeURIComponent(q.query)}`} 
                              target="_blank" 
                              rel="noreferrer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                          <Button 
                            size="sm"
                            className="h-8 text-[10px] font-bold tracking-wider uppercase bg-ink text-paper hover:bg-ink/80 transition-all shrink-0"
                            onClick={() => handleRunLiveSearch(q)}
                            disabled={loadingStates[q.id]}
                          >
                            {loadingStates[q.id] ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Searching
                              </>
                            ) : (
                              <>
                                <Search className="w-3 h-3 mr-1" /> Run Live
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3 opacity-40" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Section B: Search Findings */}
        <Card className="border border-border/80 bg-background/50 backdrop-blur-sm shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm uppercase tracking-wider text-ink font-bold">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-stamp" /> Web Discovery & Findings
              </span>
              <Badge variant="outline" className="font-mono text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {findings.length} Record(s) Merged
              </Badge>
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Deduplicated finding leads grouped by behavioral intelligence categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
            {findings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/20">
                <Globe className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2 animate-pulse" />
                <div className="font-bold text-foreground/80 mb-1">No Public Findings Sweep Run</div>
                <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">
                  Execute &quot;Run Live&quot; on any of the query dorks above to scan Google index records and harvest discoveries.
                </p>
              </div>
            ) : (
              bucketsOrder.map((bucket) => {
                const list = findingsByBucket[bucket] || [];
                if (list.length === 0) return null;

                return (
                  <div key={bucket} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-1">
                      <span className="font-bold text-[11px] text-ink uppercase tracking-wider">{bucket}</span>
                      <span className="text-[9px] text-muted-foreground">({list.length})</span>
                    </div>

                    <div className="grid gap-3">
                      {list.map((f) => {
                        const itemKey = f.url ? f.url.toLowerCase().trim() : f.title.toLowerCase().trim();
                        const isPinned = pinnedItems.has(itemKey);

                        return (
                          <div 
                            key={f.id} 
                            className="p-3 rounded-xl border border-border bg-card/40 hover:bg-card/75 transition-all flex flex-col justify-between gap-3 shadow-sm relative overflow-hidden"
                          >
                            <div className="space-y-1.5">
                              {/* Headers / Source badge */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge className="bg-ink text-paper text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded">
                                  {f.source}
                                </Badge>
                                {f.riskTags.map(tag => (
                                  <Badge key={tag} className="bg-red-500/10 text-red-500 border border-red-500/25 text-[8px] font-bold">
                                    {tag}
                                  </Badge>
                                ))}
                                <Badge className={`text-[8px] capitalize ${f.confidence === "high" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/25" : f.confidence === "medium" ? "bg-amber-500/15 text-amber-500 border border-amber-500/25" : "bg-muted text-muted-foreground border border-border"}`}>
                                  {f.confidence} Confidence
                                </Badge>
                                <Badge className="text-[8px] bg-muted/60 text-muted-foreground">
                                  Origin: {f.origin}
                                </Badge>
                              </div>

                              {/* Title / Click Link */}
                              <h5 className="font-bold text-[12px] text-foreground hover:underline">
                                {f.url ? (
                                  <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                                    {f.title} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  </a>
                                ) : (
                                  f.title
                                )}
                              </h5>

                              {/* Snippet */}
                              <p className="text-[11px] text-foreground/80 leading-relaxed bg-background/20 p-2 rounded border border-border/40 font-sans">
                                {f.snippet}
                              </p>
                            </div>

                            {/* Actions bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30 text-[9px] text-muted-foreground">
                              <div>
                                Executed: {new Date(f.executedAt).toLocaleString("en-IN")}
                              </div>
                              
                              <Button
                                size="sm"
                                variant={isPinned ? "ghost" : "outline"}
                                className={`h-7 text-[9px] font-mono font-bold tracking-wider uppercase transition-all px-2.5 rounded-lg ${isPinned ? "text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 cursor-default" : "text-foreground bg-background hover:bg-muted"}`}
                                onClick={() => handlePinToEvidence(f)}
                              >
                                {isPinned ? (
                                  <>
                                    <BookmarkCheck className="w-3.5 h-3.5 mr-1" /> Pinned
                                  </>
                                ) : (
                                  <>
                                    <Pin className="w-3.5 h-3.5 mr-1" /> Pin to Evidence
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

      </div>

      {/* Column 3: Analyst Guidance & Warnings */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Section C: Analyst Guidance */}
        <Card className="border border-border/80 bg-background/50 backdrop-blur-sm shadow-md h-full flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-ink font-bold">
              <Shield className="w-4 h-4 text-stamp" /> Investigator Guidelines
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Standard operating procedures for Search Intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 flex gap-2.5 items-start">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-red-500 uppercase tracking-wide">Analyst Caution</div>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                  Search Intelligence findings are public-web discovery leads and may require corroboration before attribution. Do not treat unverified snippets as direct proof of suspect identity.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card/30 space-y-2">
              <div className="font-bold text-foreground/90 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-stamp" /> Section 65B Compliance
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                When pinning a search finding as evidence:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[10px] text-muted-foreground/90 font-sans">
                <li>The crawler logs the precise UTC timestamp of retrieval automatically.</li>
                <li>The system registers the dork query string that generated the finding inside the metadata.</li>
                <li>SHA-256 integrity hash is computed immediately based on the text snippet, protecting chain of custody.</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card/30 space-y-2">
              <div className="font-bold text-foreground/90 uppercase tracking-wide flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-stamp" /> Manual Ingest Hand-Off
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                If you locate a high-value file or URL externally using copy-query dorks:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-[10px] text-muted-foreground/90 font-sans">
                <li>Copy the URL or document text.</li>
                <li>Navigate to the **Evidence Ingest** tab.</li>
                <li>Submit the item to run a Content Risk stylized safety check and archive it as evidence.</li>
              </ol>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
