/**
 * Evidence Normalizer — SOCMINT Shield
 *
 * Converts raw provider results into the shared NormalizedEvidence schema.
 * All new investigation modules should route output through this normalizer.
 */

import type { NormalizedEvidence, LegalRecord, PlatformAccount, Post } from "../types";

/**
 * Normalize a LegalRecord (Indian Kanoon / MCA result) into NormalizedEvidence.
 */
export function normalizeLegalRecord(
  record: LegalRecord,
  query: string
): NormalizedEvidence {
  return {
    provider: record.source || "Indian Kanoon",
    platform: null,
    entity_type: "domain",
    query,
    title: record.title,
    snippet: record.summary || "",
    url: record.url || record.sourceUrl || null,
    source_type: "legal_source",
    confidence: record.credibilityLevel === "HIGH" ? "high" : record.credibilityLevel === "MEDIUM" ? "medium" : "low",
    metadata: {
      recordType: record.recordType,
      status: record.status,
      date: record.date,
      court: record.court,
      severity: record.severity,
    },
  };
}

/**
 * Normalize a PlatformAccount into NormalizedEvidence.
 */
export function normalizePlatformAccount(
  account: PlatformAccount,
  query: string
): NormalizedEvidence {
  return {
    provider: account.platform,
    platform: account.platform,
    entity_type: "social_profile",
    query,
    title: account.displayName || account.username,
    snippet: account.bio || "",
    url: account.profileUrl || account.url || null,
    source_type: "public_social_profile",
    confidence:
      account.confidence === "CONFIRMED" ? "high" :
      account.confidence === "PROBABLE" ? "medium" : "low",
    metadata: {
      followers: account.followers,
      creationDate: account.creationDate,
      tier: account.tier,
      reason: account.reason,
      capturedAt: account.capturedAt,
    },
  };
}

/**
 * Normalize a Post into NormalizedEvidence.
 */
export function normalizePost(post: Post, query: string): NormalizedEvidence {
  return {
    provider: post.platform,
    platform: post.platform,
    entity_type: "post",
    query,
    title: `${post.platform} post`,
    snippet: post.content.slice(0, 300),
    url: null,
    source_type: "post_capture",
    confidence: post.flagLevel === "HIGH_RISK" ? "high" : post.flagLevel === "SUSPICIOUS" ? "medium" : "low",
    metadata: {
      postedAt: post.postedAt || post.timestamp,
      flagLevel: post.flagLevel,
      flagReason: post.flagReason,
      engagement: post.engagement,
      capturedAt: post.capturedAt,
    },
  };
}

/**
 * Normalize a free-form search result snippet into NormalizedEvidence.
 */
export function normalizeSearchResult(opts: {
  provider: string;
  platform: string | null;
  query: string;
  title: string;
  snippet: string;
  url: string | null;
  sourceType?: NormalizedEvidence["source_type"];
  entityType?: NormalizedEvidence["entity_type"];
  confidence?: NormalizedEvidence["confidence"];
  metadata?: Record<string, unknown>;
}): NormalizedEvidence {
  return {
    provider: opts.provider,
    platform: opts.platform,
    entity_type: opts.entityType ?? "other" as any,
    query: opts.query,
    title: opts.title,
    snippet: opts.snippet,
    url: opts.url,
    source_type: opts.sourceType ?? "other",
    confidence: opts.confidence ?? "low",
    metadata: opts.metadata ?? {},
  };
}

/**
 * Deduplicate a list of NormalizedEvidence by (url OR title) to avoid
 * repeated entries from multiple providers.
 */
export function deduplicateEvidence(items: NormalizedEvidence[]): NormalizedEvidence[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.url || item.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Sort evidence by confidence level (high → medium → low).
 */
export function sortByConfidence(items: NormalizedEvidence[]): NormalizedEvidence[] {
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => (order[a.confidence] ?? 2) - (order[b.confidence] ?? 2));
}
