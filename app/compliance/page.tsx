"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText, ShieldCheck, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/lib/storage";
import { buildSeedAuditLogs } from "@/lib/mock-data";

export default function CompliancePage() {
  const [logs, setLogs] = useState<{ id: string; ts: string; action: string; detail?: string }[]>([]);
  
  useEffect(() => {
    const existing = storage.getAudit();
    setLogs(existing.length === 0 ? buildSeedAuditLogs() : existing);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Legal Compliance & Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every action against a suspect file is logged. Retention: 7 years.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Source legitimacy", body: "Only public OSINT sources are queried. No private API scraping. No password cracking. Aligned with KSP General Order 14/2024." },
          { icon: FileCheck, title: "Evidence integrity", body: "All dossiers carry a SHA-256 hash and IST timestamp. Section 65B IT Act certificate is generated on export." },
          { icon: ScrollText, title: "Audit ledger", body: "Investigator queries, exports, and credential changes are recorded immutably below and synced to the supervising officer." },
        ].map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
            <PolicyCard icon={p.icon} title={p.title} body={p.body} />
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}>
        <Card className="mt-6">
          <CardHeader><CardTitle className="font-display">Audit ledger</CardTitle><CardDescription>Most recent 200 actions, this device.</CardDescription></CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No entries yet. Run a sweep to populate the ledger.</p>
            ) : (
              <ol className="divide-y divide-border">
                {logs.map((l, i) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.02, duration: 0.25 }}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold uppercase tracking-wider text-stamp">{l.action}</div>
                      {l.detail && <div className="truncate text-sm">{l.detail}</div>}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">{new Date(l.ts).toLocaleString("en-IN")}</span>
                  </motion.li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }}>
        <div className="mt-6 rounded-md border border-evidence/30 bg-evidence/5 p-4 text-sm">
          <Badge variant="outline" className="font-mono text-[10px] uppercase">Notice</Badge>
          <p className="mt-2">SOCMINT Shield does not authorize surveillance of citizens outside the scope of a registered case file. Misuse is a punishable offense under the IT Act and Karnataka Police Act.</p>
        </div>
      </motion.div>

      <Separator className="my-8" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Last review · {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
  );
}

function PolicyCard({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-stamp/10 text-stamp"><Icon className="h-4 w-4" /></div>
        <div className="font-display text-base font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
