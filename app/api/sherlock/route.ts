import { NextRequest, NextResponse } from "next/server";
import { checkSherlockTools, installSherlockTools, searchWithSherlock } from "@/lib/fetchers/sherlockFetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sherlock - Check if Sherlock/Maigret tools are installed
 */
export async function GET(request: NextRequest) {
  try {
    const tools = await checkSherlockTools();
    return NextResponse.json({
      success: true,
      tools_available: tools,
      message: tools.sherlock || tools.maigret 
        ? "OSINT tools are available" 
        : "No OSINT tools installed. Use POST /api/sherlock to install."
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/sherlock - Install Sherlock/Maigret or search username
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "search";

    if (action === "install") {
      console.log("[SHERLOCK API] Installing tools...");
      const result = await installSherlockTools();
      return NextResponse.json({
        success: true,
        installation: result,
        message: "Installation attempt completed. Check results for each tool."
      });
    }

    if (action === "search") {
      const { username, mode = "quick" } = body;
      
      if (!username) {
        return NextResponse.json({
          success: false,
          error: "Username is required"
        }, { status: 400 });
      }

      console.log(`[SHERLOCK API] Searching "${username}" in ${mode} mode`);
      const accounts = await searchWithSherlock(username, mode, new Date().toISOString());
      
      return NextResponse.json({
        success: true,
        username,
        mode,
        accounts_found: accounts.length,
        accounts: accounts.map(acc => ({
          platform: acc.platform,
          username: acc.username,
          url: acc.profileUrl,
          confidence: acc.confidence,
          tool: acc.reason?.includes('sherlock') ? 'sherlock' : acc.reason?.includes('maigret') ? 'maigret' : 'unknown'
        }))
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action. Use 'install' or 'search'"
    }, { status: 400 });

  } catch (error: any) {
    console.error("[SHERLOCK API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
