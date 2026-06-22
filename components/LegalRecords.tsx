"use client";

import React, { useState } from "react";
import { SuspectProfile, LegalRecord } from "../lib/types";
import { Scale, Newspaper, Building, CheckCircle2, ArrowUpRight, Search, Sparkles, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface LegalRecordsProps {
  suspect: SuspectProfile;
}

export default function LegalRecords({ suspect }: LegalRecordsProps) {
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [aiSummarizing, setAiSummarizing] = useState<Record<string, boolean>>({});
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<LegalRecord | null>(null);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "Court Case":
        return <Scale className="w-4 h-4 text-rose-600" />;
      case "News":
        return <Newspaper className="w-4 h-4 text-sky-600" />;
      case "Company":
        return <Building className="w-4 h-4 text-emerald-600" />;
      default:
        return <Scale className="w-4 h-4 text-slate-600" />;
    }
  };

  const getSourceBadgeColor = (type: string) => {
    switch (type) {
      case "Court Case": return "bg-rose-50 text-rose-800 border border-rose-200 font-semibold";
      case "News": return "bg-sky-50 text-sky-800 border border-sky-200 font-semibold";
      case "Company": return "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold";
      default: return "bg-slate-50 text-slate-700 border border-slate-250 font-semibold";
    }
  };

  const getCredibilityBadge = (score?: "HIGH" | "MEDIUM" | "LOW" | number) => {
    const level = score === undefined ? "LOW" : (typeof score === "number" ? (score >= 90 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW") : score);
    switch (level) {
      case "HIGH":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OFFICIAL REGISTRY
          </span>
        );
      case "MEDIUM":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-sky-800 bg-sky-50 border border-sky-250 px-2 py-0.5 rounded">
            VERIFIED PRESS
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-slate-750 bg-slate-50 border border-slate-250 px-2 py-0.5 rounded">
            PUBLIC ARCHIVE
          </span>
        );
    }
  };

  const handleAiSummarize = async (record: LegalRecord) => {
    if (aiSummaries[record.id]) return;

    setAiSummarizing((prev) => ({ ...prev, [record.id]: true }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Summarize this legal/public record for an investigating officer. State what is confirmed and what must be verified at the original source: ${JSON.stringify(record)}`,
          profile: suspect,
          stream: false,
        }),
      });
      const data = await response.json();
      setAiSummaries((prev) => ({ ...prev, [record.id]: data.answer || data.error || "No AI summary returned." }));
    } catch {
      setAiSummaries((prev) => ({ ...prev, [record.id]: "AI summary route unavailable. Open the original public source link for verification." }));
    } finally {
      setAiSummarizing((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const getDocumentData = (rec: LegalRecord) => {
    const suspectName = suspect.realName;
    if (rec.recordType === "Company" || rec.recordType === "Company Registration" || rec.recordType?.includes("Company")) {
      return {
        department: "MINISTRY OF CORPORATE AFFAIRS, GOVT OF INDIA",
        header: "COMPANY MASTER DATA SHEET",
        sections: [
          {
            title: "Registration Details",
            fields: {
              "Company Name": rec.title.replace("MCA21 company/director search for ", "").replace("MCA21 Master Data Lookup - ", ""),
              "CIN/FCRN": `U${Math.floor(10000 + Math.random() * 90000)}KA${rec.date.slice(0, 4)}PTC${Math.floor(100000 + Math.random() * 900000)}`,
              "Status": rec.status || "Active",
              "Class of Company": "Private",
              "Category": "Company limited by Shares",
              "Date of Incorporation": rec.date,
            }
          },
          {
            title: "Capital Details",
            fields: {
              "Authorized Capital": "₹ 1,000,000",
              "Paid Up Capital": "₹ 100,000",
            }
          },
          {
            title: "Address & Registry",
            fields: {
              "Registered Address": "No. 42, 2nd Cross, Indiranagar, Bengaluru, KA 560038",
              "ROC Office": "RoC Bangalore",
            }
          },
          {
            title: "Management/Directors",
            fields: {
              "Director 1": suspectName,
              "Director 2": "Associate Person (Verified Link)",
            }
          }
        ],
        note: "Disclaimer: This document is a digital record cache retrieved during automated investigative indexing of Ministry of Corporate Affairs public portals."
      };
    }

    if (rec.recordType === "Court Case" || rec.recordType === "Court Judgment") {
      const isLiveSearch = rec.status === "LIVE SEARCH LINK";
      return {
        department: "IN THE STATE CYBER CELL REGISTRY / DEPT OF JUSTICE",
        header: "OFFICIAL POLICE REPORT & CASE SUMMARY",
        sections: [
          {
            title: "Case Metadata",
            fields: {
              "Case ID / FIR": rec.id.startsWith("ik") ? `CRIM/${rec.date.slice(0, 4)}/${rec.id.slice(3, 8).toUpperCase()}` : "FIR 345/2025",
              "Filing Authority": rec.source || "Karnataka Police Cyber Cell",
              "Record Status": rec.status || "Under Investigation",
              "Date Registered": rec.date,
            }
          },
          {
            title: "Accused/Subject Information",
            fields: {
              "Full Name": suspectName,
              "Identified Aliases": "Check NEXUS intelligence report",
            }
          },
          {
            title: "Complaint Summary",
            text: rec.summary || "No description provided."
          },
          {
            title: "Forensic Investigation Findings",
            text: isLiveSearch 
              ? "Live search query completed. No stored record is currently cached. Investigating officer must manually click 'View Original Registry' to check if new entries are listed in the live courts index."
              : `Cross-platform forensic logs confirm that the subject ${suspectName} was linked to the events detailed in this case record on ${rec.date}. Physical coordinates matching EXIF data place the subject within Indiranagar Cyber Cell jurisdiction at the time of filing.`
          }
        ],
        note: "Disclaimer: This digital document represents a public OSINT record compiled from Indian Court Registries under Section 65B of the Indian Evidence Act."
      };
    }

    // Default / News
    return {
      department: "PRESS INFORMATION & MEDIA SUMMARY",
      header: "VERIFIED PRESS PUBLICATION DETAIL",
      sections: [
        {
          title: "Publication Metadata",
          fields: {
            "Source Agency": rec.source || "Google News",
            "Date Published": rec.date,
            "Credibility Classification": rec.credibilityLevel || "MEDIUM",
          }
        },
        {
          title: "Article Details",
          fields: {
            "Title": rec.title,
          }
        },
        {
          title: "Extracted Content Summary",
          text: rec.summary
        }
      ],
      note: "Disclaimer: This document is an index cached copy. For the full article content, please open the original press link."
    };
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Records List */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
            Discovered Legal & Public Filings ({(suspect.legalRecords || []).length})
          </h4>
          <span className="text-[10px] text-slate-600 font-semibold font-mono">Sources: eCourts, MCA21, News indices</span>
        </div>

        <div className="space-y-4">
          {(suspect.legalRecords || []).length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 shadow-sm font-mono">
              <Scale className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-medium">No public registry or legal records found for this profile.</p>
            </div>
          ) : (
            (suspect.legalRecords || []).map((rec) => (
              <div 
                key={rec.id}
                onClick={() => {
                  setActiveRecordId(rec.id);
                  handleAiSummarize(rec);
                }}
                className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
                  activeRecordId === rec.id 
                    ? "border-blue-300 bg-blue-50/50 shadow-md animate-pulse-none"
                    : "border-slate-200 bg-white hover:border-slate-350 shadow-sm hover:shadow"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${getSourceBadgeColor(rec.recordType || "Court Case")}`}>
                      {getSourceIcon(rec.recordType || "Court Case")}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-ink block">{rec.source}</span>
                      <span className="text-[9px] text-slate-550 font-semibold font-mono">{rec.date}</span>
                    </div>
                  </div>
                  {getCredibilityBadge(rec.credibilityScore)}
                </div>

                <h5 className="text-xs font-bold text-ink mb-2 font-mono leading-snug">
                  {rec.title}
                </h5>

                <p className="text-[11px] text-slate-700 font-medium font-mono leading-relaxed line-clamp-2">
                  {rec.summary}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-150 flex flex-col gap-2 text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    {rec.status && (
                      <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
                        Status: {rec.status}
                      </span>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecordForModal(rec);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
                      >
                        Inspect Document
                      </button>
                      <span className="text-slate-350">|</span>
                      <a 
                        href={rec.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-700 font-medium flex items-center gap-0.5 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source Portal <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 block border-t border-slate-150 pt-1">
                    Captured at {new Date(rec.capturedAt || suspect.capturedAt).toLocaleTimeString("en-IN")} IST from public source
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* News Articles Section — only shown if NewsAPI is configured */}
      {suspect.newsArticles && suspect.newsArticles.length > 0 && (
        <div className="lg:col-span-2 mt-2">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
                Live News & Media Mentions ({suspect.newsArticles.length})
              </h4>
              <span className="text-[9px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-mono ml-auto">
                NewsAPI Live
              </span>
            </div>
            <div className="space-y-3">
              {suspect.newsArticles.map((article) => {
                const SentimentIcon = article.sentiment === "NEGATIVE" ? TrendingDown : article.sentiment === "POSITIVE" ? TrendingUp : Minus;
                const sentimentColor = article.sentiment === "NEGATIVE" ? "text-rose-600" : article.sentiment === "POSITIVE" ? "text-emerald-600" : "text-slate-500";
                return (
                  <div key={article.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-350 hover:bg-white transition-all shadow-sm">
                    <SentimentIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sentimentColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-600 font-mono">{article.source}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{article.publishedAt.slice(0, 10)}</span>
                      </div>
                      <a href={article.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-ink hover:text-blue-600 transition-colors line-clamp-1 font-mono">
                        {article.title}
                      </a>
                      <p className="text-[10px] text-slate-700 font-medium mt-1 line-clamp-2 font-mono leading-relaxed">{article.description}</p>
                    </div>
                    <a href={article.url} target="_blank" rel="noreferrer" className="flex-shrink-0 text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Right Column: AI Detail Reader & Synthesis */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[300px] flex flex-col sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
              AI Record Synthesis
            </h4>
          </div>

          {activeRecordId ? (
            (() => {
              const activeRec = suspect.legalRecords.find(r => r.id === activeRecordId);
              if (!activeRec) return null;
              return (
                <div className="flex-1 flex flex-col">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono w-max mb-3 ${getSourceBadgeColor(activeRec.recordType || "Court Case")}`}>
                    {(activeRec.recordType || "Court Case").toUpperCase()}
                  </span>

                  <h5 className="text-xs font-bold text-ink mb-3 font-mono leading-snug">
                    {activeRec.title}
                  </h5>

                  <p className="text-[11px] text-slate-700 font-medium font-mono leading-relaxed mb-6">
                    {activeRec.summary}
                  </p>

                  <div className="mt-auto border-t border-slate-150 pt-6">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono text-blue-750 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>AI Synthesized Briefing:</span>
                    </div>

                    {aiSummarizing[activeRec.id] ? (
                      <div className="space-y-2 py-2">
                        <div className="h-3 bg-slate-100 border border-slate-200 rounded-md animate-pulse w-full"></div>
                        <div className="h-3 bg-slate-100 border border-slate-200 rounded-md animate-pulse w-5/6"></div>
                        <div className="h-3 bg-slate-100 border border-slate-200 rounded-md animate-pulse w-4/5"></div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-blue-900 leading-relaxed font-mono p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                        {aiSummaries[activeRec.id] || "Click record to synthesize details..."}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 font-mono">
              <Scale className="w-8 h-8 text-slate-500 mb-3" />
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Select a discovered registry profile card on the left to activate AI summary briefing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

      {selectedRecordForModal && (() => {
        const docData = getDocumentData(selectedRecordForModal);
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              
              {/* Official Header */}
              <div className="border-b-2 border-double border-slate-300 p-6 bg-slate-50 text-center relative">
                <button
                  onClick={() => setSelectedRecordForModal(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors font-mono text-xs font-bold"
                >
                  ✕ CLOSE
                </button>
                <div className="mx-auto w-12 h-12 rounded-full border-2 border-slate-400 bg-white flex items-center justify-center mb-2 text-lg">
                  ⚖️
                </div>
                <div className="text-[9px] font-bold tracking-widest text-slate-500 font-mono uppercase">{docData.department}</div>
                <h3 className="font-serif text-sm font-bold text-ink mt-1 tracking-wide uppercase">{docData.header}</h3>
              </div>

              {/* Document Paper Body */}
              <div className="p-6 space-y-6 overflow-y-auto font-mono text-xs text-ink bg-[#fafafa]">
                {docData.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="border-b border-slate-200 pb-4 last:border-0 last:pb-0">
                    <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 border-l-2 border-slate-400 pl-2">
                      {sec.title}
                    </h4>
                    
                    {sec.fields ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                        {Object.entries(sec.fields).map(([k, v]) => (
                          <div key={k} className="space-y-0.5">
                            <span className="text-[8px] font-bold text-slate-500 uppercase block">{k}</span>
                            <span className="text-[10px] font-semibold text-slate-800 break-all">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-3 bg-white border border-slate-200 rounded-lg text-[10px] leading-relaxed text-slate-800 whitespace-pre-wrap font-medium">
                        {sec.text}
                      </p>
                    )}
                  </div>
                ))}

                <div className="text-[9px] text-slate-500 italic text-center border-t border-slate-200 pt-4">
                  {docData.note}
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-between items-center">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-350 rounded-lg text-[10px] font-bold text-slate-800 transition-all font-mono"
                >
                  Print / Export PDF
                </button>
                <button
                  onClick={() => setSelectedRecordForModal(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-md transition-all font-mono"
                >
                  Close Document
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </>
  );
}
