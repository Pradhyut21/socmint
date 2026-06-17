import { NextRequest, NextResponse } from "next/server";
import { investigatePublicSubject, investigateMultiField } from "../../../lib/liveSocmint";
import { DossierInput } from "../../../lib/types";
import { checkRateLimit } from "../../../lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const type = typeof body.type === "string" ? body.type : "username";

    // Multi-field dossier mode
    if (type === "dossier" && body.dossier) {
      const dossier: DossierInput = {
        usernames: Array.isArray(body.dossier.usernames) ? body.dossier.usernames : [],
        realName: typeof body.dossier.realName === "string" ? body.dossier.realName : "",
        email: typeof body.dossier.email === "string" ? body.dossier.email : "",
        phone: typeof body.dossier.phone === "string" ? body.dossier.phone : "",
        faceData: typeof body.dossier.faceData === "string" ? body.dossier.faceData : "",
      };

      // Validate that at least one field has data
      const hasData = dossier.usernames.some(u => u.trim().length > 0)
        || dossier.realName.trim().length > 0
        || dossier.email.trim().length > 0
        || dossier.phone.trim().length > 0
        || dossier.faceData.length > 0;

      if (!hasData) {
        return NextResponse.json({ error: "At least one field is required for dossier investigation." }, { status: 400 });
      }

      const profile = await investigateMultiField(dossier);
      return NextResponse.json({
        profile,
        acquiredAt: new Date().toISOString(),
        mode: "multi-field-dossier",
      });
    }

    // Standard single-field mode
    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const profile = await investigatePublicSubject(query, type);
    return NextResponse.json({
      profile,
      acquiredAt: new Date().toISOString(),
      mode: "live-public-osint",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Live investigation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
