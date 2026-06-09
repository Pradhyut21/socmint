import { NextRequest, NextResponse } from "next/server";
import { investigatePublicSubject } from "../../../lib/liveSocmint";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const type = typeof body.type === "string" ? body.type : "username";

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
