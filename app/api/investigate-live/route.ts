import { NextRequest } from "next/server";
import { investigateWithCallback } from "../../../lib/liveSocmintWithCallback";
import { checkRateLimit } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s.` }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const type = typeof body.type === "string" ? body.type : "username";
    const quickScan = typeof body.quickScan === "boolean" ? body.quickScan : true;
    // Optional disambiguating hint for "Real name" searches — a college, company,
    // or known username that narrows a common name down to the right LinkedIn profile.
    const extraContext = typeof body.nameContext === "string" ? body.nameContext.trim() : undefined;

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const githubToken = request.headers.get("x-github-token") || undefined;

    // Create a streaming response using Server-Sent Events
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Callback function to send updates
          const onUpdate = (update: any) => {
            console.log("[SSE onUpdate] Received update:", update.type, update.message);
            try {
              const message = `data: ${JSON.stringify(update)}\n\n`;
              controller.enqueue(encoder.encode(message));
              console.log("[SSE onUpdate] ✅ Message enqueued successfully");
            } catch (err) {
              console.error("[SSE onUpdate] ❌ Failed to send update:", err);
            }
          };

          // Send keepalive heartbeat every 5 seconds
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
            } catch (err) {
              clearInterval(heartbeat);
            }
          }, 5000);

          // Run investigation with callback
          const profile = await investigateWithCallback(query, type, githubToken, quickScan, onUpdate, extraContext);

          clearInterval(heartbeat);

          // CRITICAL DEBUG: Log the profile accounts before sending
          console.log("[SSE Complete] Profile username:", profile.username);
          console.log("[SSE Complete] Total accounts in final profile:", profile.accounts?.length || 0);
          if (profile.accounts && profile.accounts.length > 0) {
            console.log("[SSE Complete] Account platforms:", profile.accounts.map(a => a.platform).join(", "));
            console.log("[SSE Complete] First 3 accounts:", profile.accounts.slice(0, 3).map(a => ({
              platform: a.platform,
              username: a.username
            })));
          } else {
            console.log("[SSE Complete] ⚠️ WARNING: No accounts in final profile!");
          }

          // Send final complete message
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", profile })}\n\n`));
          controller.close();

        } catch (error) {
          const errorData = {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Live investigation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
