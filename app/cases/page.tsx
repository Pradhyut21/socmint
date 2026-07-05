"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderClosed, Trash2, FileSearch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/lib/storage";
import { riskColor } from "@/lib/utils";
import { buildSeedRecents } from "@/lib/mock-data";
import type { SuspectProfile } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

export default function CasesPage() {
  const [list, setList] = useState<SuspectProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const existing = storage.getRecent();
    if (existing.length === 0) {
      const seeded = buildSeedRecents();
      seeded.forEach((p) => storage.pushRecent(p));
      setList(storage.getRecent());
    } else {
      setList(existing);
    }
  }, []);

  // Fetch session and listen for auth state changes to compute isAdmin
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        const email = data.session?.user?.email || "";
        setIsAdmin(email.toLowerCase().startsWith("admin") || email.toLowerCase() === "admin@socmint.com");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        const email = session?.user?.email || "";
        setIsAdmin(email.toLowerCase().startsWith("admin") || email.toLowerCase() === "admin@socmint.com");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const clearAll = () => {
    if (!isAdmin) return;
    if (typeof window !== "undefined" && !window.confirm("Wipe all local case history? This cannot be undone.")) return;
    storage.clearRecent();
    setList([]);
    storage.pushAudit("HISTORY_CLEARED");
  };

  const deleteCase = (ref: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAdmin) return;
    if (typeof window !== "undefined" && !window.confirm("Remove this case from history?")) return;
    const updated = list.filter((x) => x.caseReference !== ref);
    storage.setRecent(updated);
    setList(updated);
    storage.pushAudit("CASE_DELETED", ref);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Case Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">{list.length} {list.length === 1 ? "dossier" : "dossiers"} on file (local).</p>
        </div>
        {list.length > 0 && isAdmin && (
          <Button variant="outline" onClick={clearAll}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear history
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <FolderClosed className="h-10 w-10" />
              <span>No prior investigations.</span>
              <Button asChild variant="outline">
                <Link href="/"><FileSearch className="mr-2 h-4 w-4" /> Start an investigation</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <motion.div
              key={p.caseReference}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="card-3d sheen-sweep"
            >
              <Link href={`/?case=${p.caseReference}`} className="block">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.realName} className="h-12 w-12 border border-border bg-muted object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 border border-border bg-muted flex items-center justify-center shrink-0 font-mono text-lg font-bold text-muted-foreground">
                          {(p.realName || p.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-base font-semibold leading-tight">{p.realName}</div>
                        <div className="font-mono text-xs text-muted-foreground">@{p.username ? p.username.replace(/^@/, "") : ""}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={riskColor(p.riskLevel) + " font-mono text-[10px] uppercase animate-pulse"}>{p.riskLevel}</Badge>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => deleteCase(p.caseReference, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>{p.accounts?.length || 0} accounts</span>
                      <span>Risk <span className="font-semibold text-foreground">{p.riskScore}</span></span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{p.caseReference} · {new Date(p.capturedAt).toLocaleDateString("en-IN")}</div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
