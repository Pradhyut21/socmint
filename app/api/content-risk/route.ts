/**
 * POST /api/content-risk
 *
 * Analyze one or more text snippets for content risk signals.
 * Supports optional NIM LLM enhancement when overall score >= MEDIUM.
 *
 * Request body:
 * {
 *   items: Array<{
 *     text: string;
 *     platform?: string;
 *     authorHandle?: string;
 *   }>;
 *   useNim?: boolean;   // opt-in for NIM deep analysis (slower)
 * }
 *
 * Response:
 * { results: ContentRiskResult[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyContentRisk, enhanceWithNim } from "@/lib/risk/contentRiskClassifier";
import { filterEvidence } from "@/lib/privacy/privacyFilter";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestItem {
  text: string;
  platform?: string;
  authorHandle?: string;
}

interface RequestBody {
  items: RequestItem[];
  useNim?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "items array is required and must not be empty." }, { status: 400 });
    }

    if (body.items.length > 20) {
      return NextResponse.json({ error: "Maximum 20 items per request." }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    const model = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
    const useNim = Boolean(body.useNim && apiKey);

    const results = await Promise.all(
      body.items.map(async (item) => {
        if (!item.text || typeof item.text !== "string") {
          return null;
        }

        // Apply privacy filter before analysis
        const filteredText = filterEvidence(item.text);

        // Heuristic pass
        let result = classifyContentRisk({
          text: filteredText,
          platform: item.platform ?? null,
          authorHandle: item.authorHandle ?? null,
        });

        // NIM enhancement for MEDIUM+ risk when opted in
        if (useNim && result.scores.overall >= 25 && apiKey) {
          result = await enhanceWithNim(result, apiKey, model);
        }

        return result;
      })
    );

    return NextResponse.json({ results: results.filter(Boolean) });

  } catch (err) {
    console.error("[content-risk] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Content risk analysis failed." },
      { status: 500 }
    );
  }
}
