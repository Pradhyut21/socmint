import type { SuspectProfile, AlertItem } from "./types";

const KEYS = {
  recent: "socmint_recent_investigations",
  alerts: "socmint_alerts",
  audit: "socmint_audit_logs",
  name: "socmint_analyst_name",
  badge: "socmint_analyst_badge",
  unit: "socmint_analyst_unit",
} as const;

function safe<T>(fn: () => T, fallback: T): T {
  try { if (typeof window === "undefined") return fallback; return fn(); } catch { return fallback; }
}

export const storage = {
  getRecent(): SuspectProfile[] {
    return safe(() => JSON.parse(localStorage.getItem(KEYS.recent) || "[]"), []);
  },
  pushRecent(p: SuspectProfile) {
    if (typeof window === "undefined") return;
    const list = storage.getRecent().filter((x) => x.username !== p.username);
    list.unshift(p);
    localStorage.setItem(KEYS.recent, JSON.stringify(list.slice(0, 24)));
    window.dispatchEvent(new Event("recent_cases_updated"));
  },
  setRecent(list: SuspectProfile[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEYS.recent, JSON.stringify(list));
    window.dispatchEvent(new Event("recent_cases_updated"));
  },
  clearRecent() { 
    if (typeof window !== "undefined") {
      localStorage.removeItem(KEYS.recent);
      window.dispatchEvent(new Event("recent_cases_updated"));
    }
  },

  getAlerts(): AlertItem[] {
    return safe(() => JSON.parse(localStorage.getItem(KEYS.alerts) || "[]"), []);
  },
  setAlerts(a: AlertItem[]) {
    if (typeof window !== "undefined") localStorage.setItem(KEYS.alerts, JSON.stringify(a));
  },

  getAudit(): any[] {
    return safe(() => JSON.parse(localStorage.getItem(KEYS.audit) || "[]"), []);
  },
  pushAudit(action: string, detail?: string) {
    if (typeof window === "undefined") return;
    const list = storage.getAudit();
    list.unshift({ id: crypto.randomUUID(), ts: new Date().toISOString(), action, detail });
    localStorage.setItem(KEYS.audit, JSON.stringify(list.slice(0, 200)));
  },
  pushExtendedAudit(params: {
    action: string;
    caseId: string;
    investigationTarget: string;
    searchType: string;
    platformsQueried: string[];
    evidenceCount: number;
    reportGenerated: boolean;
    durationMs: number;
    detail?: string;
  }) {
    if (typeof window === "undefined") return;
    const analyst = storage.getAnalyst();
    const list = storage.getAudit();
    const entry: any = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      action: params.action,
      detail: params.detail,
      officer: analyst,
      caseId: params.caseId,
      investigationTarget: params.investigationTarget,
      searchType: params.searchType,
      platformsQueried: params.platformsQueried,
      evidenceCount: params.evidenceCount,
      reportGenerated: params.reportGenerated,
      durationMs: params.durationMs,
    };
    list.unshift(entry);
    localStorage.setItem(KEYS.audit, JSON.stringify(list.slice(0, 200)));
  },

  getAnalyst() {
    return {
      name: safe(() => localStorage.getItem(KEYS.name), null) || "A. Sharma",
      badge: safe(() => localStorage.getItem(KEYS.badge), null) || "KSP-4421",
      unit: safe(() => localStorage.getItem(KEYS.unit), null) || "Cyber Crime Cell, Bengaluru",
    };
  },
  setAnalyst(a: { name: string; badge: string; unit: string }) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEYS.name, a.name);
    localStorage.setItem(KEYS.badge, a.badge);
    localStorage.setItem(KEYS.unit, a.unit);
  },
};
