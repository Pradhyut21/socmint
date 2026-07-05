import { NextRequest, NextResponse } from "next/server";
import {
  scrapeRichProfiles,
  checkScraperTools,
  installScraperTools,
  getRichDataSummary
} from "@/lib/fetchers/richScraperFetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/rich-scraper - Check which tools are installed
 */
export async function GET() {
  try {
    const tools = await checkScraperTools();
    const availableTools = Object.entries(tools).filter(([_, installed]) => installed).map(([name]) => name);
    
    return NextResponse.json({
      success: true,
      tools,
      available_count: availableTools.length,
      available_tools: availableTools,
      description: "Rich profile scraper using Instaloader, snscrape for Instagram, Twitter, Reddit",
      platforms_supported: ["instagram", "twitter", "reddit", "telegram"]
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/rich-scraper - Scrape profiles or install tools
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "scrape";

    // Install tools
    if (action === "install") {
      console.log("[RICH-SCRAPER API] Installing tools...");
      const result = await installScraperTools();
      
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

    // Scrape profiles
    if (action === "scrape") {
      const { username, platforms = ['instagram', 'twitter', 'reddit'], timeout = 30000 } = body;
      
      if (!username) {
        return NextResponse.json({
          success: false,
          error: "Username is required"
        }, { status: 400 });
      }

      console.log(`[RICH-SCRAPER API] Scraping ${platforms.join(', ')} for "${username}"`);
      const result = await scrapeRichProfiles(username, platforms, timeout);
      
      const summary = getRichDataSummary(result);
      
      return NextResponse.json({
        success: true,
        ...result,
        summary,
        profiles_with_data: result.profiles.filter(p => p.success)
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action. Use 'scrape' or 'install'"
    }, { status: 400 });

  } catch (error: any) {
    console.error("[RICH-SCRAPER API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
