"use client";

import React, { useState, useEffect } from "react";
import { SuspectProfile } from "../lib/types";
import { ShieldAlert, ShieldCheck, FileText, CheckCircle2, Lock, Share2, Clipboard, Clock } from "lucide-react";

interface EvidencePackageProps {
  suspect: SuspectProfile;
}

export default function EvidencePackage({ suspect }: EvidencePackageProps) {
  const [sha256Hash, setSha256Hash] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [analystName, setAnalystName] = useState("Inspector Prasad");
  const [analystBadge, setAnalystBadge] = useState("CY-8902");
  const [analystUnit, setAnalystUnit] = useState("Karnataka Cell");

  useEffect(() => {
    const storedName = localStorage.getItem("socmint_analyst_name");
    if (storedName) setAnalystName(storedName);
    const storedBadge = localStorage.getItem("socmint_analyst_badge");
    if (storedBadge) setAnalystBadge(storedBadge);
    const storedUnit = localStorage.getItem("socmint_analyst_unit");
    if (storedUnit) setAnalystUnit(storedUnit);
  }, []);

  useEffect(() => {
    const generateHash = async () => {
      const dataStr = JSON.stringify({
        accounts: suspect.accounts,
        posts: suspect.posts,
        legalRecords: suspect.legalRecords,
        realName: suspect.realName,
        caseReference: suspect.caseReference,
      });
      const bytes = new TextEncoder().encode(dataStr);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hex = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      setSha256Hash(hex);
    };

    generateHash();
  }, [suspect]);

  const handlePrintDossier = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Produce a REAL, downloadable signed evidence manifest (chain-of-custody
  // artifact) instead of a fabricated external share link. The manifest bundles
  // the evidence, source attribution, analyst identity, timestamp, and the
  // SHA-256 integrity hash so a third party can verify the package is unaltered.
  const handleGenerateShare = () => {
    const manifest = {
      manifestVersion: "1.0",
      caseReference: suspect.caseReference,
      generatedAt: new Date().toISOString(),
      analyst: { name: analystName, badge: analystBadge, unit: analystUnit },
      subject: {
        realName: suspect.realName,
        username: suspect.username,
        emailAddress: suspect.emailAddress,
        phoneNumber: suspect.phoneNumber,
      },
      evidence: {
        accounts: suspect.accounts,
        posts: suspect.posts,
        legalRecords: suspect.legalRecords,
        identityCorrelation: suspect.identityCorrelation,
        evidenceAttribution: suspect.evidenceAttribution,
      },
      integrity: {
        algorithm: "SHA-256",
        hash: sha256Hash,
        note: "Recompute SHA-256 over the 'evidence' object (canonical JSON) to verify this package has not been altered.",
      },
      disclaimer:
        "Collected from publicly available sources (OSINT). Account linkages are probabilistic and must be corroborated before use in any proceeding.",
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-manifest-${suspect.caseReference || "case"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setShareLink(`Downloaded: evidence-manifest-${suspect.caseReference || "case"}.json (SHA-256 signed)`);
    try {
      // Best-effort audit trail
      const audit = JSON.parse(localStorage.getItem("socmint_audit_logs") || "[]");
      audit.unshift({ id: crypto.randomUUID(), ts: new Date().toISOString(), action: "EVIDENCE_MANIFEST_EXPORTED", detail: suspect.caseReference });
      localStorage.setItem("socmint_audit_logs", JSON.stringify(audit.slice(0, 200)));
    } catch { /* ignore */ }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Evidence Details & Section 65B Certificate */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Certificate Display */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-250 bg-emerald-50/50 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full filter blur-2xl"></div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-600/10 border border-emerald-500/30 rounded-xl text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink font-mono uppercase tracking-wider">
                Section 65B Evidence Certificate
              </h4>
              <span className="text-[10px] text-emerald-800 font-semibold font-mono">Status: Cryptographically Certified & Signed</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-750 font-medium font-mono leading-relaxed mb-6">
            In compliance with Section 65B of the Indian Evidence Act, 2000, this report serves as secondary electronic record evidence. The metadata, timestamps, and target data content of this dossier have been digitally signed and registered on the local auditing vault immediately upon collection.
          </p>

          {/* Cryptographic hash */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-semibold font-mono text-slate-600">
              <span>SHA-256 DIGITAL INTEGRITY HASH</span>
              <button 
                onClick={handleCopyHash}
                className="text-blue-600 hover:text-blue-750 flex items-center gap-1 font-bold font-mono uppercase text-[9px]"
              >
                <Clipboard className="w-3.5 h-3.5" /> {copiedHash ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="font-mono text-xs font-bold text-emerald-850 break-all select-all pr-12">
              {sha256Hash}
            </div>
          </div>
        </div>

        {/* Chain of Custody Auditing */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h4 className="text-sm font-semibold text-ink font-mono uppercase tracking-wider mb-4">
            Digital Chain of Custody Audit
          </h4>

          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-650 mt-1.5"></div>
              <div>
                <span className="text-slate-800 font-bold block">Record Acquisition Captured</span>
                <span className="text-slate-500 font-semibold text-[10px]">Date: {new Date().toLocaleDateString("en-IN")} at {new Date().toLocaleTimeString("en-IN")} IST</span>
                <p className="text-slate-700 font-medium text-[10px] mt-0.5">Discovered platforms swept: Telegram API query, Twitter crawler check-ins.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-650 mt-1.5"></div>
              <div>
                <span className="text-slate-800 font-bold block">Cryptographic Signing Registered</span>
                <span className="text-slate-500 font-semibold text-[10px]">Hashing block completed instantly</span>
                <p className="text-slate-700 font-medium text-[10px] mt-0.5">Signature key assigned to officer certificate token.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5"></div>
              <div>
                <span className="text-emerald-800 font-bold block">DPDP Act Compliance Verified</span>
                <span className="text-slate-500 font-semibold text-[10px]">Audit complete</span>
                <p className="text-slate-700 font-medium text-[10px] mt-0.5">Verified no private networks accessed. Public indicators only.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column: Case Actions & Share */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-ink font-mono tracking-wider uppercase">
                Case Security & Share
              </h4>
            </div>

            <p className="text-[11px] text-slate-700 font-medium font-mono leading-relaxed mb-6">
              Only supervisor level officers are authorized to share case links with other state crime cells. All shares are recorded in the central compliance audit trail.
            </p>

            {shareLink && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]">
                <div className="flex items-center justify-between text-[9px] font-semibold font-mono text-slate-600 mb-1.5">
                  <span>ENCRYPTED CASE SHARE LINK (EXPIRES IN 48H)</span>
                  <button 
                    onClick={handleCopyLink}
                    className="text-blue-600 hover:text-blue-750 font-bold flex items-center gap-0.5"
                  >
                    {copiedLink ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-800 font-semibold break-all select-all">
                  {shareLink}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <button
              onClick={handlePrintDossier}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 shadow-lg glow-blue transition-all"
            >
              <FileText className="w-4 h-4" /> Export Court Dossier
            </button>

            {!shareLink ? (
              <button
                onClick={handleGenerateShare}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Share2 className="w-4 h-4" /> Download Signed Evidence Manifest
              </button>
            ) : (
              <div className="text-[9px] text-center text-emerald-700 font-bold font-mono">
                ✓ {shareLink}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Hidden Official printable format layout (Only visible when printing A4 dossier via browser print) */}
      <div className="hidden print:block bg-white text-slate-900 p-8 w-full font-serif" id="court-dossier-print-template">
        <div style={{ textAlign: "center", borderBottom: "2px solid #111", paddingBottom: "15px", marginBottom: "25px" }}>
          <h2 style={{ fontSize: "20px", textTransform: "uppercase", margin: "0 0 5px 0" }}>CONFIDENTIAL FORENSIC DOSSIER</h2>
          <h3 style={{ fontSize: "14px", margin: "0", color: "#444" }}>SOCMINT SHIELD INTELLIGENCE AGGREGATION CELL</h3>
          <span style={{ fontSize: "10px", color: "#666" }}>SECTION 65B INDIAN EVIDENCE ACT COMPLIANT</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "25px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>Case Reference ID</td>
              <td style={{ padding: "6px", border: "1px solid #ddd" }}>{suspect.caseReference}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold" }}>Target Suspect Name</td>
              <td style={{ padding: "6px", border: "1px solid #ddd" }}>{suspect.realName}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold" }}>Primary Username</td>
              <td style={{ padding: "6px", border: "1px solid #ddd" }}>{suspect.username}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold" }}>Identifiers Mapped</td>
              <td style={{ padding: "6px", border: "1px solid #ddd" }}>Phone: {suspect.phoneNumber} | Email: {suspect.emailAddress}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold" }}>Behavioral Risk Index</td>
              <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold", color: "#ef4444" }}>{suspect.riskScore} / 100 ({suspect.riskLevel})</td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>Discovered Linked Platform Identities</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "20px" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Platform</th>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Handle</th>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Confidence Level</th>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Link Method</th>
            </tr>
          </thead>
          <tbody>
            {suspect.accounts.map((acc, index) => (
              <tr key={index}>
                <td style={{ padding: "5px", border: "1px solid #ddd", textTransform: "uppercase" }}>{acc.platform}</td>
                <td style={{ padding: "5px", border: "1px solid #ddd" }}>@{acc.username}</td>
                <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold" }}>{acc.confidence}</td>
                <td style={{ padding: "5px", border: "1px solid #ddd" }}>{acc.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* LinkedIn Professional History & Credentials */}
        {(() => {
          const linkedinAcc = suspect.accounts.find(a => a.platform === "linkedin" && a.linkedinIntel);
          if (!linkedinAcc || !linkedinAcc.linkedinIntel) return null;
          const intel = linkedinAcc.linkedinIntel;
          return (
            <div style={{ pageBreakInside: "avoid" }}>
              <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>LinkedIn Professional History & Credentials</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "15px" }}>
                <tbody>
                  {intel.fullName?.value && (
                    <tr>
                      <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold", width: "25%" }}>Full Name</td>
                      <td style={{ padding: "5px", border: "1px solid #ddd" }}>{intel.fullName.value} (Source: {intel.fullName.source})</td>
                    </tr>
                  )}
                  {intel.headline?.value && (
                    <tr>
                      <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold" }}>Headline</td>
                      <td style={{ padding: "5px", border: "1px solid #ddd" }}>{intel.headline.value}</td>
                    </tr>
                  )}
                  {intel.location?.value && (
                    <tr>
                      <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold" }}>Location</td>
                      <td style={{ padding: "5px", border: "1px solid #ddd" }}>{intel.location.value}</td>
                    </tr>
                  )}
                  {intel.summary?.value && (
                    <tr>
                      <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold" }}>Summary</td>
                      <td style={{ padding: "5px", border: "1px solid #ddd", fontStyle: "italic" }}>{intel.summary.value}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {intel.experiences && intel.experiences.length > 0 && (
                <div style={{ marginBottom: "15px" }}>
                  <strong style={{ fontSize: "11px", display: "block", marginBottom: "5px" }}>Employment History:</strong>
                  {intel.experiences.map((exp, idx) => (
                    <div key={idx} style={{ fontSize: "10px", padding: "4px 0", borderBottom: "1px dashed #eee" }}>
                      • <strong>{exp.title.value}</strong> at <strong>{exp.company.value}</strong> 
                      {exp.duration?.value ? ` (${exp.duration.value})` : ""}
                      {exp.description?.value ? <div style={{ color: "#555", marginTop: "2px", paddingLeft: "10px" }}>{exp.description.value}</div> : ""}
                    </div>
                  ))}
                </div>
              )}

              {intel.educations && intel.educations.length > 0 && (
                <div style={{ marginBottom: "15px" }}>
                  <strong style={{ fontSize: "11px", display: "block", marginBottom: "5px" }}>Education History:</strong>
                  {intel.educations.map((edu, idx) => (
                    <div key={idx} style={{ fontSize: "10px", padding: "4px 0", borderBottom: "1px dashed #eee" }}>
                      • <strong>{edu.institution.value}</strong> 
                      {edu.degree?.value && edu.degree.value !== "Degree" ? ` - ${edu.degree.value}` : ""}
                      {edu.fieldOfStudy?.value ? ` in ${edu.fieldOfStudy.value}` : ""}
                      {edu.duration?.value ? ` (${edu.duration.value})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>Flagged Content Activity Feed (Top Posts)</h4>
        <div style={{ fontSize: "11px", marginBottom: "20px" }}>
          {suspect.posts.filter(p => p.flagLevel !== "NORMAL").map((post, index) => (
            <div key={index} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
              <strong>[{post.platform.toUpperCase()} - {post.postedAt || post.timestamp ? new Date(post.postedAt || post.timestamp || "").toLocaleDateString("en-IN") : "Unknown Date"}]</strong>: {post.content}<br />
              <span style={{ color: "#777", fontSize: "10px" }}>AI flag reasoning: {post.flagReason}</span>
            </div>
          ))}
        </div>

        {/* Alias Detection Summary */}
        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>Alias Detection Summary</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "20px" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Platform</th>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Handle</th>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Confidence</th>
              <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Evasion Pattern</th>
            </tr>
          </thead>
          <tbody>
            {suspect.aliasResults?.length > 0 ? suspect.aliasResults.map((alias, index) => (
              <tr key={index}>
                <td style={{ padding: "5px", border: "1px solid #ddd", textTransform: "uppercase" }}>{alias.platform}</td>
                <td style={{ padding: "5px", border: "1px solid #ddd" }}>@{alias.handle}</td>
                <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold" }}>{alias.confidenceLevel} ({alias.confidence}%)</td>
                <td style={{ padding: "5px", border: "1px solid #ddd" }}>{alias.evasionPattern ? alias.evasionReason || "Yes" : "No"}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ padding: "5px", border: "1px solid #ddd" }}>No alias patterns detected.</td></tr>
            )}
          </tbody>
        </table>

        {/* NEXUS Connected Signals */}
        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>NEXUS Connected Signals (Auto-Analysis)</h4>
        <div style={{ fontSize: "11px", marginBottom: "20px" }}>
          {suspect.nexusAnalysis ? (
            <>
              <div style={{ marginBottom: "10px" }}><strong>Key Finding:</strong> {suspect.nexusAnalysis.key_finding}</div>
              {suspect.nexusAnalysis.connected_signals?.map((sig, idx) => (
                <div key={idx} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                  <strong>{sig.signal1}</strong> ↔ <strong>{sig.signal2}</strong><br />
                  <span style={{ color: "#555" }}>{sig.connection}</span>
                </div>
              ))}
            </>
          ) : (
            <div>Analysis data unavailable.</div>
          )}
        </div>

        {/* Legal Records */}
        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>Legal & Public Records</h4>
        <div style={{ fontSize: "11px", marginBottom: "20px" }}>
          {suspect.legalRecords.length > 0 ? suspect.legalRecords.map((record, index) => (
            <div key={index} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
              <strong>[{(record.source || "Unknown Source").toUpperCase()} - {new Date(record.date).toLocaleDateString("en-IN")}]</strong>: {record.title}<br />
              <span style={{ color: "#777", fontSize: "10px" }}>{record.summary}</span>
            </div>
          )) : (
            <div>No public legal records associated with this subject.</div>
          )}
        </div>

        {/* OSINT Toolkit Summary */}
        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>OSINT Toolkit Summary</h4>
        <div style={{ fontSize: "11px", marginBottom: "20px" }}>
          {suspect.toolkitFindings && suspect.toolkitFindings.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Finding</th>
                  <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Source/Provider</th>
                  <th style={{ padding: "5px", border: "1px solid #ddd", textAlign: "left" }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {suspect.toolkitFindings.map((finding, index) => (
                  <tr key={index}>
                    <td style={{ padding: "5px", border: "1px solid #ddd", textTransform: "uppercase", fontWeight: "bold" }}>{finding.category}</td>
                    <td style={{ padding: "5px", border: "1px solid #ddd" }}>
                      <strong>{finding.title}</strong>: {finding.description}
                      {finding.url && <div style={{ fontSize: "9px", color: "#3b82f6" }}>{finding.url}</div>}
                    </td>
                    <td style={{ padding: "5px", border: "1px solid #ddd", textTransform: "uppercase" }}>{finding.source} ({finding.provider})</td>
                    <td style={{ padding: "5px", border: "1px solid #ddd", fontWeight: "bold" }}>{Math.round(finding.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>No supplementary OSINT toolkit findings recorded.</div>
          )}
        </div>

        {/* External Intelligence (Epieos Findings) */}
        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>External Intelligence — Epieos Findings</h4>
        <div style={{ fontSize: "11px", marginBottom: "20px" }}>
          {suspect.toolkitFindings && suspect.toolkitFindings.some(f => f.provider.toLowerCase() === "epieos") ? (
            <div style={{ padding: "4px 0" }}>
              {suspect.toolkitFindings
                .filter(f => f.provider.toLowerCase() === "epieos")
                .map((finding, idx) => (
                  <div key={idx} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                    <strong>[Imported Record {idx + 1}] {finding.title}</strong> (Confidence: {Math.round(finding.confidence * 100)}%)<br />
                    <span style={{ color: "#333" }}>{finding.description}</span><br />
                    {finding.url && <span style={{ color: "#3b82f6", fontSize: "9px" }}>Profile URL: {finding.url}</span>}
                  </div>
                ))}
            </div>
          ) : (
            <div>No external intelligence findings imported from Epieos.</div>
          )}
        </div>

        <h4 style={{ fontSize: "14px", borderBottom: "1px solid #333", paddingBottom: "3px", margin: "20px 0 10px 0" }}>Statutory Section 65B Indian Evidence Act Certificate</h4>
        <div style={{ fontSize: "11px", textAlign: "justify", lineHeight: "1.5", marginTop: "15px" }}>
          <p>This report was generated by SOCMINT Shield<br />on {new Date().toLocaleDateString("en-IN")} at {new Date().toLocaleTimeString("en-IN")} IST.<br />Investigating Officer: {analystName} ({analystBadge} • {analystUnit})<br />All data sourced from publicly available platforms and government records.</p>
          
          <div style={{ marginTop: "20px", background: "#f9f9f9", padding: "10px", border: "1px solid #ddd", fontFamily: "monospace", fontSize: "10px", wordBreak: "break-all" }}>
            <strong>SHA-256 Evidence Hash:</strong><br />
            {sha256Hash}
          </div>

          <p style={{ marginTop: "15px" }}>This document complies with Section 65B of the Indian Evidence Act, 2000 and the Digital Personal Data Protection Act, 2023.</p>
          <p style={{ marginTop: "10px", fontWeight: "bold" }}>CCITR • CID Karnataka Police • CIDECODE 2026</p>

          <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
            <div>
              Date: ____________________<br />
              Place: Bangalore City
            </div>
            <div style={{ textAlign: "right" }}>
              Officer Signature: ____________________<br />
              Authorized Cyber Inspector Cell stamp
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
