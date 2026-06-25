/**
 * Confidence Scorer — SOCMINT Shield
 *
 * Unified confidence scoring engine used by all investigation modules.
 * Returns structured confidence levels with justification.
 */

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceScore {
  level: ConfidenceLevel;
  score: number;       // 0-100
  factors: string[];   // human-readable justifications
  insufficientEvidence: boolean;
  note: string;
}

interface ScoringFactors {
  /** Direct API / official source (GitHub, HIBP, etc.) */
  officialSource?: boolean;
  /** Exact string match vs fuzzy/partial */
  exactMatch?: boolean;
  /** Number of corroborating independent sources */
  corroborationCount?: number;
  /** Is the source a well-known aggregator (vs first-party)? */
  isAggregator?: boolean;
  /** Is evidence fresh (within 30 days)? */
  isFresh?: boolean;
  /** Does the evidence directly name/reference the subject? */
  directReference?: boolean;
  /** Is there high ambiguity (many results, all weak)? */
  highAmbiguity?: boolean;
  /** Stylometric confidence level */
  stylometryConfidence?: "exploratory" | "weak" | "moderate" | "strong";
  /** Content risk confidence */
  contentRiskConfidence?: "high" | "medium" | "low";
  /** Evidence came from manual analyst ingest */
  manualIngest?: boolean;
}

/**
 * Compute a unified confidence score from named factors.
 * Returns "insufficient evidence" if score is below threshold.
 */
export function computeConfidence(factors: ScoringFactors): ConfidenceScore {
  let score = 40; // baseline
  const justifications: string[] = [];

  if (factors.officialSource) {
    score += 30;
    justifications.push("Data from official API / primary source");
  }
  if (factors.exactMatch) {
    score += 20;
    justifications.push("Exact identifier match");
  } else {
    score -= 10;
    justifications.push("Fuzzy or partial match only");
  }
  if (factors.corroborationCount && factors.corroborationCount > 1) {
    const corrobBonus = Math.min(20, factors.corroborationCount * 5);
    score += corrobBonus;
    justifications.push(`Corroborated by ${factors.corroborationCount} independent sources`);
  }
  if (factors.isAggregator) {
    score -= 10;
    justifications.push("Source is an aggregator, not first-party");
  }
  if (factors.isFresh === true) {
    score += 5;
    justifications.push("Evidence is recent (within 30 days)");
  } else if (factors.isFresh === false) {
    score -= 5;
    justifications.push("Evidence may be stale");
  }
  if (factors.directReference) {
    score += 15;
    justifications.push("Evidence directly references the subject");
  }
  if (factors.highAmbiguity) {
    score -= 20;
    justifications.push("High ambiguity — many weak matches, no clear attribution");
  }
  if (factors.stylometryConfidence) {
    const styleBonus: Record<string, number> = {
      exploratory: -5, weak: 0, moderate: 10, strong: 20
    };
    score += styleBonus[factors.stylometryConfidence] ?? 0;
    justifications.push(`Stylometric evidence: ${factors.stylometryConfidence}`);
  }
  if (factors.contentRiskConfidence) {
    const riskBonus: Record<string, number> = { high: 10, medium: 0, low: -5 };
    score += riskBonus[factors.contentRiskConfidence] ?? 0;
    justifications.push(`Content risk analysis confidence: ${factors.contentRiskConfidence}`);
  }
  if (factors.manualIngest) {
    score += 5;
    justifications.push("Evidence manually ingested by analyst");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const insufficientEvidence = finalScore < 30;

  let level: ConfidenceLevel;
  if (finalScore >= 70) level = "high";
  else if (finalScore >= 45) level = "medium";
  else level = "low";

  const note = insufficientEvidence
    ? "Insufficient evidence to draw conclusions. Additional sources or manual verification required."
    : level === "high"
    ? "Strong evidence basis. Attribution is well-supported by multiple independent signals."
    : level === "medium"
    ? "Moderate evidence. Treat as probable but verify before acting on this signal."
    : "Weak evidence. Use only as an exploratory lead — do not treat as confirmed.";

  return { level, score: finalScore, factors: justifications, insufficientEvidence, note };
}

/**
 * Translate a 0-100 numeric confidence score (from existing risk engine)
 * into the unified ConfidenceLevel type.
 */
export function numericToLevel(score: number): ConfidenceLevel {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/**
 * Convert a string confidence level from existing types to canonical level.
 */
export function normaliseConfidenceString(
  raw: "CONFIRMED" | "PROBABLE" | "POSSIBLE" | string | undefined
): ConfidenceLevel {
  if (raw === "CONFIRMED") return "high";
  if (raw === "PROBABLE") return "medium";
  return "low";
}
