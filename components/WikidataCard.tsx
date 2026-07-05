"use client";

import React, { useEffect, useState } from "react";
import { SuspectProfile } from "../lib/types";
import { Globe, Search, ArrowUpRight, HelpCircle, ShieldCheck, Loader2 } from "lucide-react";

interface WikidataCardProps {
  suspect: SuspectProfile;
}

interface WikidataEntity {
  id: string;
  label: string;
  description?: string;
}

export default function WikidataCard({ suspect }: WikidataCardProps) {
  // Investigator dork queries (genuinely useful, built from the real subject)
  const dorks = [
    { platform: "GitHub", query: `site:github.com "${suspect.realName}"` },
    { platform: "LinkedIn", query: `site:linkedin.com/in "${suspect.realName}"` },
    { platform: "Twitter / X", query: `site:x.com "${suspect.username.replace(/^@/, "")}"` }
  ];

  // REAL Wikidata entity search (wbsearchentities, CORS-enabled with origin=*)
  const [wikidataMatches, setWikidataMatches] = useState<WikidataEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name = (suspect.realName || "").trim();
    if (!name || name.length < 3 || /@/.test(name)) {
      setWikidataMatches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url =
      `https://www.wikidata.org/w/api.php?action=wbsearchentities` +
      `&search=${encodeURIComponent(name)}&language=en&uselang=en&format=json&origin=*&limit=5&type=item`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        const results: WikidataEntity[] = (data?.search || []).map((s: any) => ({
          id: s.id,
          label: s.label || s.match?.text || name,
          description: s.description,
        }));
        setWikidataMatches(results);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Wikidata lookup failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [suspect.realName, suspect.username]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-ink">
      
      {/* Search Dorks List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
            Automated Investigator Dork Queries
          </h4>
          <span className="text-[10px] text-slate-600 font-semibold">Google Dorks Index</span>
        </div>

        <div className="space-y-3">
          {dorks.map((dork, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <div>
                <span className="text-[10px] text-blue-600 block font-bold uppercase">{dork.platform}</span>
                <span className="text-xs text-ink font-semibold block mt-1 break-all select-all font-mono">
                  {dork.query}
                </span>
              </div>
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(dork.query)}`}
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-white border border-slate-250 hover:border-slate-350 text-slate-600 hover:text-ink rounded-lg flex-shrink-0 shadow-sm transition-all"
              >
                <Search className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Wikidata entity widget */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Wikidata Entity Matches
            </h4>
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="flex items-center gap-2 text-[10px] text-slate-500 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Querying Wikidata knowledge base…
              </div>
            )}

            {!loading && error && (
              <p className="text-[10px] text-amber-600 py-2">Wikidata lookup unavailable ({error}).</p>
            )}

            {!loading && !error && wikidataMatches.length === 0 && (
              <p className="text-[10px] text-slate-500 py-2 leading-relaxed">
                No Wikidata entity matches for <span className="font-semibold text-ink">{suspect.realName}</span>.
                This is expected for private individuals — Wikidata only indexes notable public figures.
              </p>
            )}

            {!loading && wikidataMatches.map((entity) => (
              <div key={entity.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-ink text-xs block">{entity.label}</span>
                  <a
                    href={`https://www.wikidata.org/wiki/${entity.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-[9px] flex items-center gap-0.5 font-bold shrink-0"
                  >
                    {entity.id} <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-700 leading-relaxed font-medium">
                  {entity.description || "No description available on Wikidata."}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Explainability box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-ink font-bold">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Why Wikidata?</span>
          </div>
          <p className="text-[10px] text-slate-700 leading-relaxed font-medium">
            Wikidata registry lookup allows investigators to verify public registry designations, real identities, birth locations, and organization board seats from open-source linked knowledge bases.
          </p>
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-250 text-emerald-800 px-2 py-1 rounded w-max text-[9px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Admissible Public OSINT
          </div>
        </div>

      </div>

    </div>
  );
}
