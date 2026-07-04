import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../../../lib/rateLimit";

export const runtime = "nodejs";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ key_finding: "Rate limit exceeded.", connected_signals: [], anomalies: [], investigator_priority: "Wait before retrying." }, { status: 429 });
  }

  try {
    const { profile } = await request.json();

    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json({
        key_finding: profile?.nexusAnalysis?.key_finding || "NVIDIA API key not configured. Programmatic fallback completed.",
        connected_signals: profile?.nexusAnalysis?.connected_signals || [],
        anomalies: profile?.nexusAnalysis?.anomalies || [],
        investigator_priority: profile?.nexusAnalysis?.investigator_priority || "Configure NVIDIA API key for live insights.",
        investigator_brief: profile?.nexusAnalysis?.investigator_brief || "Factual brief generated programmatically."
      });
    }


    const evidenceContext = JSON.stringify(
      {
        subject: profile?.realName,
        accounts: profile?.accounts?.map((a: any) => ({ platform: a.platform, username: a.username, confidence: a.confidence })),
        posts: profile?.posts?.slice(0, 10),
        legalRecords: profile?.legalRecords,
        aliasResults: profile?.aliasResults
      },
      null,
      2
    );

    const prompt = `Analyse this suspect profile and connect all signals. Find:
1. Which accounts are definitely the same person
2. Any location patterns or travel signals
3. Any timing anomalies (silence periods)
4. Connections between legal records and social media activity
5. The most important thing an investigator should know

Return as JSON:
{
  "key_finding": "string",
  "connected_signals": [{"signal1": "string", "signal2": "string", "connection": "string"}],
  "anomalies": [{"description": "string", "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"}],
  "investigator_priority": "string",
  "investigator_brief": "string (A detailed markdown brief under 250 words summarizing the investigation. Focus strictly on public evidence with sections: Investigation Overview, Evidence Collected, Evidence Correlation, Confidence Evolution, Risk Evolution, Modules Used, Remaining Unknowns, Recommended Next Steps. If info for a section is missing, state 'evidence insufficient'. Never fabricate missing details.)"
}`;



    const response = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(40000),
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are NEXUS, an AI forensic intelligence analyst. You output only valid JSON based on the requested schema. Ensure severity is one of LOW, MEDIUM, HIGH, CRITICAL."
          },
          {
            role: "user",
            content: `Profile Data:\n${evidenceContext}\n\nTask:\n${prompt}`
          }
        ]
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        key_finding: "Analysis failed due to API error.",
        connected_signals: [],
        anomalies: [],
        investigator_priority: "Retry investigation."
      });
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || "{}";
    
    try {
      return NextResponse.json(JSON.parse(result));
    } catch {
      return NextResponse.json({
        key_finding: "Analysis returned invalid format.",
        connected_signals: [],
        anomalies: [],
        investigator_priority: "Retry investigation."
      });
    }

  } catch (error) {
    console.error("[NEXUS ERROR]", error);
    return NextResponse.json({
      key_finding: "AI analysis encountered an error.",
      connected_signals: [],
      anomalies: [],
      investigator_priority: "Check system logs."
    });
  }
}
