"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, AlertCircle, Info, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { storage } from "@/lib/storage";
import { seedAlerts } from "@/lib/mock-data";
import type { AlertItem } from "@/lib/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    const existing = storage.getAlerts();
    if (existing.length === 0) {
      storage.setAlerts(seedAlerts);
      setAlerts(seedAlerts);
    } else {
      setAlerts(existing);
    }
  }, []);

  const mark = (id: string) => {
    const next = alerts.map((a) => a.id === id ? { ...a, isRead: true } : a);
    setAlerts(next);
    storage.setAlerts(next);
    storage.pushAudit("ALERT_AUDITED", id);
  };

  const clear = () => {
    setAlerts([]);
    storage.setAlerts([]);
  };

  const unread = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Alerts & Discovery Monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unread} unread · {alerts.length} total</p>
        </div>
        <Button variant="outline" onClick={clear}><Trash2 className="mr-2 h-4 w-4" /> Clear all</Button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Bell className="h-8 w-8" />
                <span>No alerts in queue.</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {alerts.map((a, i) => {
          const Icon = a.type === "critical" ? AlertCircle : a.type === "warning" ? AlertTriangle : Info;
          const tone = a.type === "critical" ? "border-l-stamp" : a.type === "warning" ? "border-l-warn" : "border-l-evidence";
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card className={`border-l-4 ${tone} ${a.isRead ? "opacity-60" : ""}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className={`mt-0.5 h-5 w-5 ${a.type === "critical" ? "text-stamp" : a.type === "warning" ? "text-warn" : "text-evidence"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-base font-semibold">{a.title}</div>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase shrink-0">{a.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.details}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted-foreground">{new Date(a.timestamp).toLocaleString("en-IN")}</span>
                      {!a.isRead && <Button variant="ghost" size="sm" onClick={() => mark(a.id)}><Check className="mr-1 h-3.5 w-3.5" /> Mark audited</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
