import React, { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, AlertCircle, Clock, ExternalLink, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SearchEngineEvidence } from "@/lib/types";

interface Props {
  logs?: SearchEngineEvidence[];
  matrix?: Record<string, Record<string, "Found" | "Partial" | "Unavailable">>;
}

export default function SearchEngineEvidencePanel({ logs = [], matrix = {} }: Props) {
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  const toggleExpand = (engine: string) => {
    setExpandedEngine(expandedEngine === engine ? null : engine);
  };

  const getStatusBadge = (log?: SearchEngineEvidence) => {
    if (!log) return <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-mono text-[9px] uppercase border">Unattempted</Badge>;
    if (!log.success) return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-250 font-mono text-[9px] uppercase font-bold animate-pulse">Failed</Badge>;
    if (log.engine === "Wayback") return <Badge className="bg-purple-100 text-purple-700 border-purple-250 font-mono text-[9px] uppercase font-extrabold border">Archived Profile Found</Badge>;
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 font-mono text-[9px] uppercase font-extrabold border">✓ Found</Badge>;
  };

  const getMatrixColor = (status?: "Found" | "Partial" | "Unavailable") => {
    if (status === "Found") return "bg-emerald-50 text-emerald-700 font-bold border-emerald-200";
    if (status === "Partial") return "bg-amber-50 text-amber-700 font-bold border-amber-200";
    return "bg-slate-100 text-slate-400 border-slate-200 font-medium";
  };

  const matrixFields = ["Name", "Headline", "Company", "Location", "Education"];

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl">
      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 font-display text-sm text-ink">
          <Database className="w-4.5 h-4.5 text-blue-650 shrink-0" />
          PUBLIC SEARCH ACQUISITION LOGS
        </CardTitle>
        <CardDescription className="text-slate-550 font-mono text-[10px]">
          Multi-engine OSINT index acquisition and evidentiary validation matrix.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        
        {/* Task 5: Merge Matrix */}
        <div className="space-y-2">
          <h5 className="font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">Evidence Merge Matrix</h5>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/20">
            <Table className="text-[10px] font-mono">
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-ink">FIELD</TableHead>
                  <TableHead className="text-center font-bold text-ink">BING</TableHead>
                  <TableHead className="text-center font-bold text-ink">YAHOO</TableHead>
                  <TableHead className="text-center font-bold text-ink">DDG</TableHead>
                  <TableHead className="text-center font-bold text-ink">WAYBACK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixFields.map((field) => {
                  const key = field.toLowerCase();
                  const row = matrix[key] || {};
                  return (
                    <TableRow key={field} className="hover:bg-slate-50/50">
                      <td className="font-bold text-ink py-2.5">{field}</td>
                      {["Bing", "Yahoo", "DuckDuckGo", "Wayback"].map((eng) => {
                        const engKey = eng === "DuckDuckGo" ? "ddg" : eng.toLowerCase();
                        const status = row[engKey] || "Unavailable";
                        return (
                          <TableCell key={eng} className="text-center py-2.5">
                            <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 border text-[8px] uppercase tracking-wider font-extrabold ${getMatrixColor(status)}`}>
                              {status === "Found" ? "✓" : status === "Partial" ? "Part" : "—"}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Task 3: Engine Result Cards */}
        <div className="space-y-2.5">
          <h5 className="font-mono text-[10px] uppercase tracking-wider text-slate-600 font-bold">Acquisition Logs</h5>
          {logs.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 font-mono text-xs text-slate-500">
              No search engine evidence logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const isExpanded = expandedEngine === log.engine;
                return (
                  <div key={log.engine} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white hover:border-slate-305 transition-colors">
                    <button
                      onClick={() => toggleExpand(log.engine)}
                      className="w-full flex items-center justify-between p-3 font-mono text-[10px] font-bold text-ink hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-900 font-extrabold text-[11px]">{log.engine}</span>
                        {getStatusBadge(log)}
                        <span className="text-slate-400 font-semibold">{log.responseTimeMs} ms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">
                          {log.fieldsExtracted.length} fields
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-3 border-t border-slate-100 bg-slate-50/30 space-y-3 font-mono text-[10px] text-ink leading-relaxed">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Search Query</span>
                            <div className="p-2 border border-slate-200 bg-white rounded-lg text-slate-800 break-all select-all font-mono font-semibold">
                              {log.query}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Returned URL</span>
                            <div className="p-2 border border-slate-200 bg-white rounded-lg text-slate-800 truncate">
                              {log.profileUrl ? (
                                <a href={log.profileUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline flex items-center gap-1 font-semibold">
                                  {log.profileUrl.replace(/https?:\/\/(?:www\.)?/, "")}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : "—"}
                            </div>
                          </div>
                        </div>

                        {log.title && (
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Title Extracted</span>
                            <div className="p-2 border border-slate-200 bg-white rounded-lg text-slate-900 font-bold">
                              {log.title}
                            </div>
                          </div>
                        )}

                        {log.snippet && (
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Snippet / Description</span>
                            <p className="p-2.5 border border-slate-200 bg-white rounded-lg text-slate-700 font-medium leading-relaxed font-sans">
                              {log.snippet}
                            </p>
                          </div>
                        )}

                        <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Engine Confidence</span>
                            <div className="font-bold text-indigo-900 text-sm mt-0.5">{log.confidence}%</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Searched At</span>
                            <div className="font-semibold text-slate-700 mt-0.5">{new Date(log.searchedAt).toLocaleTimeString()}</div>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Extracted Fields</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.fieldsExtracted.length === 0 ? (
                                <span className="text-slate-400 italic">None</span>
                              ) : (
                                log.fieldsExtracted.map(f => (
                                  <Badge key={f} variant="outline" className="bg-indigo-50/50 border-indigo-200 text-indigo-850 py-0 px-1.5 text-[8px] font-mono font-bold">{f}</Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
