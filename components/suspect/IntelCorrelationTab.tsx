"use client";

import React, { useState } from "react";
import {
  Shield, Brain, CheckCircle2, AlertTriangle, Cpu, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SuspectProfile, PlatformAccount } from "@/lib/types";
import { correlateAccount } from "@/lib/intelligence/correlationEngine";
import IdentityCorrelationCard from "@/components/suspect/IdentityCorrelationCard";

export default function IntelCorrelationTab({ p }: { p: SuspectProfile }) {
  const [selectedAccount, setSelectedAccount] = useState<PlatformAccount | null>(
    p.accounts && p.accounts.length > 0 ? p.accounts[0] : null
  );

  const quality = p.investigationQuality || {
    score: 75,
    reason: "Standard sweep completed.",
    breakdown: {
      searched: 20, responded: 14, evidenceCount: 6,
      verifiedCount: 4, correlationStrength: 72, timelineCount: 5, aiConfidence: 50
    }
  };

  const correlation = selectedAccount ? correlateAccount(selectedAccount, p) : null;

  return (
    <div className="space-y-6 font-mono text-xs text-ink">

      {/* Identity Correlation card (Keybase / photo / cross-link) */}
      <IdentityCorrelationCard p={p} />

      {/* Two cards side by side */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* LEFT — Intelligence Quality Score */}
        <Card className="border-l-4 border-l-stamp border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-forest">
              <Shield className="h-4 w-4 text-stamp animate-pulse" />
              INTELLIGENCE QUALITY SCORE
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">Forensic confidence index</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-20 h-20 border-4 border-dashed border-stamp/30">
                <span className="font-display text-2xl font-black text-stamp">{quality.score}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Analysis Summary</div>
                <p className="text-[11px] font-semibold leading-relaxed line-clamp-4 mt-1 text-forest">
                  {quality.reason}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Platforms Resolved</span>
                <span className="font-bold text-forest">{quality.breakdown.responded} / {quality.breakdown.searched}</span>
              </div>
              <Progress value={(quality.breakdown.responded / quality.breakdown.searched) * 100} className="h-1.5" />

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Evidence Verified</span>
                <span className="font-bold text-forest">{quality.breakdown.verifiedCount} / {quality.breakdown.evidenceCount}</span>
              </div>
              <Progress value={quality.breakdown.evidenceCount > 0 ? (quality.breakdown.verifiedCount / quality.breakdown.evidenceCount) * 100 : 0} className="h-1.5" />

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Correlation Strength</span>
                <span className="font-bold text-forest">{quality.breakdown.correlationStrength}%</span>
              </div>
              <Progress value={quality.breakdown.correlationStrength} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Identity Correlation Engine */}
        <Card className="border-l-4 border-l-ember border-border shadow-sm">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="font-display text-sm font-bold flex items-center gap-2 text-forest">
              <Users className="h-4 w-4 text-ember" />
              IDENTITY CORRELATION ENGINE
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">Weighted evidence and conflicting signals prober</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex h-[320px]">

              {/* Account list */}
              <div className="w-[38%] border-r border-border overflow-y-auto bg-paper/50 p-2 space-y-1.5">
                <div className="text-[9px] font-bold text-muted-foreground uppercase px-1.5 py-1 tracking-wider">Discovered Handles</div>
                {p.accounts.map((acc, idx) => {
                  // acc.id is optional and not set by every discovery path
                  // (e.g. fastOSINT's convertToAccounts never sets it), so it
                  // can be undefined for multiple accounts — fall back to a
                  // platform+username+index composite to guarantee a unique key.
                  const accKey = acc.id || `${acc.platform}-${acc.username}-${idx}`;
                  const isSelected = selectedAccount
                    ? (selectedAccount.id
                        ? selectedAccount.id === acc.id
                        : selectedAccount.platform === acc.platform && selectedAccount.username === acc.username)
                    : false;
                  const score = correlateAccount(acc, p).confidence;
                  return (
                    <button
                      key={accKey}
                      onClick={() => setSelectedAccount(acc)}
                      className={`w-full text-left p-2 border transition-all flex flex-col gap-0.5 ${
                        isSelected
                          ? "bg-forest text-ivory border-forest shadow-sm"
                          : "bg-card text-forest border-border hover:border-stamp/40 hover:bg-muted"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[9px] uppercase tracking-wider ${isSelected ? "text-ivory/60" : "text-muted-foreground"}`}>{acc.platform}</span>
                        <span className={`text-[9px] font-bold ${isSelected ? "text-ember" : "text-stamp"}`}>{score}%</span>
                      </div>
                      <span className="text-[11px] truncate select-none font-semibold">@{acc.username}</span>
                    </button>
                  );
                })}
              </div>

              {/* Correlation details */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {selectedAccount && correlation ? (
                  <>
                    {/* Confidence */}
                    <div className="border border-stamp/20 bg-stamp/5 p-3">
                      <div className="text-[9px] font-bold text-stamp uppercase tracking-wider mb-1">Attribution Confidence</div>
                      <div className="font-display text-xs font-black text-forest">
                        "{correlation.confidence}% confidence these profiles may belong to the same individual."
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed font-sans">
                        {correlation.reasoningSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                      {/* Positive */}
                      <div className="space-y-1.5">
                        <div className="font-bold text-stamp uppercase tracking-wide text-[9px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Positive Signals
                        </div>
                        {correlation.positiveSignals.length === 0 ? (
                          <p className="text-muted-foreground italic text-[10px]">None identified.</p>
                        ) : (
                          <ul className="space-y-1">
                            {correlation.positiveSignals.map((sig, idx) => (
                              <li key={idx} className="p-1.5 border border-stamp/20 bg-stamp/5 text-forest">
                                <div className="flex justify-between font-bold text-stamp text-[9px]">
                                  <span>✓ {sig.name}</span>
                                  <span>+{sig.weight}</span>
                                </div>
                                <p className="text-[9px] text-muted-foreground font-normal mt-0.5 font-sans">{sig.description}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Negative */}
                      <div className="space-y-1.5">
                        <div className="font-bold text-rust uppercase tracking-wide text-[9px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Negative Signals
                        </div>
                        {correlation.negativeSignals.length === 0 ? (
                          <div className="p-2 border border-dashed border-stamp/20 text-muted-foreground text-[10px] font-sans leading-relaxed">
                            ✓ No conflicting signals detected for this profile link.
                          </div>
                        ) : (
                          <ul className="space-y-1">
                            {correlation.negativeSignals.map((sig, idx) => (
                              <li key={idx} className="p-1.5 border border-rust/20 bg-rust/5 text-forest">
                                <div className="flex justify-between font-bold text-rust text-[9px]">
                                  <span>✗ {sig.name}</span>
                                  <span>-{sig.weight}</span>
                                </div>
                                <p className="text-[9px] text-muted-foreground font-normal mt-0.5 font-sans">{sig.description}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-[11px]">
                    Select an account to view correlation metrics.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
