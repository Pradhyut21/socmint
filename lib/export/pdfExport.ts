/**
 * PDF / Print Dossier Export
 *
 * Uses the browser's native window.print() with a @media print CSS stylesheet.
 * No external dependencies — zero bundle cost.
 *
 * Call `printDossier(profile)` from the client. It injects a hidden print-only
 * <div> into document.body, triggers window.print(), then removes it.
 */

import type { SuspectProfile } from "@/lib/types";

function badge(level: string): string {
  const colors: Record<string, string> = {
    LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#7c3aed",
  };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${colors[level] || "#64748b"};color:#fff;">${level}</span>`;
}

function row(label: string, value: string | null | undefined): string {
  if (!value || value === "Not provided" || value === "Not Publicly Available") return "";
  return `<tr><td style="padding:4px 8px;color:#64748b;font-size:12px;white-space:nowrap;width:140px;">${label}</td><td style="padding:4px 8px;font-size:12px;word-break:break-word;">${value}</td></tr>`;
}

export function printDossier(profile: SuspectProfile): void {
  if (typeof window === "undefined") return;

  const capturedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  // Platform status table rows
  const platformRows = (profile.platformStatuses || [])
    .map(p => {
      const color = p.status === "FOUND" ? "#22c55e"
        : p.status === "NOT FOUND" ? "#94a3b8"
        : p.status === "RATE LIMITED" ? "#f59e0b"
        : "#ef4444";
      return `<tr>
        <td style="padding:3px 8px;font-size:11px;">${p.name}</td>
        <td style="padding:3px 8px;font-size:11px;color:${color};font-weight:600;">${p.status}</td>
        <td style="padding:3px 8px;font-size:11px;color:#94a3b8;">${p.responseTimeMs}ms</td>
        <td style="padding:3px 8px;font-size:11px;color:#64748b;max-width:200px;word-break:break-word;">${p.reason || ""}</td>
      </tr>`;
    }).join("");

  // Linked accounts
  const accountRows = (profile.accounts || [])
    .slice(0, 20)
    .map(acc => `<tr>
      <td style="padding:3px 8px;font-size:11px;font-weight:600;">${acc.platform.toUpperCase()}</td>
      <td style="padding:3px 8px;font-size:11px;">@${acc.username}</td>
      <td style="padding:3px 8px;font-size:11px;">${acc.confidence || "POSSIBLE"}</td>
      <td style="padding:3px 8px;font-size:11px;color:#64748b;max-width:200px;overflow:hidden;">${acc.bio?.slice(0, 80) || ""}</td>
    </tr>`).join("");

  // Evidence reliability
  const evidenceList = (profile.evidenceReliability || [])
    .slice(0, 10)
    .map(e => `<li style="font-size:11px;margin-bottom:2px;">${e}</li>`).join("");

  // Reasoning steps
  const reasoningRows = (profile.reasoningSteps || [])
    .slice(0, 12)
    .map(s => `<tr>
      <td style="padding:3px 8px;font-size:10px;color:#94a3b8;">${s.timestamp}</td>
      <td style="padding:3px 8px;font-size:10px;font-family:monospace;">${s.module}</td>
      <td style="padding:3px 8px;font-size:10px;">${s.evidenceGenerated?.slice(0, 120) || ""}</td>
      <td style="padding:3px 8px;font-size:10px;color:#22c55e;">+${s.confidenceDelta}%</td>
    </tr>`).join("");

  const html = `
<div id="socmint-print-dossier" style="display:none;">
<style>
  @media print {
    #socmint-print-dossier { display:block !important; }
    body > *:not(#socmint-print-dossier) { display:none !important; }
    @page { size:A4; margin:15mm; }
  }
  #socmint-print-dossier {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #0f172a;
    background: #fff;
    padding: 0;
    max-width: 800px;
  }
  #socmint-print-dossier h1 { font-size:18px; margin:0 0 2px; }
  #socmint-print-dossier h2 { font-size:13px; color:#334155; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin:16px 0 6px; text-transform:uppercase; letter-spacing:.05em; }
  #socmint-print-dossier table { width:100%; border-collapse:collapse; }
  #socmint-print-dossier tr:nth-child(even) { background:#f8fafc; }
  #socmint-print-dossier th { font-size:10px; text-align:left; padding:4px 8px; color:#64748b; background:#f1f5f9; text-transform:uppercase; letter-spacing:.04em; }
  #socmint-print-dossier .header { display:flex; align-items:center; gap:16px; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:12px; }
  #socmint-print-dossier .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:72px; color:rgba(0,0,0,.04); pointer-events:none; font-weight:900; letter-spacing:-.04em; }
  #socmint-print-dossier .footer { margin-top:20px; border-top:1px solid #e2e8f0; padding-top:6px; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; }
</style>
<div class="watermark">SOCMINT SHIELD</div>

<!-- HEADER -->
<div class="header">
  <div style="width:56px;height:56px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:8px;display:flex;align-items:center;justify-content:center;">
    <span style="color:#38bdf8;font-size:22px;font-weight:900;">S</span>
  </div>
  <div>
    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">SOCMINT Shield — OSINT Dossier</div>
    <h1>${profile.realName || profile.username}</h1>
    <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
      ${badge(profile.riskLevel || "UNKNOWN")}
      <span style="font-size:11px;color:#64748b;">${profile.caseReference || "N/A"}</span>
      <span style="font-size:11px;color:#64748b;">Risk Score: ${profile.riskScore || "—"}/100</span>
    </div>
  </div>
  <div style="margin-left:auto;text-align:right;font-size:10px;color:#94a3b8;">
    <div>Generated: ${capturedAt} IST</div>
    <div>Captured At: ${profile.capturedAt?.slice(0,16).replace("T"," ") || "—"} UTC</div>
  </div>
</div>

<!-- IDENTITY SUMMARY -->
<h2>Identity Summary</h2>
<table>
  ${row("Username", profile.username)}
  ${row("Real Name", profile.realName)}
  ${row("Phone", profile.phoneNumber)}
  ${row("Email", profile.emailAddress)}
  ${row("Location", profile.locations?.[0]?.locationName)}
  ${row("Risk Level", profile.riskLevel)}
  ${row("Risk Score", profile.riskScore?.toString())}
  ${row("Case Reference", profile.caseReference)}
</table>

<!-- RISK SIGNALS -->
${profile.riskSignals?.length ? `
<h2>Risk Signals (${profile.riskSignals.length})</h2>
<ul style="margin:0;padding-left:18px;">
  ${profile.riskSignals.map(s => `<li style="font-size:11px;margin-bottom:3px;">${s}</li>`).join("")}
</ul>` : ""}

<!-- LINKED ACCOUNTS -->
${profile.accounts?.length ? `
<h2>Linked Accounts (${profile.accounts.length})</h2>
<table>
  <tr><th>Platform</th><th>Username</th><th>Confidence</th><th>Bio</th></tr>
  ${accountRows}
</table>` : ""}

<!-- PLATFORM STATUS -->
${profile.platformStatuses?.length ? `
<h2>Platform Sweep Status</h2>
<table>
  <tr><th>Platform</th><th>Status</th><th>Response</th><th>Reason</th></tr>
  ${platformRows}
</table>` : ""}

<!-- EVIDENCE RELIABILITY -->
${evidenceList ? `
<h2>Evidence Reliability</h2>
<ul style="margin:0;padding-left:18px;column-count:2;">
  ${evidenceList}
</ul>` : ""}

<!-- REASONING STEPS -->
${reasoningRows ? `
<h2>Reasoning Chain</h2>
<table>
  <tr><th>Time</th><th>Module</th><th>Evidence</th><th>Δ Confidence</th></tr>
  ${reasoningRows}
</table>` : ""}

<!-- FOOTER -->
<div class="footer">
  <span>SOCMINT Shield — Law Enforcement Intelligence Platform</span>
  <span>CONFIDENTIAL — For Authorised Investigative Use Only</span>
  <span>${capturedAt}</span>
</div>
</div>`;

  // Inject into DOM
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // Trigger print dialog
  window.print();

  // Clean up after print dialog closes
  setTimeout(() => {
    document.body.removeChild(wrapper);
  }, 1000);
}
