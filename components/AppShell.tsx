"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Search,
  Bell,
  FolderClosed,
  ScrollText,
  Menu,
  X,
  Lock,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { storage } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/", label: "Investigate Sweep", icon: Search, exact: true },
  { to: "/alerts", label: "Alerts Center", icon: Bell },
  { to: "/cases", label: "Case Directory", icon: FolderClosed },
  { to: "/compliance", label: "Legal Compliance", icon: ScrollText },
];

const queryClient = new QueryClient();

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShellContent>{children}</AppShellContent>
    </QueryClientProvider>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyst, setAnalystState] = useState({ name: "Analyst", badge: "A-00", unit: "Unit 0" });
  const pathname = usePathname();

  useEffect(() => {
    setAnalystState(storage.getAnalyst());
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden no-print" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0 no-print ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-stamp text-primary-foreground">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-lg font-semibold leading-tight">SOCMINT</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60">Shield · v1.0</div>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent md:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {NAV.map((n, i) => {
              const active = n.exact ? pathname === n.to : pathname?.startsWith(n.to);
              const Icon = n.icon;
              return (
                <motion.div
                  key={n.to}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  whileHover={{ x: 3 }}
                >
                  <Link
                    href={n.to}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-md bg-sidebar-accent"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={`relative z-10 h-4 w-4 ${active ? "text-stamp" : ""}`} />
                    <span className="relative z-10 flex-1">{n.label}</span>
                    {active && <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-stamp" />}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <button
            onClick={() => setSettingsOpen(true)}
            className="m-3 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3 text-left text-sm hover:bg-sidebar-accent"
          >
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sidebar-foreground/60">
              <UserCog className="h-3.5 w-3.5" /> Auditor profile
            </div>
            <div className="mt-2 font-medium text-sidebar-foreground">{analyst.name}</div>
            <div className="font-mono text-xs text-sidebar-foreground/70">{analyst.badge}</div>
            <div className="mt-0.5 text-xs text-sidebar-foreground/60">{analyst.unit}</div>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader onMenu={() => setMobileOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        analyst={analyst}
        onSave={(a) => { storage.setAnalyst(a); setAnalystState(a); storage.pushAudit("ANALYST_UPDATED", a.name); }}
      />
      <Toaster position="top-right" richColors />
    </div>
  );
}

function TopHeader({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const ist = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
      setClock(ist + " IST");
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const title =
    pathname === "/" ? "Karnataka State Police · Tactical OSINT Portal" :
    pathname?.startsWith("/alerts") ? "Alerts & Discovery Monitor" :
    pathname?.startsWith("/cases") ? "Case Directory" :
    pathname?.startsWith("/compliance") ? "Legal Compliance & Audit" :
    "SOCMINT Shield";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur no-print">
      <button onClick={onMenu} className="rounded-md p-1.5 hover:bg-muted md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      </div>
      <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-evidence" />
        <span className="font-mono">{clock || "--:--:--"}</span>
      </div>
      <div className="hidden items-center gap-1.5 rounded-md border border-evidence/30 bg-evidence/10 px-2.5 py-1 text-xs text-evidence md:flex">
        <Lock className="h-3 w-3" />
        <span className="font-mono uppercase tracking-wider">Secure session</span>
      </div>
    </header>
  );
}

function SettingsDialog({
  open, onOpenChange, analyst, onSave,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  analyst: { name: string; badge: string; unit: string };
  onSave: (a: { name: string; badge: string; unit: string }) => void;
}) {
  const [form, setForm] = useState(analyst);
  useEffect(() => { setForm(analyst); }, [analyst, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Auditor Profile</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Analyst name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Badge number</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="font-mono" /></div>
          <div className="space-y-1.5"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }}>Save credentials</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
