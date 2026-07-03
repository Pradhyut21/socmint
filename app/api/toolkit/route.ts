import { NextRequest, NextResponse } from "next/server";
import { ToolkitExecution, NormalizedFinding } from "@/lib/types";
import { runOsintToolkit } from "@/lib/osintRunner";
import { PROVIDERS } from "@/lib/providers/osint";

export const runtime = "nodejs";

// Server-side in-memory store for toolkit data
const executionsStore = new Map<string, ToolkitExecution[]>();
const findingsStore = new Map<string, NormalizedFinding[]>();

// ── GET: Fetch execution history and findings by case reference ──────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const caseRef = searchParams.get("case");

  if (!caseRef) {
    return NextResponse.json({ error: "case parameter is required" }, { status: 400 });
  }

  const executions = executionsStore.get(caseRef) || [];
  const findings = findingsStore.get(caseRef) || [];

  return NextResponse.json({
    caseReference: caseRef,
    executions,
    findings,
    count: findings.length,
  });
}

// ── POST: Record execution and findings OR run tool on server ────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseReference, executions, findings, run, query, providerIds } = body;

    if (!caseReference) {
      return NextResponse.json({ error: "caseReference is required" }, { status: 400 });
    }

    // Server-side execution mode
    if (run && query && providerIds) {
      console.log(`[Toolkit Server] Starting scan on server: ${query} with providers: ${providerIds}`);
      
      const results = await runOsintToolkit({
        caseReference,
        query,
        providerIds,
        onProgress: (p) => {
          const existing = executionsStore.get(caseReference) || [];
          let exec = existing.find(e => e.providerId === p.providerId);
          if (!exec) {
            const newExec: ToolkitExecution = {
              id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              caseReference,
              providerId: p.providerId,
              query,
              timestamp: new Date().toISOString(),
              durationMs: 0,
              status: "FAILED", // Default to FAILED, will become SUCCESS on completion
              findingsCount: 0,
              logs: []
            };
            existing.unshift(newExec);
            executionsStore.set(caseReference, existing);
            exec = newExec;
          }
          if (p.logLine) {
            exec.logs.push(p.logLine);
          }
          if (p.stage === "completed") {
            exec.status = "SUCCESS";
          } else if (p.stage === "failed") {
            exec.status = "FAILED";
          }
        }
      });

      // Merge findings
      if (results.findings && results.findings.length > 0) {
        const existingFindings = findingsStore.get(caseReference) || [];
        const newFindings = results.findings.filter(f => !existingFindings.some(fi => fi.id === f.id));
        findingsStore.set(caseReference, [...newFindings, ...existingFindings].slice(0, 500));
      }

      // Merge executions
      if (results.executions && results.executions.length > 0) {
        const existingExecs = executionsStore.get(caseReference) || [];
        results.executions.forEach(ex => {
          const idx = existingExecs.findIndex(e => e.providerId === ex.providerId);
          if (idx !== -1) {
            existingExecs[idx] = ex; // Replace running state with final state
          } else {
            existingExecs.unshift(ex);
          }
        });
        executionsStore.set(caseReference, existingExecs.slice(0, 100));
      }

      return NextResponse.json({
        success: true,
        caseReference,
        executions: executionsStore.get(caseReference) || [],
        findings: findingsStore.get(caseReference) || [],
      });
    }

    // Manual upload mode
    if (Array.isArray(executions)) {
      const existingExecs = executionsStore.get(caseReference) || [];
      const newExecs = executions.filter(e => !existingExecs.some(ex => ex.id === e.id));
      executionsStore.set(caseReference, [...existingExecs, ...newExecs].slice(0, 100));
    }

    if (Array.isArray(findings)) {
      const existingFindings = findingsStore.get(caseReference) || [];
      const newFindings = findings.filter(f => !existingFindings.some(fi => fi.id === f.id));
      findingsStore.set(caseReference, [...existingFindings, ...newFindings].slice(0, 500));
    }

    return NextResponse.json({
      success: true,
      caseReference,
      executions: executionsStore.get(caseReference) || [],
      findings: findingsStore.get(caseReference) || [],
    });
  } catch (err) {
    console.error("[toolkit POST] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record toolkit execution." },
      { status: 500 }
    );
  }
}

