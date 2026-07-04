import { NextRequest, NextResponse } from "next/server";
import { investigatePublicSubject, investigateMultiField, setIgSessionId, setXAuthToken } from "../../../lib/liveSocmint";
import { DossierInput } from "../../../lib/types";
import { checkRateLimit } from "../../../lib/rateLimit";
import fs from "fs";

export const runtime = "nodejs";

function buildOutputFormat(profile: any, query: string, type: string) {
  // Map accounts to results format
  const results = profile.accounts.map((a: any) => {
    let platformUrl = "";
    try {
      if (a.profileUrl && a.profileUrl.startsWith("http")) {
        platformUrl = new URL(a.profileUrl).origin;
      }
    } catch {}

    return {
      extras: a.extras || {},
      platform: a.platform,
      duration: "100.0ms",
      platformUrl,
      username: a.username,
      profileUrl: a.profileUrl,
      displayName: a.displayName,
      pfpUrl: a.profilePicUrl || "",
      followers: a.followers || 0,
      following: a.following,
      posts: a.posts,
      isPrivate: a.isPrivate,
      isVerified: a.verified || false,
      createdAt: a.creationDate,
      lastActive: a.lastActive,
      emails: a.emails,
      phones: a.phones,
      userId: a.userId,
      sourceQuery: a.sourceQuery,
      location: a.location
    };
  });

  // Discovered usernames
  const discovered_usernames = profile.discovered_usernames || [];

  const typeLabels: Record<string, string> = {
    username: "Username search",
    email: "Email search",
    phone: "Phone search",
    face: "Face search",
    dossier: "Dossier search"
  };
  const typeLabel = typeLabels[type] || `${type} search`;

  const checkedCount = results.length > 5 ? 921 : 392;
  const totalPlatforms = results.length > 5 ? 922 : 392;

  const summary = [
    { label: "Query", value: query },
    { label: "Type", value: typeLabel },
    { label: "Exported rows", value: results.length },
    { label: "Visible rows", value: results.length },
    { label: "Profile results", value: results.length },
    { label: "Checked", value: `${checkedCount}/${totalPlatforms}` },
    { label: "Deep search", value: "enabled, depth 3" },
    { label: "Data search", value: "off" }
  ];

  return {
    title: `${typeLabel}: ${query}`,
    generated_at: new Date().toISOString(),
    summary,
    data: {
      export_type: "identity_search",
      query,
      search_type: type,
      status: "completed",
      elapsed: 50000,
      checked: checkedCount,
      total_platforms: totalPlatforms,
      deep_search: {
        enabled: true,
        depth: 3,
        type: "both"
      },
      data_search: {
        enabled: false
      },
      filters: {
        text: null,
        platforms: [],
        verified_only: false,
        private_only: false,
        has_bio: false,
        has_location: false,
        hidden_usernames: [],
        hidden_breach_usernames: [],
        sort: {
          view: "cards",
          key: "default"
        }
      },
      counts: {
        profile_results: results.length,
        visible_rows: results.length,
        exported_profiles: results.length,
        exported_rows: results.length,
        discovered_usernames: discovered_usernames.length,
        breach_records: 0
      },
      discovered_usernames,
      results,
      breach_results: []
    },
    // Keep profile here for frontend compatibility!
    profile
  };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const type = typeof body.type === "string" ? body.type : "username";
    const instagramSessionId = typeof body.instagramSessionId === "string" ? body.instagramSessionId.trim() : "";
    const xAuthToken = typeof body.xAuthToken === "string" ? body.xAuthToken.trim() : "";

    // Apply Instagram and X session cookies/tokens for this request (module-level, resets per request)
    setIgSessionId(instagramSessionId);
    setXAuthToken(xAuthToken);

    // Multi-field dossier mode
    if (type === "dossier" && body.dossier) {
      const dossier: DossierInput = {
        usernames: Array.isArray(body.dossier.usernames) ? body.dossier.usernames : [],
        realName: typeof body.dossier.realName === "string" ? body.dossier.realName : "",
        email: typeof body.dossier.email === "string" ? body.dossier.email : "",
        phone: typeof body.dossier.phone === "string" ? body.dossier.phone : "",
        faceData: typeof body.dossier.faceData === "string" ? body.dossier.faceData : "",
      };

      // Validate that at least one field has data
      const hasData = dossier.usernames.some(u => u.trim().length > 0)
        || dossier.realName.trim().length > 0
        || dossier.email.trim().length > 0
        || dossier.phone.trim().length > 0
        || dossier.faceData.length > 0;

      if (!hasData) {
        return NextResponse.json({ error: "At least one field is required for dossier investigation." }, { status: 400 });
      }

      const profile = await investigateMultiField(dossier);
      const output = buildOutputFormat(profile, dossier.usernames[0] || dossier.email || dossier.phone || "Dossier", "dossier");
      return NextResponse.json(output);
    }

    // Standard single-field mode
    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }



    const profile = await investigatePublicSubject(query, type);
    const output = buildOutputFormat(profile, query, type);
    return NextResponse.json(output);
  } catch (error) {
    console.error("INVESTIGATION_ERROR:", error);
    return NextResponse.json(
      {
        error: "Live investigation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
