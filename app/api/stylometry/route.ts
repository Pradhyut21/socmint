/**
 * POST /api/stylometry
 *
 * Run stylometric analysis on a corpus of text sources.
 *
 * Request body:
 * {
 *   sources: Array<{
 *     label: string;       // e.g. "Twitter @handle", "Telegram channel"
 *     text: string;        // concatenated public text content
 *     platform?: string;
 *   }>;
 * }
 *
 * Response:
 * { result: StylometryResult }
 */

import { NextRequest, NextResponse } from "next/server";
import { analyseStylometry } from "@/lib/stylometry/stylometryService";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  sources: { label: string; text: string; platform?: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.sources || !Array.isArray(body.sources) || body.sources.length < 2) {
      return NextResponse.json(
        { error: "At least 2 text sources are required for stylometric comparison." },
        { status: 400 }
      );
    }

    if (body.sources.length > 10) {
      return NextResponse.json({ error: "Maximum 10 sources per request." }, { status: 400 });
    }

    for (const src of body.sources) {
      if (!src.label || !src.text) {
        return NextResponse.json(
          { error: "Each source must have a label and text field." },
          { status: 400 }
        );
      }
    }

    const result = analyseStylometry(
      body.sources.map(s => ({
        label: s.label.slice(0, 100),
        text: s.text.slice(0, 10000),   // cap per-source text
        platform: s.platform,
      }))
    );

    return NextResponse.json({ result });

  } catch (err) {
    console.error("[stylometry] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stylometry analysis failed." },
      { status: 500 }
    );
  }
}
