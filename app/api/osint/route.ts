import { NextRequest, NextResponse } from "next/server";
import {
  checkOSINTTools,
  installOSINTTools,
  searchUsernameOSINT,
  searchEmailOSINT,
  getToolsDescription
} from "@/lib/fetchers/osintToolkitFetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/osint - Check which OSINT tools are installed
 */
export async function GET(request: NextRequest) {
  try {
    const tools = await checkOSINTTools();
    const availableTools = Object.entries(tools).filter(([_, installed]) => installed).map(([name]) => name);
    const descriptions = getToolsDescription(tools);
    
    return NextResponse.json({
      success: true,
      tools,
      available_count: availableTools.length,
      available_tools: availableTools,
      descriptions,
      message: availableTools.length > 0
        ? `${availableTools.length} OSINT tools available`
        : "No OSINT tools installed. Use POST /api/osint to install."
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/osint - Install tools, search username, or search email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "search-username";

    // Install tools
    if (action === "install") {
      console.log("[OSINT API] Installing tools...");
      const tools = body.tools || ['all'];
      const result = await installOSINTTools(tools);
      
      const installed = Object.entries(result).filter(([_, res]) => (res as any).installed);
      const failed = Object.entries(result).filter(([_, res]) => !(res as any).installed);
      
      return NextResponse.json({
        success: true,
        installation: result,
        installed_count: installed.length,
        failed_count: failed.length,
        message: `Installation complete: ${installed.length} succeeded, ${failed.length} failed`
      });
    }

    // Search username
    if (action === "search-username") {
      const { username, timeout = 45 } = body;
      
      if (!username) {
        return NextResponse.json({
          success: false,
          error: "Username is required"
        }, { status: 400 });
      }

      console.log(`[OSINT API] Searching username "${username}"`);
      const { accounts, metadata } = await searchUsernameOSINT(
        username,
        timeout,
        new Date().toISOString()
      );
      
      return NextResponse.json({
        success: true,
        username,
        accounts_found: accounts.length,
        tools_used: metadata.tools_used,
        errors: metadata.errors,
        accounts: accounts.map(acc => ({
          platform: acc.platform,
          username: acc.username,
          url: acc.profileUrl,
          confidence: acc.confidence,
          reason: acc.reason
        }))
      });
    }

    // Search email
    if (action === "search-email") {
      const { email, timeout = 45 } = body;
      
      if (!email) {
        return NextResponse.json({
          success: false,
          error: "Email is required"
        }, { status: 400 });
      }

      console.log(`[OSINT API] Searching email "${email}"`);
      const result = await searchEmailOSINT(email, timeout);
      
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action. Use 'install', 'search-username', or 'search-email'"
    }, { status: 400 });

  } catch (error: any) {
    console.error("[OSINT API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
