/**
 * DetectDee Data Integration
 * ---------------------------------------------------------------------------
 * DetectDee (github.com/piaolin/DetectDee) ships a rich `data.json` of 300+
 * sites with bidirectional detection rules (existRegex / nonExistRegex /
 * statusCode), custom headers, per-site username-validity regex, and built-in
 * control usernames. We consume that database directly (no Go binary needed).
 *
 * SAFETY: some phone/email rules trigger OTP/SMS "send code" endpoints that
 * would text/email the target and tip them off. Those are excluded by default.
 */

export interface DetectDeeDetectRule {
  type?: "username" | "email" | "phone";
  url: string;
  statusCode?: string;
  existRegex?: string;
  nonExistRegex?: string;
  existUsername?: string;
  nonExistUsername?: string;
  userPage?: string;
  header?: Record<string, string>;
  body?: string;
  status?: boolean;
  sleep?: number;
}

export interface DetectDeeSite {
  url: string;
  nameCheck?: string;
  type?: string; // category e.g. "Programmer", "Social"
  isNSFW?: boolean;
  detect: DetectDeeDetectRule[];
  whois?: { RegistrantCountry?: string };
}

export interface DetectDeeMatch {
  site: string;
  category?: string;
  url: string;
  exists: boolean;
  responseTimeMs: number;
  country?: string;
}

const DATA_URLS = [
  "https://cdn.jsdelivr.net/gh/piaolin/DetectDee@master/data.json",
  "https://raw.githubusercontent.com/piaolin/DetectDee/master/data.json",
  "https://cdn.statically.io/gh/piaolin/DetectDee/master/data.json",
];

// Endpoints that send an OTP / verification code — intrusive, excluded.
const OTP_URL_MARKERS = [
  "sendcode", "getsmscode", "getcode", "sendsms", "sms", "sendcodenologin",
  "verifycode", "getverify", "smscode",
];

let _cache: Record<string, DetectDeeSite> | null = null;
let _cacheAt = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function fetchDetectDeeData(timeoutMs = 12000): Promise<Record<string, DetectDeeSite> | null> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  // 1. Prefer the bundled local copy (fast, reliable, offline-capable).
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "lib", "data", "detectdee.json");
    const raw = await fs.readFile(filePath, "utf-8");
    _cache = JSON.parse(raw);
    _cacheAt = Date.now();
    return _cache;
  } catch {
    // fall through to remote mirrors
  }

  // 2. Fallback: fetch from CDN mirrors (used if the bundled file is missing).
  for (const url of DATA_URLS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "socmint-osint", Accept: "application/json" },
      });
      clearTimeout(t);
      if (resp.ok) {
        _cache = await resp.json();
        _cacheAt = Date.now();
        return _cache;
      }
    } catch {
      // try next mirror
    }
  }
  return null;
}

/** Safely test a pattern as regex, falling back to substring match. */
function patternMatches(pattern: string, text: string): boolean {
  if (!pattern) return false;
  try {
    return new RegExp(pattern).test(text);
  } catch {
    return text.includes(pattern);
  }
}

/** Is this rule safe to run (doesn't trigger an OTP/verification send)? */
export function isSafeRule(rule: DetectDeeDetectRule): boolean {
  const u = (rule.url || "").toLowerCase();
  if (OTP_URL_MARKERS.some(m => u.includes(m))) return false;
  // POST bodies that request a login SMS code
  const b = (rule.body || "").toLowerCase();
  if (/smscode|getsmscode|sendcode|mobilephonenumber/.test(b)) return false;
  return true;
}

/**
 * Run a single DetectDee rule against a target. Returns null on network error.
 */
export async function runDetectDeeRule(
  rule: DetectDeeDetectRule,
  target: string,
  timeoutMs = 8000
): Promise<{ exists: boolean; responseTimeMs: number; url: string } | null> {
  const url = rule.url.replace(/%s/g, encodeURIComponent(target));
  const started = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const method = rule.body ? "POST" : "GET";
    const resp = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        ...(rule.header || {}),
      },
      body: rule.body,
      redirect: "follow",
    });
    clearTimeout(t);
    const responseTimeMs = Date.now() - started;
    const status = resp.status;

    // Determine existence following DetectDee's precedence:
    // explicit regexes first, then status code.
    let exists = false;
    if (rule.existRegex || rule.nonExistRegex) {
      const text = await resp.text();
      if (rule.existRegex && rule.nonExistRegex) {
        exists = patternMatches(rule.existRegex, text) && !patternMatches(rule.nonExistRegex, text);
      } else if (rule.existRegex) {
        exists = patternMatches(rule.existRegex, text);
      } else if (rule.nonExistRegex) {
        exists = !patternMatches(rule.nonExistRegex, text);
      }
      // If the rule also declares a status code, require it too
      if (rule.statusCode && status !== Number(rule.statusCode)) exists = false;
    } else if (rule.statusCode) {
      exists = status === Number(rule.statusCode);
    } else {
      exists = status >= 200 && status < 300;
    }

    return { exists, responseTimeMs, url: rule.userPage ? rule.userPage.replace(/%s/g, target) : url };
  } catch {
    return null;
  }
}

interface DetectOptions {
  type?: "username" | "email" | "phone";
  includeNSFW?: boolean;
  maxSites?: number;
  timeoutMs?: number;
  concurrency?: number;
  onlySites?: string[]; // limit to these site keys (for testing)
}

/**
 * Detect a target (username/email/phone) across the DetectDee site database.
 */
export async function detectDee(target: string, opts: DetectOptions = {}): Promise<DetectDeeMatch[]> {
  const data = await fetchDetectDeeData();
  if (!data) return [];

  const type = opts.type || "username";
  const maxSites = opts.maxSites ?? 150;
  const timeoutMs = opts.timeoutMs ?? 8000;
  const concurrency = opts.concurrency ?? 25;

  // Build the job list: one rule per site that matches the requested type + is safe
  const jobs: { site: string; category?: string; country?: string; rule: DetectDeeDetectRule }[] = [];
  for (const [siteKey, site] of Object.entries(data)) {
    if (opts.onlySites && !opts.onlySites.includes(siteKey)) continue;
    if (site.isNSFW && !opts.includeNSFW) continue;
    const rule = site.detect?.find(r => (r.type || "username") === type && isSafeRule(r));
    if (!rule) continue;
    // Username validity check
    if (type === "username" && site.nameCheck) {
      try { if (!new RegExp(site.nameCheck).test(target)) continue; } catch { /* ignore */ }
    }
    jobs.push({ site: siteKey, category: site.type, country: site.whois?.RegistrantCountry, rule });
    if (jobs.length >= maxSites) break;
  }

  const results: DetectDeeMatch[] = [];
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (j) => {
        const res = await runDetectDeeRule(j.rule, target, timeoutMs);
        if (!res) return null;
        return {
          site: j.site,
          category: j.category,
          url: res.url,
          exists: res.exists,
          responseTimeMs: res.responseTimeMs,
          country: j.country,
        } as DetectDeeMatch;
      })
    );
    settled.forEach(s => { if (s.status === "fulfilled" && s.value) results.push(s.value); });
  }
  return results;
}


// ---------------------------------------------------------------------------
// PIPELINE INTEGRATION: username → verified linked accounts
// ---------------------------------------------------------------------------

import type { PlatformAccount } from "../types";

/** Sites whose detection is unreliable server-side (heavy bot protection) or
 *  already covered better by our dedicated fetchers — skipped to avoid noise. */
const DETECTDEE_SKIP = new Set([
  "instagram", "pinterest", "medium", "twitter", "facebook", "tiktok",
  "linkedin", "youtube", "youtubechannel", "youtubeuser", "github", "gitlab",
  "reddit", "threads",
]);

/**
 * Run DetectDee username detection and return CONFIRMED linked accounts,
 * applying a per-site control-username validation (using each site's built-in
 * nonExistUsername) to filter out soft-404 / false-positive sites.
 *
 * Only "reliable" rules are used: statusCode checks and rules that carry a
 * control username we can validate against. This is the low-risk subset.
 */
export async function detectDeeUsernameAccounts(
  username: string,
  capturedAt: string,
  opts: { maxSites?: number; timeoutMs?: number } = {}
): Promise<PlatformAccount[]> {
  const data = await fetchDetectDeeData();
  if (!data) return [];

  const timeoutMs = opts.timeoutMs ?? 7000;
  const maxSites = opts.maxSites ?? 200;

  // Build candidate rules (username type, safe, not skipped, valid handle, has control)
  const candidates: { site: string; category?: string; country?: string; rule: DetectDeeDetectRule }[] = [];
  for (const [siteKey, site] of Object.entries(data)) {
    if (DETECTDEE_SKIP.has(siteKey)) continue;
    if (site.isNSFW) continue;
    const rule = site.detect?.find(r => (r.type || "username") === "username" && isSafeRule(r));
    if (!rule || !rule.nonExistUsername) continue; // require a control handle
    if (site.nameCheck) {
      try { if (!new RegExp(site.nameCheck).test(username)) continue; } catch { /* ignore */ }
    }
    candidates.push({ site: siteKey, category: site.type, country: site.whois?.RegistrantCountry, rule });
    if (candidates.length >= maxSites) break;
  }

  // Phase 1: check the real username
  const found: typeof candidates = [];
  const CONC = 25;
  for (let i = 0; i < candidates.length; i += CONC) {
    const batch = candidates.slice(i, i + CONC);
    const settled = await Promise.allSettled(batch.map(c => runDetectDeeRule(c.rule, username, timeoutMs)));
    settled.forEach((s, idx) => {
      if (s.status === "fulfilled" && s.value && s.value.exists) found.push(batch[idx]);
    });
  }
  if (found.length === 0) return [];

  // Phase 2: control validation — re-check each hit with its own nonExistUsername.
  // If the control ALSO "exists", the site is unreliable → drop it.
  const verified: typeof found = [];
  for (let i = 0; i < found.length; i += CONC) {
    const batch = found.slice(i, i + CONC);
    const settled = await Promise.allSettled(
      batch.map(c => runDetectDeeRule(c.rule, c.rule.nonExistUsername!, timeoutMs))
    );
    settled.forEach((s, idx) => {
      const controlExists = s.status === "fulfilled" && s.value && s.value.exists;
      if (!controlExists) verified.push(batch[idx]);
    });
  }

  return verified.map(c => ({
    platform: c.site as any,
    username,
    profileUrl: (c.rule.userPage || c.rule.url).replace(/%s/g, username),
    displayName: username,
    bio: `Handle registered on ${c.site}${c.category ? ` (${c.category})` : ""} — existence check via DetectDee, not identity-verified.`,
    followers: 0,
    confidence: "PROBABLE" as const,
    confidenceScore: 60,
    reason: `DetectDee existence check on ${c.site}${c.country ? ` [${c.country}]` : ""}. Control-validated to exclude false positives.`,
    capturedAt,
    deepfakeFlag: false,
    creationDate: capturedAt.slice(0, 10),
  } as PlatformAccount));
}
