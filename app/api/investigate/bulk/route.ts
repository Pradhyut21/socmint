/**
 * Bulk Investigation API
 *
 * POST /api/investigate/bulk
 * Body: { items: { query: string; type: string }[] }
 * Response: { results: BulkResult[] }
 *
 * Runs up to 5 investigations in parallel (Promise.allSettled).
 * Returns full profile for hits, minimal error for failures.
 */

import { NextRequest, NextResponse } from "next/server";
import { investigatePublicSubject } from "../../../../lib/liveSocmint";
import { checkRateLimit } from "../../../../lib/rateLimit";

export const runtime = "nodejs";

export interface BulkItem {
  query: string;
  type: string;
}

export interface BulkResult {
  query: string;
  type: string;
  status: "success" | "error";
  riskLevel?: string;
  riskScore?: number;
  realName?: string;
  caseReference?: string;
  accountCount?: number;
  confidence?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const items: BulkItem[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No items provided." }, { status: 400 });
    }
    if (items.length > 20) {
      return NextResponse.json({ error: "Maximum 20 items per bulk request." }, { status: 400 });
    }

    const githubToken = request.headers.get("x-github-token") || undefined;

    // Process in batches of 5 to avoid overwhelming downstream APIs
    const results: BulkResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map(item =>
          investigatePublicSubject(item.query.trim(), item.type, githubToken)
        )
      );

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const outcome = settled[j];

        if (outcome.status === "fulfilled") {
          const p = outcome.value;
          results.push({
            query: item.query,
            type: item.type,
            status: "success",
            riskLevel: p.riskLevel,
            riskScore: p.riskScore,
            realName: p.realName,
            caseReference: p.caseReference,
            accountCount: p.accounts?.length || 0,
            confidence: p.investigationQuality?.score,
          });
        } else {
          results.push({
            query: item.query,
            type: item.type,
            status: "error",
            error: outcome.reason instanceof Error
              ? outcome.reason.message
              : "Investigation failed.",
          });
        }
      }
    }

    return NextResponse.json({
      results,
      totalProcessed: results.length,
      successCount: results.filter(r => r.status === "success").length,
      errorCount:   results.filter(r => r.status === "error").length,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Bulk investigation failed.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
