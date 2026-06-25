/**
 * /api/evidence
 *
 * Server-side evidence artifact management.
 * Uses in-memory store (per-process) for hackathon/demo scope.
 * A future production deployment would swap this for a database.
 *
 * POST   /api/evidence          → pin/create a new evidence artifact
 * GET    /api/evidence?case=REF → retrieve artifacts for a case
 * DELETE /api/evidence?id=ID    → remove a specific artifact
 */

import { NextRequest, NextResponse } from "next/server";
import type { EvidenceArtifact } from "@/lib/types";

export const runtime = "nodejs";

// ── In-memory store (demo scope) ────────────────────────────────────────────
// In production, replace with a DB write.
const store = new Map<string, EvidenceArtifact>();

async function sha256hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── POST — create evidence artifact ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: Omit<EvidenceArtifact, "id" | "retrievedAt" | "sha256"> & {
      id?: string;
      retrievedAt?: string;
      sha256?: string;
    } = await req.json();

    if (!body.caseReference || !body.textSnapshot || !body.title) {
      return NextResponse.json(
        { error: "caseReference, title, and textSnapshot are required." },
        { status: 400 }
      );
    }

    const id = body.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sha256 = body.sha256 || await sha256hex(body.textSnapshot);

    const artifact: EvidenceArtifact = {
      id,
      caseReference: body.caseReference,
      sourcePlatform: body.sourcePlatform || "unknown",
      sourceUrl: body.sourceUrl || null,
      retrievedAt: body.retrievedAt || new Date().toISOString(),
      query: body.query || "",
      title: body.title,
      textSnapshot: body.textSnapshot.slice(0, 5000),
      metadataSnapshot: body.metadataSnapshot || {},
      sha256,
      screenshotPath: body.screenshotPath,
      analystNotes: body.analystNotes,
      tags: body.tags || [],
      provenance: body.provenance || "api",
    };

    store.set(id, artifact);

    return NextResponse.json({ artifact }, { status: 201 });

  } catch (err) {
    console.error("[evidence POST] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create evidence artifact." },
      { status: 500 }
    );
  }
}

// ── GET — retrieve artifacts by case reference ───────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const caseRef = searchParams.get("case");
  const artifactId = searchParams.get("id");

  if (artifactId) {
    const artifact = store.get(artifactId);
    if (!artifact) {
      return NextResponse.json({ error: "Evidence artifact not found." }, { status: 404 });
    }
    return NextResponse.json({ artifact });
  }

  if (!caseRef) {
    return NextResponse.json(
      { error: "Provide ?case=CASE_REFERENCE or ?id=ARTIFACT_ID query parameter." },
      { status: 400 }
    );
  }

  const artifacts = [...store.values()]
    .filter(a => a.caseReference === caseRef)
    .sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt));

  return NextResponse.json({ artifacts, count: artifacts.length });
}

// ── DELETE — remove an artifact ──────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Provide ?id=ARTIFACT_ID to delete." }, { status: 400 });
  }

  if (!store.has(id)) {
    return NextResponse.json({ error: "Evidence artifact not found." }, { status: 404 });
  }

  store.delete(id);
  return NextResponse.json({ success: true, id });
}
