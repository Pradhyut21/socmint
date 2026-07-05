/**
 * Builds a rich, structured evidence context string from a SuspectProfile to
 * be injected into AI prompts. Both the NEXUS analysis route and the AI Chat
 * route should use this so the AI always has the full investigation picture.
 */
import type { SuspectProfile } from "../types";

export function buildProfileContext(profile: SuspectProfile): string {
  const p = profile;

  // ── Subject identity ────────────────────────────────────────────────────────
  const identity = [
    `Real Name: ${p.realName || "Unknown"}`,
    `Primary Handle: @${(p.username || "").replace(/^@/, "")}`,
    p.emailAddress && p.emailAddress !== "Not provided" ? `Email: ${p.emailAddress}` : null,
    p.phoneNumber && p.phoneNumber !== "Not provided" ? `Phone: ${p.phoneNumber}` : null,
    `Risk Level: ${p.riskLevel} (score: ${p.riskScore}/100)`,
    p.riskSignals?.length ? `Risk Signals: ${p.riskSignals.join("; ")}` : null,
  ].filter(Boolean).join("\n");

  // ── Discovered accounts ─────────────────────────────────────────────────────
  const accounts = (p.accounts || []).map((a: any) => {
    const parts = [
      `  Platform: ${a.platform.toUpperCase()}`,
      `  Handle: @${a.username}`,
      `  Confidence: ${a.confidence} (${a.confidenceScore ?? "?"}%)`,
      a.displayName && a.displayName !== a.username ? `  Display Name: ${a.displayName}` : null,
      a.bio && !/^Handle registered|^Public .* profile|^Discovered via|^Threads profile/i.test(a.bio)
        ? `  Bio: ${a.bio.slice(0, 200)}`
        : null,
      a.followers ? `  Followers: ${a.followers}` : null,
      a.location ? `  Location: ${a.location}` : null,
      a.headline ? `  Headline: ${a.headline}` : null,
      a.company ? `  Company: ${a.company}` : null,
      a.education ? `  Education: ${a.education}` : null,
      a.creationDate ? `  Joined: ${a.creationDate}` : null,
      a.profileUrl ? `  URL: ${a.profileUrl}` : null,
      a.reason ? `  Detection: ${a.reason.slice(0, 120)}` : null,
    ].filter(Boolean).join("\n");
    return `- ${a.platform.toUpperCase()} @${a.username}:\n${parts}`;
  }).join("\n\n");

  // ── Locations ───────────────────────────────────────────────────────────────
  const locations = (p.locations || [])
    .map((l: any) => `  ${l.locationName} (${l.source}, ${l.date})`)
    .join("\n");

  // ── Posts / Activity (up to 15 most recent) ─────────────────────────────────
  const posts = (p.posts || [])
    .filter((post: any) => post.content && !post.content.startsWith("Professional Experience:") && !post.content.startsWith("Academic Credential:"))
    .slice(0, 15)
    .map((post: any) => `  [${post.platform?.toUpperCase() || "?"}] ${post.content?.slice(0, 200)}${post.flagLevel && post.flagLevel !== "NORMAL" ? ` ⚠ ${post.flagLevel}` : ""}`)
    .join("\n");

  // ── Identity correlation (same-individual analysis) ─────────────────────────
  let correlationSummary = "";
  if (p.identityCorrelation) {
    const c = p.identityCorrelation;
    correlationSummary = [
      `Summary: ${c.summary}`,
      c.photoClusters?.length ? `Photo Clusters: ${c.photoClusters.length} group(s) of accounts share the same profile photo` : null,
      c.declaredLinks?.length
        ? `Self-Declared Cross-Links:\n${c.declaredLinks.slice(0, 8).map((d: any) => `  ${d.fromPlatform} bio → ${d.link.platform || ""} @${d.link.handle || d.link.url || ""}`).join("\n")}`
        : null,
      c.correlations?.length
        ? `Per-Account Linkage Scores:\n${c.correlations.map((cr: any) => `  ${cr.platform} @${cr.username}: ${cr.linkScore}% (${cr.evidence?.map((e: any) => e.signal).join(", ") || "no signals"})`).join("\n")}`
        : null,
    ].filter(Boolean).join("\n");
  }

  // ── Keybase cryptographic proof ─────────────────────────────────────────────
  let keybaseInfo = "";
  if ((p as any).keybase?.found) {
    const kb = (p as any).keybase;
    keybaseInfo = [
      `Keybase Username: @${kb.keybaseUsername}`,
      kb.linkedAccounts?.length
        ? `Cryptographically Verified Accounts:\n${kb.linkedAccounts.map((a: any) => `  ${a.platform}: @${a.username}`).join("\n")}`
        : null,
      kb.websites?.length ? `Verified Websites: ${kb.websites.join(", ")}` : null,
    ].filter(Boolean).join("\n");
  }

  // ── Legal records ────────────────────────────────────────────────────────────
  const legal = (p.legalRecords || [])
    .map((l: any) => `  ${l.type || "Record"}: ${l.title || l.summary || ""} — ${l.source || ""}`)
    .join("\n");

  // ── Breach data ──────────────────────────────────────────────────────────────
  let breachInfo = "";
  if (p.hibpResult?.breaches?.length) {
    breachInfo = p.hibpResult.breaches
      .map((b: any) => `  ${b.name} (${b.breachDate}): ${b.dataClasses?.join(", ")}`)
      .join("\n");
  } else if (p.hibpResult?.status === "NOT_CONFIGURED") {
    breachInfo = "  HIBP not configured — breach check not performed.";
  } else {
    breachInfo = "  No breaches detected.";
  }

  // ── Shadow accounts ──────────────────────────────────────────────────────────
  const shadow = (p.shadowAccounts || [])
    .map((s: any) => `  ${s.platform} @${s.handle}: ${s.confidenceLevel || s.overallConfidence || "?"} confidence — ${s.signals?.join("; ") || ""}`)
    .join("\n");

  // ── Dark web pastes ──────────────────────────────────────────────────────────
  const darkweb = (p.darkWebPastes || [])
    .map((d: any) => `  [${d.platform}] ${d.title}: ${d.snippet?.slice(0, 150)} (${d.riskTag})`)
    .join("\n");

  // ── Alias results ────────────────────────────────────────────────────────────
  const aliases = (p.aliasResults || [])
    .map((a: any) => `  @${a.username} (${a.platform}): ${a.confidenceLevel}`)
    .join("\n");

  // ── Investigation quality ────────────────────────────────────────────────────
  const quality = p.investigationQuality
    ? `Score: ${p.investigationQuality.score}%, Platforms: ${p.investigationQuality.breakdown?.responded}/${p.investigationQuality.breakdown?.searched} resolved, Correlation: ${p.investigationQuality.breakdown?.correlationStrength}%`
    : null;

  // ── Assemble ─────────────────────────────────────────────────────────────────
  return [
    "=== SUBJECT IDENTITY ===",
    identity,
    "",
    "=== DISCOVERED ACCOUNTS ===",
    accounts || "None discovered.",
    "",
    locations ? `=== LOCATIONS ===\n${locations}\n` : null,
    posts ? `=== RECENT ACTIVITY (posts / commits) ===\n${posts}\n` : null,
    correlationSummary ? `=== IDENTITY CORRELATION ANALYSIS ===\n${correlationSummary}\n` : null,
    keybaseInfo ? `=== KEYBASE CRYPTOGRAPHIC PROOF ===\n${keybaseInfo}\n` : null,
    aliases ? `=== ALIAS CANDIDATES ===\n${aliases}\n` : null,
    shadow ? `=== SHADOW / BACKUP ACCOUNTS ===\n${shadow}\n` : null,
    darkweb ? `=== DARK WEB PASTES ===\n${darkweb}\n` : null,
    legal ? `=== LEGAL RECORDS ===\n${legal}\n` : null,
    `=== BREACH DATA ===\n${breachInfo}\n`,
    quality ? `=== INVESTIGATION QUALITY ===\n${quality}\n` : null,
    `Case Reference: ${p.caseReference}`,
    `Captured At: ${p.capturedAt}`,
  ].filter(Boolean).join("\n");
}
