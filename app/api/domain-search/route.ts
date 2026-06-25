/**
 * POST /api/domain-search
 *
 * Domain / IP / Company OSINT investigation.
 *
 * Request body:
 * {
 *   query: string;              // domain, IP address, or company name
 *   type?: "domain" | "ip" | "company";   // optional override
 * }
 *
 * Response:
 * { result: DomainIntelResult }
 */

import { NextRequest, NextResponse } from "next/server";
import { investigateDomainOrIp } from "@/lib/providers/domain/domainProvider";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  query: string;
  type?: "domain" | "ip" | "company";
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
      return NextResponse.json({ error: "query is required." }, { status: 400 });
    }

    const query = body.query.trim();

    // Validate query length
    if (query.length > 253) {
      return NextResponse.json({ error: "Query too long. Maximum 253 characters." }, { status: 400 });
    }

    const result = await investigateDomainOrIp(query);

    return NextResponse.json({ result });

  } catch (err) {
    console.error("[domain-search] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Domain investigation failed." },
      { status: 500 }
    );
  }
}
