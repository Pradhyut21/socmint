"use client";

import React, { useState } from "react";
import { 
  Shield, Brain, CheckCircle2, AlertTriangle, Info, Clock, 
  Terminal, Globe, Cpu, Users, Layers, ExternalLink, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SuspectProfile, PlatformAccount } from "@/lib/types";
import { correlateAccount } from "@/lib/intelligence/correlationEngine";

export default function IntelCorrelationTab({ p }: { p: SuspectProfile }) {
  const [selectedAccount, setSelectedAccount] = useState<PlatformAccount | null>(
    p.accounts && p.accounts.length > 0 ? p.accounts[0] : null
  );

  const quality = p.investigationQuality || {
    score: 75,
    reason: "Standard sweep completed.",
    breakdown: { searched: 20, responded: 14, evidenceCount: 6, verifiedCount: 4, correlationStrength: 72, timelineCount: 5, aiConfidence: 50 }
  };

  const reliability = p.evidenceReliability || [];
  const devFingerprint = p.developerFingerprint;
  const bioSimilarity = p.bioSimilarity;
  const statuses = p.platformStatuses || [];

  // Correlation analysis for selected account
  const correlation = selectedAccount ? correlateAccount(selectedAccount, p) : null;

  return (
    <div className="space-y-6 font-mono text-xs text-ink">
      
      {/* SECTION 1: Top Stats - Quality & Platform Status */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* 1. Investigation Quality Card */}
        <Card className="md:col-span-1 border-l-4 border-l-cyan-500 bg-cyan-950/5 border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Cpu className="w-24 h-24 text-cyan-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-cyan-900">
              <Shield className="h-4 w-4 text-cyan-650 animate-pulse" />
              INTELLIGENCE QUALITY SCORE
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Forensic confidence index</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-dashed border-cyan-500/30">
                <span className="font-display text-2xl font-black text-cyan-700">{quality.score}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-650 uppercase">Analysis Summary</div>
                <p className="text-[11px] text-slate-800 font-semibold leading-relaxed line-clamp-3 mt-1">
                  {quality.reason}
                </p>
              </div>
            </div>
            
            <Separator className="bg-slate-200" />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-600 font-semibold">PLATFORMS RESOLVED</span>
                <span className="font-bold">{quality.breakdown.responded} / {quality.breakdown.searched}</span>
              </div>
              <Progress value={(quality.breakdown.responded / quality.breakdown.searched) * 100} className="h-1 bg-slate-100" />
              
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-600 font-semibold">EVIDENCE VERIFIED</span>
                <span className="font-bold">{quality.breakdown.verifiedCount} / {quality.breakdown.evidenceCount}</span>
              </div>
              <Progress value={quality.breakdown.evidenceCount > 0 ? (quality.breakdown.verifiedCount / quality.breakdown.evidenceCount) * 100 : 0} className="h-1 bg-slate-100" />
              
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-600 font-semibold">CORRELATION STRENGTH</span>
                <span className="font-bold">{quality.breakdown.correlationStrength}%</span>
              </div>
              <Progress value={quality.breakdown.correlationStrength} className="h-1 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Platform Status Dashboard */}
        <Card className="md:col-span-2 border-l-4 border-l-indigo-500 bg-indigo-950/5 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-indigo-900">
              <Activity className="h-4 w-4 text-indigo-650" />
              PLATFORM ACQUISITION MONITOR
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Live query status across 21 forensic indexes</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[195px] overflow-y-auto pr-1 no-scrollbar">
              {statuses.map((s, idx) => {
                const isFound = s.status.includes("FOUND");
                const isRate = s.status === "RATE LIMITED";
                const isPrivate = s.status === "PRIVATE";
                const isUnavailable = s.status === "UNAVAILABLE";
                
                const badgeClass = isFound
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isRate
                  ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                  : isPrivate
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : isUnavailable
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-50 text-slate-500 border-slate-200";

                return (
                  <div key={idx} className="flex flex-col p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/50 shadow-inner transition-all group cursor-help" title={`${s.name}: ${s.reason || ""}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800 truncate max-w-[70%]">{s.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono">{s.responseTimeMs}ms</span>
                    </div>
                    <Badge variant="outline" className={`${badgeClass} font-mono text-[8px] px-1 py-0 uppercase font-extrabold w-max border`}>
                      {s.status}
                    </Badge>
                    <span className="text-[8px] text-slate-500 mt-1 line-clamp-1 group-hover:line-clamp-none leading-snug font-sans">
                      {s.reason || "Publicly unavailable."}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: Advanced Identity Correlation Analysis */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* Left: Correlation Panel */}
        <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-indigo-950">
              <Users className="h-4 w-4 text-indigo-650" />
              IDENTITY CORRELATION ENGINE
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Weighted evidence and conflicting signals prober</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex h-[360px]">
              
              {/* Account list */}
              <div className="w-1/3 border-r border-slate-150 overflow-y-auto bg-slate-50/50 p-2 space-y-1.5">
                <div className="text-[9px] font-bold text-slate-400 uppercase p-1.5 tracking-wider">Discovered Handles</div>
                {p.accounts.map((acc) => {
                  const isSelected = selectedAccount?.id === acc.id;
                  const score = correlateAccount(acc, p).confidence;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc)}
                      className={`w-full text-left p-2 rounded-xl border transition-all flex flex-col gap-0.5 ${
                        isSelected 
                          ? "bg-indigo-900 text-white border-indigo-900 shadow-md font-bold" 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[9px] uppercase tracking-wider ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>{acc.platform}</span>
                        <span className={`text-[9px] font-bold ${isSelected ? "text-emerald-300" : "text-emerald-650"}`}>{score}%</span>
                      </div>
                      <span className="text-[11px] truncate select-none font-semibold">@{acc.username}</span>
                    </button>
                  );
                })}
              </div>

              {/* Correlation details */}
              <div className="w-2/3 p-4 overflow-y-auto space-y-4">
                {selectedAccount && correlation ? (
                  <>
                    {/* Confidence Badge */}
                    <div className="p-3 rounded-xl border border-indigo-150 bg-indigo-50/20 flex flex-col gap-1 shadow-sm">
                      <div className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider">ATTRIBUTION CONFIDENCE</div>
                      <div className="font-display text-xs font-black text-indigo-950">
                        "{correlation.confidence}% confidence these profiles may belong to the same individual."
                      </div>
                      <p className="text-[10px] text-slate-600 font-sans mt-1 leading-relaxed">
                        {correlation.reasoningSummary}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 text-[10px]">
                      
                      {/* Positive Signals */}
                      <div className="space-y-2">
                        <div className="font-bold text-emerald-700 uppercase tracking-wide text-[9px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> POSITIVE SIGNALS
                        </div>
                        {correlation.positiveSignals.length === 0 ? (
                          <p className="text-slate-400 italic">No matching signals identified.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {correlation.positiveSignals.map((sig, idx) => (
                              <li key={idx} className="p-2 rounded-lg border border-emerald-150 bg-emerald-50/30 text-emerald-950 font-medium leading-relaxed">
                                <div className="flex justify-between font-bold text-emerald-800">
                                  <span>✓ {sig.name}</span>
                                  <span>+{sig.weight}</span>
                                </div>
                                <p className="text-[9px] text-emerald-900 font-normal mt-0.5 font-sans">{sig.description}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Negative Signals */}
                      <div className="space-y-2">
                        <div className="font-bold text-rose-700 uppercase tracking-wide text-[9px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> NEGATIVE SIGNALS
                        </div>
                        {correlation.negativeSignals.length === 0 ? (
                          <div className="p-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/10 text-emerald-800 text-[10px] font-sans leading-relaxed">
                            ✓ No conflicting signals or negative evidence detected for this profile link.
                          </div>
                        ) : (
                          <ul className="space-y-1.5">
                            {correlation.negativeSignals.map((sig, idx) => (
                              <li key={idx} className="p-2 rounded-lg border border-rose-150 bg-rose-50/30 text-rose-950 font-medium leading-relaxed">
                                <div className="flex justify-between font-bold text-rose-800">
                                  <span>✗ {sig.name}</span>
                                  <span>-{sig.weight}</span>
                                </div>
                                <p className="text-[9px] text-rose-900 font-normal mt-0.5 font-sans">{sig.description}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">
                    Select an account from the list to view correlation metrics.
                  </div>
                )}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Right Column: Developer Fingerprint & Bio Similarity */}
        <div className="space-y-4">
          
          {/* 3. Developer Fingerprint Card */}
          {devFingerprint ? (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-display text-sm font-bold flex items-center justify-between text-indigo-950">
                  <span className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-600" />
                    DEVELOPER FINGERPRINT
                  </span>
                  <Badge className="bg-indigo-900 text-white font-mono text-[9px] py-0">{devFingerprint.similarity}% SIMILARITY</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="font-bold text-slate-500 uppercase text-[8px]">GITHUB (Target)</div>
                    <div className="font-bold text-slate-800">{devFingerprint.fingerprintA.primaryLanguages.slice(0, 2).join(", ") || "Python"}</div>
                    <div className="text-[9px] text-slate-600 font-semibold">{devFingerprint.fingerprintA.developerStack.join(", ")}</div>
                  </div>
                  <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="font-bold text-slate-500 uppercase text-[8px]">GITLAB (Discovered)</div>
                    <div className="font-bold text-slate-800">{devFingerprint.fingerprintB.primaryLanguages.slice(0, 2).join(", ") || "Python"}</div>
                    <div className="text-[9px] text-slate-600 font-semibold">{devFingerprint.fingerprintB.developerStack.join(", ")}</div>
                  </div>
                </div>

                {devFingerprint.matchingTech.length > 0 && (
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Overlapping Stack</div>
                    <div className="flex flex-wrap gap-1">
                      {devFingerprint.matchingTech.map(tech => (
                        <Badge key={tech} className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[8px] border font-mono">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {devFingerprint.matchingRepos.length > 0 && (
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Matching Repositories</div>
                    <ul className="space-y-1 text-[9px]">
                      {devFingerprint.matchingRepos.map((repo, idx) => (
                        <li key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                          <span className="font-semibold text-slate-700 truncate max-w-[70%]">{repo.name}</span>
                          <span className="font-bold text-emerald-650">{repo.similarity}% match</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm bg-slate-50/50">
              <CardContent className="p-6 text-center text-slate-400 italic">
                <Terminal className="h-6 w-6 text-slate-350 mx-auto mb-2" />
                Developer fingerprinting requires both GitHub and GitLab profiles.
              </CardContent>
            </Card>
          )}

          {/* 4. Bio Similarity Card */}
          {bioSimilarity ? (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="font-display text-sm font-bold flex items-center justify-between text-indigo-950">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-indigo-600" />
                    BIO SEMANTIC SIMILARITY
                  </span>
                  <Badge className="bg-indigo-900 text-white font-mono text-[9px] py-0">{bioSimilarity.score}% MATCH</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-[10px] text-slate-655 font-semibold font-sans leading-relaxed">
                  {bioSimilarity.reasoningSummary}
                </p>
                
                <Separator className="bg-slate-100" />

                <div className="space-y-2 text-[9px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase">Same Profession</span>
                    <Badge variant="outline" className={bioSimilarity.professionMatch ? "border-emerald-250 text-emerald-700 bg-emerald-50 font-bold" : "border-slate-200 text-slate-400 bg-slate-50"}>
                      {bioSimilarity.professionMatch ? "Matched" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase">Same Technologies</span>
                    <Badge variant="outline" className={bioSimilarity.technologiesMatch ? "border-emerald-250 text-emerald-700 bg-emerald-50 font-bold" : "border-slate-200 text-slate-400 bg-slate-50"}>
                      {bioSimilarity.technologiesMatch ? "Matched" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase">Same Organization</span>
                    <Badge variant="outline" className={bioSimilarity.organizationMatch ? "border-emerald-250 text-emerald-700 bg-emerald-50 font-bold" : "border-slate-200 text-slate-400 bg-slate-50"}>
                      {bioSimilarity.organizationMatch ? "Matched" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase">Same Research Areas</span>
                    <Badge variant="outline" className={bioSimilarity.researchMatch ? "border-emerald-250 text-emerald-700 bg-emerald-50 font-bold" : "border-slate-200 text-slate-400 bg-slate-50"}>
                      {bioSimilarity.researchMatch ? "Matched" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm bg-slate-50/50">
              <CardContent className="p-6 text-center text-slate-400 italic">
                <Brain className="h-6 w-6 text-slate-350 mx-auto mb-2" />
                Bio semantic comparison requires at least one custom bio on a discovered profile.
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* SECTION 3: Evidence Reliability Table */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-indigo-950">
            <Layers className="h-4 w-4 text-indigo-650" />
            EVIDENCE RELIABILITY INDEX
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-500">Chain-of-custody corroboration and verification status logs</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Source</th>
                  <th className="p-3">Evidence Type</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Reliability</th>
                  <th className="p-3">Freshness</th>
                  <th className="p-3">Verified</th>
                  <th className="p-3 max-w-[30%]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {reliability.map((item) => {
                  const confColor = item.confidence === "High" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : item.confidence === "Medium" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-rose-700 bg-rose-50 border-rose-200";
                  const relColor = item.reliability === "High" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : item.reliability === "Medium" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-rose-700 bg-rose-50 border-rose-200";
                  const verColor = item.verificationStatus === "Yes" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : item.verificationStatus === "Partial" ? "text-amber-700 bg-amber-50 border-amber-200 animate-pulse" : "text-rose-700 bg-rose-50 border-rose-200";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 text-slate-800 font-medium">
                      <td className="p-3 font-bold text-indigo-950 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.source}
                      </td>
                      <td className="p-3">{item.evidenceType}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={`${confColor} font-mono text-[9px] uppercase font-bold border py-0 px-1.5`}>
                          {item.confidence}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`${relColor} font-mono text-[9px] uppercase font-bold border py-0 px-1.5`}>
                          {item.reliability}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.freshness}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`${verColor} font-mono text-[9px] uppercase font-bold border py-0 px-1.5`}>
                          {item.verificationStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-655 font-sans leading-relaxed max-w-[30%]">
                        {item.details}
                      </td>
                    </tr>
                  );
                })}
                {reliability.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      No active evidence sources registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
