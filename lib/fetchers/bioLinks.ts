/**
 * Bio-Link Aggregator Expansion
 * ---------------------------------------------------------------------------
 * People concentrate ALL their accounts on one link-in-bio page (Linktree,
 * about.me, beacons.ai, bio.link, carrd, tap.bio, etc.). Expanding that single
 * URL yields a whole cluster of self-declared, high-confidence linked accounts —
 * a very strong signal for the "same individual" problem statement.
 *
 * This fetcher scrapes such pages and extracts the outbound social profile URLs.
 */

import type { PlatformAccount } from "../types";

const AGGREGATOR_HOSTS = [
  "linktr.ee", "about.me", "beacons.ai", "bio.link", "carrd.co",
  "tap.bio", "linkin.bio", "solo.to", "campsite.bio", "lnk.bio", "msha.ke",
];

const SOCIAL_HOSTS: Record<string, string> = {
  "instagram.com": "instagram", "twitter.com": "twitter", "x.com": "twitter",
  "facebook.com": "facebook", "youtube.com": "youtube", "github.com": "github",
  "gitlab.com": "gitlab", "linkedin.com": "linkedin", "tiktok.com": "tiktok",
  "t.me": "telegram", "reddit.com": "reddit", "threads.net": "threads",
  "twitch.tv": "twitch", "medium.com": "medium", "behance.net": "behance",
  "dribbble.com": "dribbble", "soundcloud.com": "soundcloud", "spotify.com": "spotify",
  "pinterest.com": "pinterest", "snapchat.com": "snapchat", "discord.gg": "discord",
  "patreon.com": "patreon", "substack.com": "substack", "leetcode.com": "leetcode",
  "freelancer.com": "freelancer", "dev.to": "devto", "kaggle.com": "kaggle",
};

export interface BioLinkResult {
  sourceUrl: string;
  aggregator: string;
  accounts: PlatformAccount[];
}

/** Detect if a URL is a known link-in-bio aggregator. */
export function isAggregatorUrl(url?: string): boolean {
  if (!url) return false;
  const host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].toLowerCase();
  return AGGREGATOR_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

function platformForHost(host: string): string | undefined {
  const h = host.toLowerCase();
  for (const [known, platform] of Object.entries(SOCIAL_HOSTS)) {
    if (h === known || h.endsWith(`.${known}`)) return platform;
  }
  return undefined;
}

function extractHandle(platform: string, url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const seg = u.pathname.split("/").filter(Boolean);
    if (platform === "youtube") return (seg[0] || "").replace(/^@/, "");
    if (platform === "linkedin") return seg[1] || seg[0] || "";
    if (platform === "telegram") return seg[0] || "";
    return (seg[0] || "").replace(/^@/, "");
  } catch {
    return "";
  }
}

/**
 * Fetch a single aggregator page and extract outbound social accounts.
 */
export async function expandBioLink(url: string, timeoutMs = 8000): Promise<BioLinkResult | null> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const host = fullUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!resp.ok) return null;

    const html = await resp.text();
    const capturedAt = new Date().toISOString();

    // Collect all hrefs + any URLs embedded in the (often JSON) page body
    const urls = new Set<string>();
    const hrefRe = /https?:\/\/[^\s"'<>\\)]+/gi;
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(html)) !== null) {
      urls.add(m[0].replace(/\\u002F/gi, "/").replace(/["'\\].*$/, ""));
    }

    const accounts: PlatformAccount[] = [];
    const seen = new Set<string>();
    for (const u of urls) {
      let parsedHost: string;
      try {
        parsedHost = new URL(u).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
      const platform = platformForHost(parsedHost);
      if (!platform) continue;
      const handle = extractHandle(platform, u);
      if (!handle || handle.length < 2) continue;
      const key = `${platform}:${handle.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      accounts.push({
        platform: platform as any,
        username: handle,
        profileUrl: u.split("?")[0],
        displayName: handle,
        bio: `Linked from ${host} link-in-bio page (self-declared).`,
        followers: 0,
        confidence: "CONFIRMED",
        confidenceScore: 88,
        reason: `Listed on the subject's ${host} link-in-bio aggregator page.`,
        capturedAt,
        deepfakeFlag: false,
        creationDate: capturedAt.slice(0, 10),
      } as PlatformAccount);
    }

    if (accounts.length === 0) return null;
    return { sourceUrl: fullUrl, aggregator: host, accounts };
  } catch {
    return null;
  }
}

/**
 * Given the accounts discovered so far, find any link-in-bio aggregator URLs in
 * their bios/websites and expand them into concrete linked accounts.
 */
export async function expandBioLinksFromAccounts(
  accounts: PlatformAccount[],
  timeoutMs = 8000
): Promise<PlatformAccount[]> {
  const aggregatorUrls = new Set<string>();
  const urlRe = /(https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z.]{2,})(\/[^\s"'<>)]*)?/gi;

  for (const acc of accounts) {
    const haystack = `${acc.bio || ""} ${(acc as any).website || ""}`;
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(haystack)) !== null) {
      const candidate = m[0];
      if (isAggregatorUrl(candidate)) aggregatorUrls.add(candidate.replace(/[.,)]+$/, ""));
    }
  }

  if (aggregatorUrls.size === 0) return [];

  const results = await Promise.allSettled(
    [...aggregatorUrls].slice(0, 3).map(u => expandBioLink(u, timeoutMs))
  );

  const discovered: PlatformAccount[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) discovered.push(...r.value.accounts);
  }
  return discovered;
}
