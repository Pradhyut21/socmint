import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

export async function POST(request: NextRequest) {
  try {
    const { question, profile, stream = true } = await request.json();

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

    const evidenceContext = JSON.stringify(
      {
        subject: profile?.realName,
        username: profile?.username,
        riskScore: profile?.riskScore,
        riskLevel: profile?.riskLevel,
        riskSignals: profile?.riskSignals,
        accounts: profile?.accounts?.map((account: { platform: string; username: string; confidence: string; reason: string; profileUrl: string }) => ({
          platform: account.platform,
          username: account.username,
          confidence: account.confidence,
          reason: account.reason,
          url: account.profileUrl,
        })),
        posts: profile?.posts?.slice(0, 8),
        legalRecords: profile?.legalRecords,
      },
      null,
      2
    );

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
        messages: [
          {
            role: "system",
            content:
              "You are NEXUS — an AI forensic intelligence analyst for CID Karnataka Police. You have access to the following live-collected evidence about suspect {username}.\n\nRULES:\n- Answer ONLY from evidence above\n- Always cite your source platform\n- If data is missing, say clearly: 'Not found in available public data'\n- Never speculate beyond what data shows\n- If asked about arrest/guilt, respond: 'That determination belongs to the investigating officer and the court. I can only present the evidence.'\n- Keep answers concise and factual\n- Use plain English — no technical jargon\n- All data is from publicly available sources only\n- You MUST end your response with: 'Sources: [list of platforms cited]'",
          },
          {
            role: "user",
            content: `Evidence context:\n${evidenceContext}\n\nOfficer question: ${question}`,
          },
        ],
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
