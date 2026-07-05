import { NextRequest, NextResponse } from "next/server";
import { fastUsernameSearch, fastEmailSearch } from "@/lib/fetchers/fastOSINT";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/fast-osint - Fast parallel API-based OSINT search
 * Checks 20+ platforms in 3-8 seconds via direct API calls
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, timeout = 8000 } = body;

    if (!username && !email) {
      return NextResponse.json({
        success: false,
        error: "Either username or email is required"
      }, { status: 400 });
    }

    if (username) {
      console.log(`[FAST-OSINT API] Searching username: "${username}"`);
      const result = await fastUsernameSearch(username, timeout);
      
      return NextResponse.json({
        success: true,
        type: "username",
        ...result,
        platforms_checked: 20,
        speed: `${result.duration_ms}ms`
      });
    }

    if (email) {
      console.log(`[FAST-OSINT API] Searching email: "${email}"`);
      const result = await fastEmailSearch(email, timeout);
      
      return NextResponse.json({
        success: true,
        type: "email",
        ...result
      });
    }

  } catch (error: any) {
    console.error("[FAST-OSINT API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/fast-osint - Get info about fast OSINT scanner
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    description: "Fast API-based OSINT scanner",
    features: [
      "20+ platforms checked in parallel",
      "Direct API calls (no CLI tools needed)",
      "3-8 second response time",
      "Works in Quick Scan mode",
      "No installation required"
    ],
    platforms: [
      "GitHub", "Instagram", "Twitter", "Reddit", "TikTok",
      "Tumblr", "Medium", "Pinterest", "Vimeo", "SoundCloud",
      "Flickr", "DeviantArt", "Behance", "Dribbble", "Patreon",
      "Twitch", "Steam", "Spotify", "Last.fm", "About.me"
    ],
    usage: {
      endpoint: "POST /api/fast-osint",
      body: {
        username: "targetuser",
        timeout: 8000
      }
    }
  });
}
