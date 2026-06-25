/**
 * Evidence Capture Service — SOCMINT Shield
 *
 * Manages pinned / captured evidence artifacts (EvidenceArtifact objects).
 * Provides SHA-256 hashing, localStorage persistence, and JSON export.
 * This is the client-side layer. For server-side persistence, use
 * the /api/evidence route which wraps this in an API boundary.
 */

import type { EvidenceArtifact, SuspectProfile, Post, LegalRecord, PlatformAccount } from "../types";

/** Key under which artifacts are stored in localStorage */
const STORAGE_KEY = "socmint_evidence_artifacts";

// ── SHA-256 hashing ─────────────────────────────────────────────────────────

export async function sha256hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── CRUD operations (localStorage) ─────────────────────────────────────────

function loadAll(): EvidenceArtifact[] {
  try {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(artifacts: EvidenceArtifact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
}

export function getAllArtifacts(): EvidenceArtifact[] {
  return loadAll();
}

export function getArtifactsByCaseRef(caseReference: string): EvidenceArtifact[] {
  return loadAll().filter(a => a.caseReference === caseReference);
}

export function getArtifactById(id: string): EvidenceArtifact | undefined {
  return loadAll().find(a => a.id === id);
}

export async function pinEvidence(opts: {
  caseReference: string;
  sourcePlatform: string;
  sourceUrl: string | null;
  query: string;
  title: string;
  textSnapshot: string;
  metadataSnapshot?: Record<string, unknown>;
  screenshotPath?: string;
  analystNotes?: string;
  tags?: string[];
  provenance?: string;
}): Promise<EvidenceArtifact> {
  const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sha256 = await sha256hex(opts.textSnapshot);

  const artifact: EvidenceArtifact = {
    id,
    caseReference: opts.caseReference,
    sourcePlatform: opts.sourcePlatform,
    sourceUrl: opts.sourceUrl,
    retrievedAt: new Date().toISOString(),
    query: opts.query,
    title: opts.title,
    textSnapshot: opts.textSnapshot.slice(0, 5000),  // cap stored text
    metadataSnapshot: opts.metadataSnapshot ?? {},
    sha256,
    screenshotPath: opts.screenshotPath,
    analystNotes: opts.analystNotes,
    tags: opts.tags ?? [],
    provenance: opts.provenance ?? "manual",
  };

  const all = loadAll();
  all.unshift(artifact);
  saveAll(all.slice(0, 500));  // keep at most 500 artifacts

  return artifact;
}

export function updateArtifactNotes(id: string, notes: string): boolean {
  const all = loadAll();
  const idx = all.findIndex(a => a.id === id);
  if (idx === -1) return false;
  all[idx] = { ...all[idx], analystNotes: notes };
  saveAll(all);
  return true;
}

export function removeArtifact(id: string): boolean {
  const all = loadAll();
  const filtered = all.filter(a => a.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

// ── Export helpers ──────────────────────────────────────────────────────────

export function exportArtifactsAsJson(caseReference: string): string {
  const artifacts = getArtifactsByCaseRef(caseReference);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    caseReference,
    count: artifacts.length,
    artifacts,
  }, null, 2);
}

// ── Pin helpers for common investigation results ─────────────────────────────

export async function pinPost(
  profile: SuspectProfile,
  post: Post,
  notes?: string
): Promise<EvidenceArtifact> {
  return pinEvidence({
    caseReference: profile.caseReference,
    sourcePlatform: post.platform,
    sourceUrl: null,
    query: profile.username,
    title: `${post.platform.toUpperCase()} post by ${profile.realName}`,
    textSnapshot: post.content,
    metadataSnapshot: {
      postedAt: post.postedAt || post.timestamp,
      flagLevel: post.flagLevel,
      flagReason: post.flagReason,
      engagement: post.engagement,
    },
    analystNotes: notes,
    tags: (post.flagLevel && post.flagLevel !== "NORMAL") ? ["flagged", post.flagLevel.toLowerCase()] : [],
    provenance: "post_capture",
  });
}

export async function pinLegalRecord(
  profile: SuspectProfile,
  record: LegalRecord,
  notes?: string
): Promise<EvidenceArtifact> {
  return pinEvidence({
    caseReference: profile.caseReference,
    sourcePlatform: record.source || "Legal Database",
    sourceUrl: record.url || record.sourceUrl || null,
    query: profile.realName,
    title: record.title,
    textSnapshot: record.summary || record.title,
    metadataSnapshot: {
      recordType: record.recordType,
      status: record.status,
      date: record.date,
      court: record.court,
    },
    analystNotes: notes,
    tags: ["legal", (record.recordType || "record").toLowerCase().replace(/\s+/g, "-")],
    provenance: "indian_kanoon",
  });
}

export async function pinAccount(
  profile: SuspectProfile,
  account: PlatformAccount,
  notes?: string
): Promise<EvidenceArtifact> {
  return pinEvidence({
    caseReference: profile.caseReference,
    sourcePlatform: account.platform,
    sourceUrl: account.profileUrl || account.url || null,
    query: profile.username,
    title: `${account.platform.toUpperCase()} — @${account.username}`,
    textSnapshot: `${account.displayName || ""} | ${account.bio || ""}`.trim(),
    metadataSnapshot: {
      followers: account.followers,
      creationDate: account.creationDate,
      confidence: account.confidence,
    },
    analystNotes: notes,
    tags: ["account", account.platform, account.confidence?.toLowerCase() ?? ""],
    provenance: "platform_probe",
  });
}
