"use client";

import React from "react";
import { Link2, Image as ImageIcon, ShieldCheck, Users, ExternalLink, Fingerprint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuspectProfile } from "@/lib/types";

function scoreTone(score: number) {
  if (score >= 70) return { label: "Same individual", ring: "border-emerald-300", bar: "bg-emerald-500", text: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 45) return { label: "Likely same", ring: "border-blue-300", bar: "bg-blue-500", text: "text-blue-700", chip: "bg-blue-50 text-blue-700 border-blue-200" };
  if (score >= 25) return { label: "Possible", ring: "border-amber-300", bar: "bg-amber-500", text: "text-amber-700", chip: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Weak / namesake", ring: "border-slate-300", bar: "bg-slate-400", text: "text-slate-600", chip: "bg-slate-50 text-slate-600 border-slate-200" };
}

export default function IdentityCorrelationCard({ p }: { p: SuspectProfile }) {
  const corr = p.identityCorrelation;
  const keybase = p.keybase;

  if (!corr && !keybase?.found) return null;

  const correlations = (corr?.correlations || [])
    .slice()
    .sort((a, b) => b.linkScore - a.linkScore);

  const strong = correlations.filter(c => c.linkScore >= 45).length;

  return (
    <Card className="border-l-4 border-l-violet-500 border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-violet-900">
          <Fingerprint className="h-4 w-4 text-violet-600" />
          IDENTITY CORRELATION — Same Individual Analysis
        </CardTitle>
        <CardDescription className="text-[11px] text-slate-600">
          {corr?.summary || "Cross-account linkage analysis"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 font-mono text-xs">

        {/* Headline metric */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-violet-50 border-violet-200 text-violet-800 font-bold gap-1.5">
            <Users className="w-3 h-3" /> {strong} strongly linked
          </Badge>
          {corr && corr.photoClusters.length > 0 && (
            <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700 font-bold gap-1.5">
              <ImageIcon className="w-3 h-3" /> {corr.photoClusters.length} photo cluster{corr.photoClusters.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {corr && corr.declaredLinks.length > 0 && (
            <Badge variant="outline" className="bg-sky-50 border-sky-200 text-sky-700 font-bold gap-1.5">
              <Link2 className="w-3 h-3" /> {corr.declaredLinks.length} declared cross-link{corr.declaredLinks.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {keybase?.found && (
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Keybase verified
            </Badge>
          )}
        </div>

        {/* Keybase cryptographic proof block */}
        {keybase?.found && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Cryptographically verified accounts (Keybase{keybase.keybaseUsername ? ` · @${keybase.keybaseUsername}` : ""})
            </div>
            <div className="flex flex-wrap gap-2">
              {keybase.linkedAccounts.map((a, i) => (
                <a key={i} href={a.profileUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <span className="font-bold uppercase text-[10px]">{a.platform}</span>
                  <span>@{a.username}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
              {keybase.websites.map((w, i) => (
                <a key={`w${i}`} href={w} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <span>{w.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Declared cross-links from bios */}
        {corr && corr.declaredLinks.length > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sky-800">
              <Link2 className="w-3.5 h-3.5" /> Self-declared cross-links (from bios)
            </div>
            <div className="space-y-1">
              {corr.declaredLinks.slice(0, 8).map((d, i) => (
                <div key={i} className="text-[11px] text-slate-700">
                  <span className="uppercase font-bold text-sky-700">{d.fromPlatform}</span>
                  <span className="text-slate-400"> bio → </span>
                  <span className="font-semibold">
                    {d.link.platform ? `${d.link.platform} ` : ""}
                    {d.link.handle ? `@${d.link.handle}` : d.link.url}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-account linkage scores with evidence */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Per-account linkage confidence
          </div>
          {correlations.map((c, i) => {
            const tone = scoreTone(c.linkScore);
            return (
              <div key={i} className={`rounded-lg border ${tone.ring} bg-white p-3 space-y-2`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="uppercase font-bold text-slate-700 text-[11px]">{c.platform}</span>
                    <span className="text-slate-500 truncate">@{c.username}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`${tone.chip} font-bold text-[10px]`}>{tone.label}</Badge>
                    <span className={`font-black ${tone.text}`}>{c.linkScore}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${tone.bar}`} style={{ width: `${c.linkScore}%` }} />
                </div>
                {c.evidence.length > 0 ? (
                  <ul className="space-y-0.5">
                    {c.evidence.map((e, j) => (
                      <li key={j} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                        <span className="text-violet-500 font-bold">+{e.weight}</span>
                        <span className="font-semibold text-slate-700">{e.signal}:</span>
                        <span className="text-slate-500">{e.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No corroborating signals — treat as unverified / possible namesake.</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
          Linkage scores fuse independent signals (self-declared bio links, matching profile photos, name/handle similarity, and Keybase cryptographic proofs). Higher scores indicate stronger evidence the accounts belong to the same individual. Always corroborate before acting.
        </p>
      </CardContent>
    </Card>
  );
}
