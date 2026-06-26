import { NextRequest, NextResponse } from "next/server";
import { searchGoogleLive } from "../../../lib/search/searchIntel";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const queryId = typeof body.queryId === "string" ? body.queryId.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "custom";

    if (!query) {
      return NextResponse.json({ error: "Query string is required for Search Intel lookup." }, { status: 400 });
    }

    const results = await searchGoogleLive(query, queryId, category);

    return NextResponse.json({
      success: true,
      results,
      executedAt: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "On-demand Search Intel execution failed.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
