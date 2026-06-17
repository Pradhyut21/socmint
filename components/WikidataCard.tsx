"use client";

import React from "react";
import { SuspectProfile } from "../lib/types";
import { Globe, Search, ArrowUpRight, HelpCircle, ShieldCheck } from "lucide-react";

interface WikidataCardProps {
  suspect: SuspectProfile;
}

export default function WikidataCard({ suspect }: WikidataCardProps) {
  // Generate mock Wikidata lookups based on realName
  const dorks = [
    { platform: "GitHub", query: `site:github.com "${suspect.realName}" "bengaluru"` },
    { platform: "LinkedIn", query: `site:linkedin.com/in "${suspect.realName}" "fintech" OR "crypto"` },
    { platform: "Twitter / X", query: `site:x.com "${suspect.username.replace(/^@/, "")}"` }
  ];

  const wikidataMatches = [
    {
      id: "Q11827982",
      label: suspect.realName,
      description: "Indian blockchain software developer & cryptology researcher",
      nativeName: suspect.realName,
      occupations: ["software developer", "cryptographer"],
      birthPlace: "Bengaluru, Karnataka, India"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
      
      {/* Search Dorks List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
            Automated Investigator Dork Queries
          </h4>
          <span className="text-[10px] text-slate-500">Google Dorks Index</span>
        </div>

        <div className="space-y-3">
          {dorks.map((dork, idx) => (
            <div key={idx} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-blue-400 block font-bold uppercase">{dork.platform}</span>
                <span className="text-xs text-white block mt-1 break-all select-all font-mono">
                  {dork.query}
                </span>
              </div>
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(dork.query)}`}
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white rounded-lg flex-shrink-0"
              >
                <Search className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Wikidata entity widget */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              Wikidata Entity Matches
            </h4>
          </div>

          <div className="space-y-4">
            {wikidataMatches.map((entity) => (
              <div key={entity.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-white text-xs block">{entity.label}</span>
                  <a 
                    href={`https://www.wikidata.org/wiki/${entity.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline text-[9px] flex items-center gap-0.5"
                  >
                    {entity.id} <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {entity.description}
                </p>

                <div className="pt-2 border-t border-slate-900 space-y-2 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Birth Place</span>
                    <span className="text-slate-300">{entity.birthPlace}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Occupations</span>
                    <span className="text-slate-300">{entity.occupations.join(", ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Explainability box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-white">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Why Wikidata?</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Wikidata registry lookup allows investigators to verify public registry designations, real identities, birth locations, and organization board seats from open-source linked knowledge bases.
          </p>
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded w-max text-[9px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admissible Public OSINT
          </div>
        </div>

      </div>

    </div>
  );
}
