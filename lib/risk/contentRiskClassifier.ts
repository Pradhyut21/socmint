/**
 * Content Risk Classifier — SOCMINT Shield
 *
 * Analyzes public text (posts, captions, comments, Telegram messages) for:
 * - Violence / threats
 * - Harassment / abuse
 * - Scam / fraud cues
 * - Mobilization / incitement
 * - Hate speech / communal cues
 *
 * This is an ANALYST TRIAGE AID — not a legal determination.
 * All results include confidence + explanation + caution note.
 */

import type { ContentRiskResult } from "../types";

// ── Risk lexicons ───────────────────────────────────────────────────────────

const VIOLENCE_TERMS = [
  "kill", "murder", "attack", "bomb", "shoot", "stab", "beat", "assault",
  "destroy", "burn", "slash", "eliminate", "execute", "hurt", "harm",
  "dead", "death", "bloodshed", "riot", "mob", "lynch", "thrash",
  "behead", "kidnap", "rape", "maim", "torture",
  // Hindi/Hinglish transliterations
  "maar dalo", "khatam karo", "jalao", "maro", "chhod mat",
];

const HARASSMENT_TERMS = [
  "stalk", "follow you", "watch you", "i know where you live", "find you",
  "expose", "dox", "leak your", "your address", "hack your",
  "ruin you", "destroy your reputation", "defame", "blackmail",
  "threatening", "you will regret", "pay for this",
];

const SCAM_FRAUD_TERMS = [
  "otp", "kyc update", "account suspended", "click here to verify",
  "send money", "urgent transfer", "lottery winner", "prize claim",
  "advance fee", "investment returns", "crypto doubler", "guaranteed profit",
  "upi transfer now", "share your pin", "your card blocked",
  "government refund", "income tax notice", "police complaint fake",
  "sim swap", "call forwarding", "screen share",
];

const MOBILISATION_TERMS = [
  "gather at", "meet at", "come together", "march to", "assemble",
  "protest now", "block the road", "shut down", "bandh", "hartal",
  "forward this", "share urgently", "spread this", "go viral",
  "tag everyone", "wake up people", "rise up", "revolution",
  "join us now", "take action today", "storm the",
];

const HATE_SPEECH_TERMS = [
  "communal", "religious violence", "jihad war", "crusade against",
  "they are invaders", "ethnic cleansing", "religious mob",
  "against our community", "wipe them out", "outsiders must go",
  "refugees go back", "foreigners out",
];

// ── Scoring helpers ─────────────────────────────────────────────────────────

function scoreTerms(text: string, terms: string[]): { score: number; matched: string[] } {
  const lower = text.toLowerCase();
  const matched = terms.filter(t => lower.includes(t));
  const raw = Math.min(100, matched.length * 18 + (matched.length > 0 ? 15 : 0));
  return { score: raw, matched };
}

function riskLevelFromScore(score: number): ContentRiskResult["riskLevel"] {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

function confidenceFromTextLength(text: string): ContentRiskResult["confidence"] {
  const words = text.trim().split(/\s+/).length;
  if (words >= 50) return "high";
  if (words >= 15) return "medium";
  return "low";
}

// ── Main classifier ─────────────────────────────────────────────────────────

/**
 * Run a fast local heuristic content risk analysis on public text.
 * No external API calls — instant, deterministic, explainable.
 */
export function classifyContentRisk(opts: {
  text: string;
  platform?: string | null;
  authorHandle?: string | null;
  useNimEnhanced?: boolean;  // placeholder for future NIM integration
}): ContentRiskResult {
  const { text, platform = null, authorHandle = null } = opts;
  const analysedAt = new Date().toISOString();

  if (!text || text.trim().length === 0) {
    return {
      inputText: text,
      platform,
      authorHandle,
      analysedAt,
      scores: { violence: 0, harassment: 0, scamFraud: 0, mobilisation: 0, hateSpeech: 0, overall: 0 },
      riskLevel: "LOW",
      confidence: "low",
      triggeringPhrases: [],
      explanation: "No text provided for analysis.",
      analystCaution: "Empty input — no risk signals extracted.",
      nimEnhanced: false,
    };
  }

  const violence = scoreTerms(text, VIOLENCE_TERMS);
  const harassment = scoreTerms(text, HARASSMENT_TERMS);
  const scamFraud = scoreTerms(text, SCAM_FRAUD_TERMS);
  const mobilisation = scoreTerms(text, MOBILISATION_TERMS);
  const hateSpeech = scoreTerms(text, HATE_SPEECH_TERMS);

  const overall = Math.min(100, Math.round(
    violence.score * 0.30 +
    harassment.score * 0.20 +
    scamFraud.score * 0.25 +
    mobilisation.score * 0.15 +
    hateSpeech.score * 0.10
  ));

  const allMatched = [
    ...violence.matched,
    ...harassment.matched,
    ...scamFraud.matched,
    ...mobilisation.matched,
    ...hateSpeech.matched,
  ];
  const triggeringPhrases = [...new Set(allMatched)].slice(0, 8);

  const riskLevel = riskLevelFromScore(overall);
  const confidence = confidenceFromTextLength(text);

  // Build plain-English explanation
  const explanationParts: string[] = [];
  if (violence.score > 0) explanationParts.push(`Violence/threat cues detected (score: ${violence.score})`);
  if (harassment.score > 0) explanationParts.push(`Harassment/targeting language detected (score: ${harassment.score})`);
  if (scamFraud.score > 0) explanationParts.push(`Scam/fraud language detected (score: ${scamFraud.score})`);
  if (mobilisation.score > 0) explanationParts.push(`Mobilisation/coordination language detected (score: ${mobilisation.score})`);
  if (hateSpeech.score > 0) explanationParts.push(`Hate/communal speech cues detected (score: ${hateSpeech.score})`);

  const explanation = explanationParts.length > 0
    ? explanationParts.join(". ") + "."
    : "No significant risk signals detected in this text sample.";

  return {
    inputText: text.slice(0, 2000), // cap stored text
    platform,
    authorHandle,
    analysedAt,
    scores: {
      violence: violence.score,
      harassment: harassment.score,
      scamFraud: scamFraud.score,
      mobilisation: mobilisation.score,
      hateSpeech: hateSpeech.score,
      overall,
    },
    riskLevel,
    confidence,
    triggeringPhrases,
    explanation,
    analystCaution:
      "This analysis is an automated triage aid based on keyword heuristics. " +
      "It is NOT a legal determination. False positives and negatives are possible. " +
      "An authorized investigator must review all flagged content before any action is taken. " +
      "Context, intent, and jurisdiction must be assessed by a qualified officer.",
    nimEnhanced: false,
  };
}

/**
 * Enhance a heuristic result with NIM LLM deeper analysis.
 * Called optionally when the base score is MEDIUM or above.
 */
export async function enhanceWithNim(
  base: ContentRiskResult,
  apiKey: string,
  model: string
): Promise<ContentRiskResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const prompt = `You are a content safety analyst. Analyze this public social media post for risk signals.

Text: "${base.inputText.slice(0, 800)}"

Rate each dimension 0-100:
- Violence/threat to persons or property
- Harassment/targeted abuse
- Scam/fraud (urgency, fake prizes, OTP requests)
- Mobilisation/coordination for illegal activity
- Hate speech/communal incitement

Identify the 3 most dangerous phrases.
Write a 2-sentence plain-English explanation.

Return ONLY JSON:
{
  "violence": number,
  "harassment": number,
  "scamFraud": number,
  "mobilisation": number,
  "hateSpeech": number,
  "triggeringPhrases": ["string"],
  "explanation": "string"
}`;

    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a content safety classifier. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);
    if (!resp.ok) return base;

    const data = await resp.json();
    const raw = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    const nimScores = {
      violence: Number(raw.violence ?? base.scores.violence),
      harassment: Number(raw.harassment ?? base.scores.harassment),
      scamFraud: Number(raw.scamFraud ?? base.scores.scamFraud),
      mobilisation: Number(raw.mobilisation ?? base.scores.mobilisation),
      hateSpeech: Number(raw.hateSpeech ?? base.scores.hateSpeech),
      overall: 0,
    };
    nimScores.overall = Math.min(100, Math.round(
      nimScores.violence * 0.30 + nimScores.harassment * 0.20 +
      nimScores.scamFraud * 0.25 + nimScores.mobilisation * 0.15 + nimScores.hateSpeech * 0.10
    ));

    return {
      ...base,
      scores: nimScores,
      riskLevel: riskLevelFromScore(nimScores.overall),
      triggeringPhrases: Array.isArray(raw.triggeringPhrases)
        ? raw.triggeringPhrases.slice(0, 6)
        : base.triggeringPhrases,
      explanation: raw.explanation || base.explanation,
      nimEnhanced: true,
    };
  } catch {
    return base;
  }
}
