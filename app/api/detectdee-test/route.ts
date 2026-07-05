import { NextRequest, NextResponse } from "next/server";
import { fetchDetectDeeData, runDetectDeeRule, isSafeRule } from "@/lib/fetchers/detectDeeAPI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-check: validate the DetectDee engine using each site's OWN built-in
 * control usernames. For a sample of sites we run the rule against its
 * existUsername (must return exists=true) and nonExistUsername (must return
 * exists=false). Accuracy tells us whether the integration actually works.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const limit = Number(sp.get("limit") || "25");
  const type = (sp.get("type") || "username") as "username" | "email" | "phone";
  const onlySites = sp.get("sites")?.split(",").map(s => s.trim()).filter(Boolean);

  const data = await fetchDetectDeeData(25000);
  if (!data) {
    return NextResponse.json({ ok: false, error: "Could not fetch DetectDee data.json" }, { status: 502 });
  }

  const totalSites = Object.keys(data).length;

  // Pick sites that have a safe rule of the requested type WITH both control usernames
  const candidates = Object.entries(data)
    .filter(([key]) => !onlySites || onlySites.includes(key))
    .map(([key, site]) => {
      const rule = site.detect?.find(r => (r.type || "username") === type && isSafeRule(r));
      return rule ? { key, rule } : null;
    })
    .filter((x): x is { key: string; rule: any } => !!x && !!x.rule.existUsername && !!x.rule.nonExistUsername)
    .slice(0, limit);

  const perSite = await Promise.all(candidates.map(async ({ key, rule }) => {
    const [existRes, nonExistRes] = await Promise.all([
      runDetectDeeRule(rule, rule.existUsername, 8000),
      runDetectDeeRule(rule, rule.nonExistUsername, 8000),
    ]);
    const truePositive = existRes?.exists === true;
    const trueNegative = nonExistRes?.exists === false && nonExistRes !== null;
    const correct = truePositive && trueNegative;
    return {
      site: key,
      existUsername: rule.existUsername,
      existDetected: existRes ? existRes.exists : "network-error",
      nonExistUsername: rule.nonExistUsername,
      nonExistDetected: nonExistRes ? nonExistRes.exists : "network-error",
      correct,
    };
  }));

  const tested = perSite.length;
  const correct = perSite.filter(p => p.correct).length;
  const networkErrors = perSite.filter(p => p.existDetected === "network-error" || p.nonExistDetected === "network-error").length;

  return NextResponse.json({
    ok: true,
    totalSitesInDatabase: totalSites,
    type,
    sitesTested: tested,
    correct,
    accuracy: tested ? `${Math.round((correct / tested) * 100)}%` : "n/a",
    networkErrors,
    details: perSite,
  });
}
