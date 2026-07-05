import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side image proxy — fetches an image URL server-side and streams it
 * back to the browser. Solves CORS restrictions on social CDN images
 * (Instagram scontent-*, Facebook, etc.) which block browser-direct fetches.
 *
 * Usage: /api/image-proxy?url=<encoded-url>
 */
export async function GET(request: NextRequest) {
  // NextRequest's searchParams already URL-decodes the value once — do NOT
  // decodeURIComponent again here, it double-decodes percent-encoded characters
  // inside the CDN URL's own query string (e.g. Instagram's `efg=...%3D` param)
  // and corrupts the signed URL, causing the upstream fetch to 403.
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  if (!/^https?:\/\//i.test(url)) {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Referer": "https://www.instagram.com/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}
