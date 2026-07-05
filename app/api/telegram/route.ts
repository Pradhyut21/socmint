import { NextRequest, NextResponse } from "next/server";
import { investigatePublicSubject } from "../../../lib/liveSocmint";

export const runtime = "nodejs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not configured in .env.local");
}

/**
 * Send a message to Telegram
 */
async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
    }
    return response.ok;
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
    return false;
  }
}

/**
 * Parse confidence score to emoji badge
 */
function confidenceBadge(score: number): string {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🔵";
  if (score >= 40) return "🟡";
  return "🔴";
}

/**
 * Handle Telegram webhook updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    const username = message.from?.username;
    const text = message.text.trim();

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    console.log(`[TELEGRAM] Message from @${username}: ${text}`);

    // ─── /start command ─────────────────────────────────────────────────────
    if (text === "/start") {
      const welcomeText = `
<b>🔍 SOCMINT Shield — Telegram Bot</b>

Welcome to the OSINT investigation assistant.

<b>Commands:</b>

<code>/search @username</code>
  Search for a username across social media
  Example: <code>/search @pradhyut</code>

<code>/search john doe</code>
  Search by full name
  Example: <code>/search john doe</code>

<code>/help</code>
  Show this help message

<b>Features:</b>
• Finds accounts on 20+ platforms
• Confidence scoring for matches
• Links to discovered profiles
• Variation matching (handles with numbers, dashes, etc.)

<b>Privacy:</b>
Investigations are logged. Do not share sensitive data.
      `;
      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    // ─── /help command ──────────────────────────────────────────────────────
    if (text === "/help") {
      const helpText = `
<b>SOCMINT Shield Commands</b>

<code>/search &lt;query></code>
Search by username or name. Results show:
  • Platform name and handle
  • Confidence score (🟢🔵🟡🔴)
  • Direct link to profile

Example searches:
  /search @saikishan
  /search saikishan
  /search "sai kishan"
      `;
      await sendTelegramMessage(chatId, helpText);
      return NextResponse.json({ ok: true });
    }

    // ─── /search command ────────────────────────────────────────────────────
    if (text.startsWith("/search ")) {
      const query = text.slice(8).trim();

      if (!query || query.length < 2) {
        await sendTelegramMessage(
          chatId,
          "❌ Please provide a username or name to search.\n\n<code>/search @username</code>"
        );
        return NextResponse.json({ ok: true });
      }

      // Send "searching..." indicator
      await sendTelegramMessage(
        chatId,
        "🔍 Searching... This may take 30-90 seconds."
      );

      try {
        // Determine search type: username (starts with @) or name
        const searchType = query.startsWith("@") ? "username" : "name";
        const cleanQuery = query.replace(/^@/, "");

        console.log(
          `[TELEGRAM] Running investigation: "${cleanQuery}" (type: ${searchType})`
        );

        // Run investigation
        const profile = await investigatePublicSubject(cleanQuery, searchType);

        if (!profile.accounts || profile.accounts.length === 0) {
          await sendTelegramMessage(
            chatId,
            `❌ No accounts found for: <b>${cleanQuery}</b>\n\nTry a different username or spelling.`
          );
          return NextResponse.json({ ok: true });
        }

        // Build results message
        const topAccounts = profile.accounts
          .sort((a, b) => {
            const scoreA = (a as any).confidenceScore || 50;
            const scoreB = (b as any).confidenceScore || 50;
            return scoreB - scoreA;
          })
          .slice(0, 10);

        let resultsText = `
<b>✅ Investigation Results</b>
<b>Query:</b> ${cleanQuery}

<b>Found: ${profile.accounts.length} accounts</b> (showing top 10)

`;

        topAccounts.forEach((acc, idx) => {
          const confidenceScore = (acc as any).confidenceScore || 50;
          const badge = confidenceBadge(confidenceScore);
          resultsText += `${idx + 1}. ${badge} <b>${acc.platform.toUpperCase()}</b>\n`;
          resultsText += `   @${acc.username}\n`;
          resultsText += `   Confidence: ${confidenceScore}%\n`;
          resultsText += `   <a href="${acc.profileUrl}">View Profile</a>\n\n`;
        });

        if (profile.realName) {
          resultsText += `<b>Real Name:</b> ${profile.realName}\n`;
        }

        resultsText += `\n📊 <b>Total accounts discovered:</b> ${profile.accounts.length}`;

        await sendTelegramMessage(chatId, resultsText);
      } catch (err) {
        console.error("[TELEGRAM] Investigation error:", err);
        await sendTelegramMessage(
          chatId,
          `❌ Investigation failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ─── Default: show help ─────────────────────────────────────────────────
    const defaultText = `
<b>Unknown command</b>

Use <code>/help</code> to see available commands, or:
<code>/search @username</code> to start investigating
    `;
    await sendTelegramMessage(chatId, defaultText);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[TELEGRAM] Webhook error:", err);
    return NextResponse.json({ ok: false, error: "Webhook error" }, { status: 500 });
  }
}

/**
 * GET handler for webhook verification (optional)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Telegram webhook is running",
    timestamp: new Date().toISOString(),
  });
}
