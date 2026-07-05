import { NextRequest, NextResponse } from "next/server";
import { buildProfileContext } from "../../../lib/ai/buildProfileContext";

export const runtime = "nodejs";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

export async function POST(request: NextRequest) {
  try {
    const { question, profile, messages = [], stream = true } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json({
        answer:
          "NVIDIA_API_KEY is not configured. Add it to .env.local to enable live NVIDIA NIM analysis. Until then, use the profile tabs for source inspection.",
        provider: "local-fallback",
      });
    }

    // Build full profile context — all accounts, bios, locations, posts,
    // correlation analysis, breaches, legal records, identity linkage, etc.
    const evidenceContext = buildProfileContext(profile);

    const requestMessages = [
      {
        role: "system",
        content: `You are NEXUS — an AI forensic intelligence analyst for CID Karnataka Police. You have the complete investigation profile for suspect ${profile?.realName || profile?.username || "the subject"}, including all discovered accounts (with bios, display names, followers, locations), identity correlation analysis, bio cross-links, Keybase cryptographic proofs, activity/posts, breach data, dark web pastes, legal records, and shadow accounts.

RULES:
- Answer ONLY from the evidence context provided below
- Reference specific accounts, bios, locations, and correlation signals in your answers
- Cite which platform / data source each fact comes from
- If data is missing for a specific question, say: "Not found in available public data"
- Never speculate beyond what the evidence shows
- If asked about arrest/guilt: "That determination belongs to the investigating officer and the court. I can only present the evidence."
- Keep answers concise, factual, and actionable
- End responses with: "Sources: [list of platforms / data sources cited]"

Complete investigation evidence:
${evidenceContext}`
      },
      ...messages
    ];

    const response = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 700,
        stream: stream,
        messages: requestMessages,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "NVIDIA API request failed.", details: errorText },
        { status: response.status }
      );
    }

    if (!stream) {
      const data = await response.json();
      return NextResponse.json({
        answer: data.choices?.[0]?.message?.content || "No response content.",
        provider: "nvidia",
      });
    }

    // Return the response directly to stream it to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "AI analysis failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
