"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail, Phone, Loader2, AlertTriangle, CheckCircle2,
  XCircle, Search, ShieldCheck, Copy, ExternalLink, ChevronDown, ChevronRight,
} from "lucide-react";
import type { SuspectProfile } from "@/lib/types";
import type { ContactDiscoveryResult, EmailLead, PhoneLead } from "@/lib/fetchers/contactDiscovery";

// ── Confidence styling ─────────────────────────────────────────────────────────
const confColor = (c: "HIGH" | "MEDIUM" | "LOW") => ({
  HIGH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-slate-50 text-slate-500 border-slate-200",
}[c]);

const confDot = (c: "HIGH" | "MEDIUM" | "LOW") => ({
  HIGH: "bg-emerald-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-slate-300",
}[c]);

// ── Main component ─────────────────────────────────────────────────────────────
export default function ContactDiscoveryTab({ suspect }: { suspect: SuspectProfile }) {
  const username = suspect.username.replace(/^@/, "");
  const realName = suspect.realName;

  // Collect bios from known accounts for phone extraction
  const bios = (suspect.accounts || [])
    .map((a) => a.bio)
    .filter((b): b is string => !!b && b.length > 5);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ContactDiscoveryResult | null>(suspect.contactDiscovery ?? null);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const resp = await fetch("/api/contact-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, realName, bios }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data.result as ContactDiscoveryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contact discovery failed.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-sky-600" />
        <span className="font-bold text-sm text-ink uppercase tracking-wider">Email & Phone Discovery</span>
        <Badge variant="outline" className="text-[8px] border-sky-200 text-sky-700 font-bold uppercase ml-1">
          Public OSINT
        </Badge>
      </div>

      {/* Control card */}
      <Card className="border-sky-200 bg-sky-50/30 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
            Attempts to enumerate email addresses and phone numbers linked to{" "}
            <span className="font-bold text-ink">@{username}</span> using:
            GitHub commit metadata leaks, email pattern permutation, Gravatar existence
            verification, paste-site OSINT, and bio text extraction.{" "}
            <span className="text-sky-700 font-bold">All sources are publicly available.</span>
          </p>

          {/* Context chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600 font-mono">
              username: <span className="text-ink font-bold">{username}</span>
            </span>
            {realName && (
              <span className="text-[9px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600 font-mono">
                name: <span className="text-ink font-bold">{realName}</span>
              </span>
            )}
            {bios.length > 0 && (
              <span className="text-[9px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600 font-mono">
                {bios.length} bio source{bios.length > 1 ? "s" : ""} available
              </span>
            )}
          </div>

          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-sky-700 transition-colors disabled:opacity-40"
          >
            {scanning ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</>
            ) : (
              <><Search className="w-3 h-3" /> Discover Contacts</>
            )}
          </button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[11px]">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="text-[10px] text-slate-600 font-sans italic border-l-2 border-sky-300 pl-3">
              {result.summary}
            </div>

            {/* Email leads */}
            {result.emailLeads.length > 0 && (
              <EmailLeadsSection leads={result.emailLeads} />
            )}

            {/* Phone leads */}
            {result.phoneLeads.length > 0 && (
              <PhoneLeadsSection leads={result.phoneLeads} />
            )}

            {/* Empty */}
            {result.emailLeads.length === 0 && result.phoneLeads.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <XCircle className="w-8 h-8" />
                <p className="text-[11px] font-semibold">No contact leads found.</p>
                <p className="text-[10px] text-center max-w-xs">
                  Try adding the subject's real name to improve email permutation quality.
                </p>
              </div>
            )}

            <p className="text-[8px] text-slate-400 font-sans italic text-center pt-1">
              ⚠ All results are investigative leads only. Verify before any official use.
              Checked: {new Date(result.checkedAt).toLocaleString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Email leads section ───────────────────────────────────────────────────────
function EmailLeadsSection({ leads }: { leads: EmailLead[] }) {
  const verified = leads.filter(l => l.verified);
  const unverified = leads.filter(l => !l.verified);

  return (
    <Card className="border-sky-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-display font-bold text-sky-800 flex items-center gap-1.5 uppercase tracking-wider">
          <Mail className="w-3.5 h-3.5" />
          Email Leads ({leads.length})
          {verified.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-bold uppercase px-1.5 ml-1">
              {verified.length} verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        {leads.map((lead, i) => (
          <EmailLeadCard key={i} lead={lead} />
        ))}
      </CardContent>
    </Card>
  );
}

function EmailLeadCard({ lead }: { lead: EmailLead }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(lead.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`rounded-xl border p-2.5 space-y-1.5 transition-all ${lead.verified ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {lead.verified
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            : <div className={`w-2 h-2 rounded-full shrink-0 ${confDot(lead.confidence)}`} />
          }
          <span className="font-bold text-[11px] text-ink font-mono truncate">{lead.email}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${confColor(lead.confidence)}`}>
            {lead.confidence}
          </span>
          {lead.verified && (
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-bold uppercase px-1">
              ✓ Verified
            </Badge>
          )}
          <button
            onClick={copy}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy email"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={`mailto:${lead.email}`}
            className="p-1 rounded hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors"
            title="Open in mail client"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[9px] text-slate-500 font-sans">Source:</span>
        <span className="text-[9px] text-sky-700 font-semibold font-sans">{lead.source}</span>
      </div>

      {lead.note && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
            {expanded ? "Hide note" : "Show note"}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[9px] text-slate-500 font-sans leading-relaxed bg-slate-50 rounded p-2"
              >
                {lead.note}
              </motion.p>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ── Phone leads section ───────────────────────────────────────────────────────
function PhoneLeadsSection({ leads }: { leads: PhoneLead[] }) {
  return (
    <Card className="border-violet-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-display font-bold text-violet-800 flex items-center gap-1.5 uppercase tracking-wider">
          <Phone className="w-3.5 h-3.5" />
          Phone Leads ({leads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        {leads.map((lead, i) => (
          <PhoneLeadCard key={i} lead={lead} />
        ))}
      </CardContent>
    </Card>
  );
}

function PhoneLeadCard({ lead }: { lead: PhoneLead }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(lead.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-violet-100 bg-white p-2.5 space-y-1.5">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="font-bold text-[12px] text-ink font-mono tracking-widest">{lead.number}</span>
        </div>

        <div className="flex items-center gap-1">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${confColor(lead.confidence)}`}>
            {lead.confidence}
          </span>
          <button
            onClick={copy}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy number"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={`https://wa.me/${lead.number.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
            title="Check on WhatsApp"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] text-slate-500 font-sans">Source: <span className="text-violet-700 font-semibold">{lead.source}</span></span>
        {lead.carrier && <span className="text-[9px] text-slate-400 font-mono">{lead.carrier}</span>}
        {lead.region && <span className="text-[9px] text-slate-400 font-mono">{lead.region}</span>}
      </div>

      {lead.note && (
        <p className="text-[9px] text-slate-500 font-sans leading-relaxed">{lead.note}</p>
      )}
    </div>
  );
}
