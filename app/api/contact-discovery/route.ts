/**
 * POST /api/contact-discovery
 *
 * Runs email and phone discovery for a given username using public OSINT:
 * - GitHub commit email leak (Events API)
 * - Email permutation + Gravatar verification
 * - Paste site search
 * - Bio text phone extraction
 *
 * Body: { username: string, realName?: string, bios?: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { discoverContactInfo } from "../../../lib/fetchers/contactDiscovery";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!username) {
      return NextResponse.json(
        { error: "Provide 'username' in the request body." },
        { status: 400 }
      );
    }

    const realName = typeof body.realName === "string" ? body.realName.trim() : undefined;
    const bios: string[] = Array.isArray(body.bios)
      ? body.bios.filter((b: unknown): b is string => typeof b === "string")
      : [];

    const githubToken = process.env.GITHUB_TOKEN;

    const result = await discoverContactInfo(username, realName, githubToken, bios);

    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Contact discovery failed.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
