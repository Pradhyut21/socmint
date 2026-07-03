import { EntityType, PROVIDERS, OsintProvider } from "./providers/osint";
import { NormalizedFinding, ToolkitExecution } from "./types";

export interface RunnerProgress {
  providerId: string;
  stage: "started" | "log" | "completed" | "failed";
  logLine?: string;
  progressPercent?: number;
}

/**
 * Detects entity type of the query.
 */
export function detectEntityType(query: string): EntityType {
  const clean = query.trim();
  if (clean.includes("@")) return "email";
  // Matches BTC/ETH/LTC wallets
  if (/^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,59})$/.test(clean)) return "crypto";
  // Matches phone number
  if (/^\+?[0-9\s-]{10,20}$/.test(clean) && clean.replace(/\D/g, "").length >= 10) return "phone";
  // Matches IP or Domain
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}/.test(clean)) return "domain";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean)) return "ip";
  // Fallback to name or username
  if (clean.includes(" ")) return "name";
  return "username";
}

/**
 * Orchestrator to run selected OSINT providers in parallel with timeout,
 * progress tracking, and result normalization/correlation.
 */
export async function runOsintToolkit(opts: {
  caseReference: string;
  query: string;
  providerIds: string[];
  timeoutMs?: number;
  onProgress?: (progress: RunnerProgress) => void;
}): Promise<{
  findings: NormalizedFinding[];
  executions: ToolkitExecution[];
}> {
  const { caseReference, query, providerIds, timeoutMs = 15000, onProgress } = opts;
  const entityType = detectEntityType(query);
  const selectedProviders = PROVIDERS.filter(p => providerIds.includes(p.id) && p.supportedInputs.includes(entityType));
  
  const executions: ToolkitExecution[] = [];
  const allFindings: NormalizedFinding[] = [];
  
  if (selectedProviders.length === 0) {
    return { findings: [], executions: [] };
  }

  // Helper function to run a single provider with logs and timeout
  const runProvider = async (provider: OsintProvider): Promise<{ findings: NormalizedFinding[]; execution: ToolkitExecution }> => {
    const startTime = Date.now();
    const logs: string[] = [];
    const id = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const logCallback = (logLine: string) => {
      logs.push(logLine);
      if (onProgress) {
        onProgress({ providerId: provider.id, stage: "log", logLine });
      }
    };
    
    if (onProgress) {
      onProgress({ providerId: provider.id, stage: "started", logLine: `Starting execution for ${provider.name}...` });
    }
    
    let findings: NormalizedFinding[] = [];
    let status: "SUCCESS" | "FAILED" = "FAILED";
    
    try {
      // Timeout wrapper
      const executionPromise = provider.execute(query, logCallback);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: Execution exceeded limit of ${timeoutMs}ms.`)), timeoutMs);
      });
      
      const rawResult = await Promise.race([executionPromise, timeoutPromise]);
      findings = await provider.normalize(rawResult, query);
      status = "SUCCESS";
      
      if (onProgress) {
        onProgress({ providerId: provider.id, stage: "completed", logLine: `${provider.name} completed successfully. Found ${findings.length} items.` });
      }
    } catch (err: any) {
      status = "FAILED";
      const errorMsg = err instanceof Error ? err.message : String(err);
      logCallback(`[ERROR] ${provider.name} execution failed: ${errorMsg}`);
      if (onProgress) {
        onProgress({ providerId: provider.id, stage: "failed", logLine: `${provider.name} failed: ${errorMsg}` });
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    const execution: ToolkitExecution = {
      id,
      caseReference,
      providerId: provider.id,
      query,
      timestamp: new Date().toISOString(),
      durationMs,
      status,
      findingsCount: findings.length,
      logs,
    };
    
    return { findings, execution };
  };

  // Run in parallel
  const runPromises = selectedProviders.map(p => runProvider(p));
  const results = await Promise.all(runPromises);
  
  results.forEach(res => {
    executions.push(res.execution);
    allFindings.push(...res.findings);
  });
  
  // Deduplicate and boost confidence based on cross-provider corroboration
  const correlatedFindings = correlateAndBoostFindings(allFindings);
  
  return {
    findings: correlatedFindings,
    executions,
  };
}

/**
 * Cross-provider correlation and confidence boosting logic.
 * If multiple providers report the exact same target URL, we merge the finding
 * and boost the confidence level.
 */
function correlateAndBoostFindings(findings: NormalizedFinding[]): NormalizedFinding[] {
  const mergedMap = new Map<string, { finding: NormalizedFinding; providersSeen: Set<string> }>();
  
  for (const f of findings) {
    // Key by URL if available, otherwise by title
    const key = f.url ? f.url.toLowerCase().trim() : `${f.category}:${f.title}`.toLowerCase().trim();
    const existing = mergedMap.get(key);
    
    if (existing) {
      existing.providersSeen.add(f.provider);
      // Merge description/details and use highest confidence as base
      const mergedDescription = existing.finding.description.includes(f.description) 
        ? existing.finding.description 
        : `${existing.finding.description} Also confirmed by ${f.provider}.`;
      
      existing.finding = {
        ...existing.finding,
        description: mergedDescription,
        confidence: Math.max(existing.finding.confidence, f.confidence),
        timestamp: new Date().toISOString(),
      };
    } else {
      mergedMap.set(key, {
        finding: { ...f },
        providersSeen: new Set([f.provider])
      });
    }
  }
  
  // Apply boosting factors
  const finalFindings: NormalizedFinding[] = [];
  for (const val of mergedMap.values()) {
    const providersCount = val.providersSeen.size;
    let finalConfidence = val.finding.confidence;
    
    const hasEpieos = val.providersSeen.has("Epieos");
    const hasOtherPrimary = Array.from(val.providersSeen).some(p => 
      ["sherlock", "maigret", "holehe", "phoneinfoga", "search_intel"].includes(p)
    );

    if (hasEpieos && hasOtherPrimary) {
      finalConfidence = Math.min(0.98, finalConfidence + 0.20);
      val.finding.description += ` [Corroborated by Epieos External Intelligence and primary providers - CONFIDENCE BOOSTED]`;
    } else if (providersCount === 2) {
      finalConfidence = Math.min(1.0, finalConfidence + 0.15);
      val.finding.description += ` [Corroborated by 2 independent providers]`;
    } else if (providersCount >= 3) {
      finalConfidence = 0.98; // high confidence
      val.finding.description += ` [Corroborated by ${providersCount} independent providers - HIGH CONFIDENCE]`;
    }
    
    val.finding.confidence = finalConfidence;
    finalFindings.push(val.finding);
  }
  
  return finalFindings;
}
