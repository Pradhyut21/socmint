/**
 * POST /api/wayback
 *
 * Runs a Wayback Machine archive scan for a given username and platform
 * (or a raw URL), returning deduplicated snapshots with deleted-content
 * detection, name/bio diffs, and extracted content.
 *
 * Body: { username?: string, url?: string, platform?: string, maxSamples?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchWaybackArchive } from "../../../lib/fetchers/wayback";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username   = typeof body.username   === "string" ? body.username.trim()   : "";
    const url        = typeof body.url        === "string" ? body.url.trim()        : "";
    const platform   = typeof body.platform   === "string" ? body.platform.trim().toLowerCase() : "twitter";
    const maxSamples = typeof body.maxSamples === "number" && body.maxSamples > 0
      ? Math.min(body.maxSamples, 20)  // hard cap at 20 to prevent runaway fetches
      : 8;

    // Require either a username or a raw URL
    const target = url || username;
    if (!target) {
      return NextResponse.json(
        { error: "Provide either 'username' or 'url' in the request body." },
        { status: 400 }
      );
    }

    const result = await fetchWaybackArchive(target, platform, maxSamples);

    return NextResponse.json({
      result,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Wayback archive scan failed.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
