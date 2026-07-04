/**
 * Wayback Machine Archive Scraper — SOCMINT Shield
 *
 * Uses the Internet Archive's public APIs to retrieve, deduplicate, and
 * analyse archived snapshots of social-media profiles and posts.
 *
 * LEGAL NOTE: This module queries only publicly available data from the
 * Internet Archive's Wayback Machine (archive.org). No authentication is
 * bypassed, no private data is accessed, and all APIs used are public and
 * rate-limit-compliant. Usage is consistent with Archive.org's Terms of
 * Service for research and investigative purposes.
 *
 * CDX Server API:     https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
 * Availability API:   https://archive.org/help/wayback_api.php
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WaybackSnapshot {
  timestamp: string;         // CDX timestamp, e.g. "20230415183012"
  date: string;              // Human-readable: "2023-04-15"
  snapshotUrl: string;       // Full Wayback Machine URL for this snapshot
  originalUrl: string;       // The original URL that was archived
  statusCode: string;        // HTTP status at time of archiving, e.g. "200"
  mimeType: string;          // e.g. "text/html"
  digest: string | null;     // SHA1 content hash from CDX (used for dedup)
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  extractedContent: {
    bio?: string;
    postText?: string;
    mediaLinks: string[];
  };
  changeDetected: boolean;   // true if title/bio changed vs previous snapshot
  isLikelyDeleted: boolean;  // true when live probe of the original URL returns 404/410
}

export interface WaybackArchiveResult {
  platform: string;
  targetUrl: string;
  availabilityStatus: "FOUND" | "NOT_FOUND" | "ERROR";
  mostRecentSnapshotUrl: string | null;
  totalSnapshots: number;
  deletedContentFlag: boolean;
  sampledSnapshots: WaybackSnapshot[];
  earliestDate: string | null;
  latestDate: string | null;
  nameChanges: { from: string; to: string; date: string }[];
  bioChanges:  { from: string; to: string; date: string }[];
  errorNote?: string;
  checkedAt: string;
}

/**
 * @deprecated Use WaybackArchiveResult. Kept for backward-compat with
 * any existing callers of the old fetchWaybackTimeline API.
 */
export interface WaybackTimeline {
  url: string;
  totalSnapshots: number;
  sampledSnapshots: WaybackSnapshot[];
  earliestDate: string | null;
  latestDate: string | null;
  nameChanges: { from: string; to: string; date: string }[];
  bioChanges:  { from: string; to: string; date: string }[];
}

// ─── Platform URL Patterns ────────────────────────────────────────────────────

interface PlatformPattern {
  id: string;
  label: string;
  /** Returns the CDX url param (supports wildcards) for a given username */
  cdxUrl: (username: string) => string;
  /** Returns the canonical live profile URL for a given username */
  liveUrl: (username: string) => string;
}

export const WAYBACK_PLATFORM_PATTERNS: PlatformPattern[] = [
  {
    id: "twitter",
    label: "X / Twitter",
    cdxUrl: (u) => `twitter.com/${u}*`,
    liveUrl: (u) => `https://x.com/${u}`,
  },
  {
    id: "x",
    label: "X / Twitter",
    cdxUrl: (u) => `x.com/${u}*`,
    liveUrl: (u) => `https://x.com/${u}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    cdxUrl: (u) => `instagram.com/${u}*`,
    liveUrl: (u) => `https://www.instagram.com/${u}/`,
  },
  {
    id: "facebook",
    label: "Facebook",
    cdxUrl: (u) => `facebook.com/${u}*`,
    liveUrl: (u) => `https://www.facebook.com/${u}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    cdxUrl: (u) => `linkedin.com/in/${u}*`,
    liveUrl: (u) => `https://www.linkedin.com/in/${u}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    cdxUrl: (u) => `reddit.com/user/${u}*`,
    liveUrl: (u) => `https://www.reddit.com/user/${u}`,
  },
  {
    id: "threads",
    label: "Threads",
    cdxUrl: (u) => `threads.net/@${u}*`,
    liveUrl: (u) => `https://www.threads.net/@${u}`,
  },
  {
    id: "youtube",
    label: "YouTube",
    cdxUrl: (u) => `youtube.com/@${u}*`,
    liveUrl: (u) => `https://www.youtube.com/@${u}`,
  },
  {
    id: "github",
    label: "GitHub",
    cdxUrl: (u) => `github.com/${u}*`,
    liveUrl: (u) => `https://github.com/${u}`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    cdxUrl: (u) => `tiktok.com/@${u}*`,
    liveUrl: (u) => `https://www.tiktok.com/@${u}`,
  },
  {
    id: "snapchat",
    label: "Snapchat",
    cdxUrl: (u) => `snapchat.com/add/${u}*`,
    liveUrl: (u) => `https://www.snapchat.com/add/${u}`,
  },
  {
    id: "pinterest",
    label: "Pinterest",
    cdxUrl: (u) => `pinterest.com/${u}*`,
    liveUrl: (u) => `https://www.pinterest.com/${u}/`,
  },
  {
    id: "tumblr",
    label: "Tumblr",
    cdxUrl: (u) => `${u}.tumblr.com*`,
    liveUrl: (u) => `https://${u}.tumblr.com`,
  },
  {
    id: "medium",
    label: "Medium",
    cdxUrl: (u) => `medium.com/@${u}*`,
    liveUrl: (u) => `https://medium.com/@${u}`,
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    cdxUrl: (u) => `soundcloud.com/${u}*`,
    liveUrl: (u) => `https://soundcloud.com/${u}`,
  },
  {
    id: "quora",
    label: "Quora",
    cdxUrl: (u) => `quora.com/profile/${u}*`,
    liveUrl: (u) => `https://www.quora.com/profile/${u}`,
  },
];

function getPlatformPattern(platform: string): PlatformPattern | undefined {
  const norm = platform.toLowerCase().trim();
  return WAYBACK_PLATFORM_PATTERNS.find((p) => p.id === norm);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchWithTimeout(url: string, timeoutMs = 7000, opts: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(opts.headers as Record<string, string> || {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/** Exponential backoff retry — max 2 attempts, 1s base delay */
async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Retry exhausted");
}

/** Throttle: wait ms between calls to respect archive.org rate limits */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() || null;
}

/** Extracts media links from archived HTML (img src, video src, og:image) */
function extractMediaLinks(html: string): string[] {
  const links: string[] = [];
  const ogImage = extractMeta(html, "image");
  if (ogImage) links.push(ogImage);

  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null && links.length < 5) {
    const src = m[1];
    if (src.startsWith("http") && !src.includes("wayback") && !src.includes("archive.org")) {
      links.push(src);
    }
  }
  return [...new Set(links)].slice(0, 5);
}

function formatDate(ts: string): string {
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}

// ─── Availability API ─────────────────────────────────────────────────────────

interface AvailabilityResult {
  status: "FOUND" | "NOT_FOUND" | "ERROR";
  snapshotUrl: string | null;
  timestamp: string | null;
}

/**
 * Quick check: does Archive.org have ANY snapshot for this URL?
 * Uses the Wayback Availability API (lightweight, fast ~300ms).
 */
export async function checkWaybackAvailability(url: string): Promise<AvailabilityResult> {
  try {
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const resp = await withRetry(() => fetchWithTimeout(apiUrl, 5000, {
      headers: { Accept: "application/json" },
    }));

    if (!resp.ok) return { status: "ERROR", snapshotUrl: null, timestamp: null };

    const data = await resp.json();
    const closest = data?.archived_snapshots?.closest;

    if (closest?.available && closest.url) {
      return {
        status: "FOUND",
        snapshotUrl: closest.url,
        timestamp: closest.timestamp || null,
      };
    }
    return { status: "NOT_FOUND", snapshotUrl: null, timestamp: null };
  } catch {
    return { status: "ERROR", snapshotUrl: null, timestamp: null };
  }
}

// ─── CDX API ──────────────────────────────────────────────────────────────────

interface CdxRow {
  timestamp: string;
  original: string;
  statusCode: string;
  mimeType: string;
  digest: string | null;
}

/**
 * Queries the CDX Server API with matchType=prefix (catches subpages/posts/media),
 * collapses by content digest (true deduplication — same content = same snapshot),
 * and returns up to `limit` unique rows sorted oldest→newest.
 */
async function queryCDX(cdxUrlParam: string, limit = 300): Promise<CdxRow[]> {
  const url = [
    "https://web.archive.org/cdx/search/cdx",
    `?url=${encodeURIComponent(cdxUrlParam)}`,
    "&matchType=prefix",
    "&output=json",
    "&fl=timestamp,original,statuscode,mimetype,digest",
    "&filter=statuscode:200",
    "&filter=mimetype:text/html",
    `&limit=${limit}`,
    "&collapse=digest",   // deduplicate by content hash
    "&from=20090101000000", // avoid very old junk
  ].join("");

  const resp = await withRetry(() => fetchWithTimeout(url, 12000, {
    headers: { Accept: "application/json" },
  }));
  if (!resp.ok) throw new Error(`CDX HTTP ${resp.status}`);

  const rows: string[][] = await resp.json();
  if (!Array.isArray(rows) || rows.length < 2) return [];

  // First row is the header — skip it
  return rows.slice(1).map((r) => ({
    timestamp: r[0],
    original:  r[1],
    statusCode: r[2] || "200",
    mimeType:  r[3] || "text/html",
    digest:    r[4] || null,
  }));
}

// ─── Live-status check ────────────────────────────────────────────────────────

/**
 * HEAD-probe the live URL to detect if the profile/post has been deleted.
 * Returns true when the live content appears to be gone (404/410/gone).
 */
async function isLiveDeleted(liveUrl: string): Promise<boolean> {
  try {
    const resp = await fetchWithTimeout(liveUrl, 5000);
    if (resp.status === 404 || resp.status === 410) return true;

    // Some platforms return 200 with a "not found" message in the HTML body
    if (resp.ok) {
      const html = await resp.text();
      const title = extractTitle(html)?.toLowerCase() || "";
      const deletedSignals = ["not found", "page doesn't exist", "this account doesn't exist", "no such user", "user not found", "profile not found", "content not available", "this content isn't available"];
      return deletedSignals.some((s) => title.includes(s));
    }
    return false;
  } catch {
    return false; // network error ≠ definitively deleted
  }
}

// ─── Snapshot content fetcher ─────────────────────────────────────────────────

async function fetchSnapshotContent(snapshotUrl: string): Promise<{
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  extractedContent: WaybackSnapshot["extractedContent"];
}> {
  try {
    const resp = await fetchWithTimeout(snapshotUrl, 8000);
    if (!resp.ok) return { ogTitle: null, ogDescription: null, ogImage: null, extractedContent: { mediaLinks: [] } };

    const html = await resp.text();

    const ogTitle =
      extractMeta(html, "title") ||
      extractTitle(html);

    const ogDescription =
      extractMeta(html, "description") ||
      extractMeta(html, "description") || null;

    const ogImage = extractMeta(html, "image") || null;

    // Extract bio: try common patterns from known platforms
    let bio: string | undefined;
    const bioPatterns = [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{20,})["']/i,
      /<p[^>]*class="[^"]*bio[^"]*"[^>]*>([^<]{10,})<\/p>/i,
      /<div[^>]*class="[^"]*profile-bio[^"]*"[^>]*>([^<]{10,})<\/div>/i,
    ];
    for (const pat of bioPatterns) {
      const m = html.match(pat);
      if (m?.[1]?.trim() && m[1].trim().length > 10) {
        bio = m[1].trim().slice(0, 300);
        break;
      }
    }
    if (!bio && ogDescription && ogDescription.length > 10) bio = ogDescription.slice(0, 300);

    // Extract post text snippets (look for structured tweet/post blocks)
    let postText: string | undefined;
    const postPatterns = [
      /<div[^>]*class="[^"]*tweet-text[^"]*"[^>]*>([\s\S]{10,200}?)<\/div>/i,
      /<p[^>]*data-testid="[^"]*tweetText[^"]*"[^>]*>([\s\S]{10,300}?)<\/p>/i,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]{0,50}?<p[^>]*>([\s\S]{10,300}?)<\/p>/i,
    ];
    for (const pat of postPatterns) {
      const m = html.match(pat);
      if (m?.[1]) {
        postText = m[1].replace(/<[^>]+>/g, "").trim().slice(0, 300);
        break;
      }
    }

    const mediaLinks = extractMediaLinks(html);

    return {
      ogTitle,
      ogDescription,
      ogImage,
      extractedContent: { bio, postText, mediaLinks },
    };
  } catch {
    return { ogTitle: null, ogDescription: null, ogImage: null, extractedContent: { mediaLinks: [] } };
  }
}

// ─── Main export: fetchWaybackArchive ────────────────────────────────────────

/**
 * Fetches and analyses archived versions of a social-media profile or URL
 * from the Internet Archive's Wayback Machine.
 *
 * @param usernameOrUrl  - Either a bare username (needs `platform`) or a full URL
 * @param platform       - Platform ID (e.g. "twitter", "instagram") — used to
 *                         build the CDX URL pattern. Ignored when `usernameOrUrl`
 *                         is a full URL.
 * @param maxSamples     - Max number of snapshots to fetch content for (default 8)
 */
export async function fetchWaybackArchive(
  usernameOrUrl: string,
  platform = "twitter",
  maxSamples = 8
): Promise<WaybackArchiveResult> {
  const checkedAt = new Date().toISOString();
  const result: WaybackArchiveResult = {
    platform,
    targetUrl: usernameOrUrl,
    availabilityStatus: "ERROR",
    mostRecentSnapshotUrl: null,
    totalSnapshots: 0,
    deletedContentFlag: false,
    sampledSnapshots: [],
    earliestDate: null,
    latestDate: null,
    nameChanges: [],
    bioChanges: [],
    checkedAt,
  };

  try {
    // ── Step 1: Resolve URL pattern ─────────────────────────────────────
    let cdxUrlParam: string;
    let liveUrl: string;

    const isFullUrl = usernameOrUrl.startsWith("http://") || usernameOrUrl.startsWith("https://");

    if (isFullUrl) {
      // Strip protocol for CDX and use prefix match
      const stripped = usernameOrUrl.replace(/^https?:\/\//, "");
      cdxUrlParam = `${stripped}*`;
      liveUrl = usernameOrUrl;
      result.targetUrl = usernameOrUrl;
    } else {
      const pat = getPlatformPattern(platform);
      if (!pat) {
        // Fallback: treat as a generic URL
        cdxUrlParam = `${usernameOrUrl}*`;
        liveUrl = usernameOrUrl;
      } else {
        cdxUrlParam = pat.cdxUrl(usernameOrUrl);
        liveUrl = pat.liveUrl(usernameOrUrl);
        result.targetUrl = liveUrl;
      }
    }

    console.log(`[WAYBACK] Scanning: platform=${platform} cdxParam=${cdxUrlParam}`);

    // ── Step 2: Availability API pre-check ──────────────────────────────
    const avail = await checkWaybackAvailability(liveUrl);
    result.availabilityStatus = avail.status;
    result.mostRecentSnapshotUrl = avail.snapshotUrl;

    if (avail.status === "NOT_FOUND") {
      console.log(`[WAYBACK] No snapshots found for ${liveUrl}`);
      return result;
    }

    // ── Step 3: CDX query with prefix + digest dedup ────────────────────
    let cdxRows: CdxRow[];
    try {
      cdxRows = await queryCDX(cdxUrlParam, 300);
    } catch (cdxErr) {
      result.errorNote = `CDX query failed: ${cdxErr instanceof Error ? cdxErr.message : "Unknown"}`;
      console.error("[WAYBACK] CDX error:", cdxErr);
      return result;
    }

    if (cdxRows.length === 0) {
      result.availabilityStatus = "NOT_FOUND";
      return result;
    }

    result.availabilityStatus = "FOUND";
    result.totalSnapshots = cdxRows.length;

    const firstTs = cdxRows[0].timestamp;
    const lastTs  = cdxRows[cdxRows.length - 1].timestamp;
    result.earliestDate = formatDate(firstTs);
    result.latestDate   = formatDate(lastTs);

    console.log(`[WAYBACK] CDX returned ${cdxRows.length} unique snapshots (${result.earliestDate} → ${result.latestDate})`);

    // ── Step 4: Evenly sample across the timeline ───────────────────────
    const step = Math.max(1, Math.floor(cdxRows.length / maxSamples));
    const sampled: CdxRow[] = [];
    for (let i = 0; i < cdxRows.length; i += step) {
      sampled.push(cdxRows[i]);
      if (sampled.length >= maxSamples) break;
    }
    // Always include the latest snapshot
    const latestRow = cdxRows[cdxRows.length - 1];
    if (sampled[sampled.length - 1]?.timestamp !== latestRow.timestamp) {
      sampled.push(latestRow);
    }

    // ── Step 5: Live-check the root URL for deleted-content detection ───
    const liveDeleted = await isLiveDeleted(liveUrl);
    result.deletedContentFlag = liveDeleted;

    // ── Step 6: Fetch each sampled snapshot content (rate-limited) ──────
    const snapshots: WaybackSnapshot[] = [];

    for (const row of sampled) {
      const snapshotUrl = `https://web.archive.org/web/${row.timestamp}/${row.original}`;
      const date = formatDate(row.timestamp);

      const content = await fetchSnapshotContent(snapshotUrl);

      snapshots.push({
        timestamp: row.timestamp,
        date,
        snapshotUrl,
        originalUrl: row.original,
        statusCode: row.statusCode,
        mimeType: row.mimeType,
        digest: row.digest || null,
        ogTitle: content.ogTitle,
        ogDescription: content.ogDescription,
        ogImage: content.ogImage,
        extractedContent: content.extractedContent,
        changeDetected: false, // filled below
        isLikelyDeleted: liveDeleted, // per-snapshot check only for root URL
      });

      // 300ms between requests to be a good citizen with archive.org
      await sleep(300);
    }

    // ── Step 7: Diff consecutive snapshots for name/bio changes ─────────
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];

      const titleChanged = prev.ogTitle && curr.ogTitle && prev.ogTitle !== curr.ogTitle;
      const descChanged  = prev.ogDescription && curr.ogDescription && prev.ogDescription !== curr.ogDescription;
      curr.changeDetected = !!(titleChanged || descChanged);

      if (titleChanged && prev.ogTitle && curr.ogTitle) {
        result.nameChanges.push({ from: prev.ogTitle, to: curr.ogTitle, date: curr.date });
      }
      if (descChanged && prev.ogDescription && curr.ogDescription) {
        result.bioChanges.push({
          from: prev.ogDescription.slice(0, 120),
          to: curr.ogDescription.slice(0, 120),
          date: curr.date,
        });
      }
    }

    result.sampledSnapshots = snapshots;
    console.log(
      `[WAYBACK] ✓ ${liveUrl}: ${result.totalSnapshots} snapshots, ` +
      `${snapshots.length} sampled, ${result.nameChanges.length} name changes, ` +
      `${result.bioChanges.length} bio changes, deleted=${liveDeleted}`
    );
  } catch (err) {
    result.errorNote = err instanceof Error ? err.message : "Unknown error";
    console.error("[WAYBACK] Fatal error:", err);
  }

  return result;
}

// ─── Backward-compatible shim ─────────────────────────────────────────────────

/**
 * @deprecated Use fetchWaybackArchive instead.
 * Kept for backward-compat with any internal callers.
 */
export async function fetchWaybackTimeline(targetUrl: string, maxSamples = 8): Promise<WaybackTimeline> {
  const res = await fetchWaybackArchive(targetUrl, "twitter", maxSamples);
  return {
    url: res.targetUrl,
    totalSnapshots: res.totalSnapshots,
    sampledSnapshots: res.sampledSnapshots,
    earliestDate: res.earliestDate,
    latestDate: res.latestDate,
    nameChanges: res.nameChanges,
    bioChanges: res.bioChanges,
  };
}

// ─── Report generator ─────────────────────────────────────────────────────────

/**
 * Formats a WaybackArchiveResult into a short investigator summary string
 * suitable for embedding in SuspectProfile.investigationSteps.
 */
export function generateWaybackReport(result: WaybackArchiveResult): string {
  if (result.availabilityStatus === "NOT_FOUND") {
    return `[Wayback Machine] No archived snapshots found for ${result.targetUrl}.`;
  }
  if (result.availabilityStatus === "ERROR") {
    return `[Wayback Machine] Archive query failed for ${result.targetUrl}: ${result.errorNote || "unknown error"}.`;
  }

  const lines: string[] = [
    `[Wayback Machine] Archive scan for ${result.targetUrl}:`,
    `  • ${result.totalSnapshots} unique snapshots (${result.earliestDate} → ${result.latestDate})`,
    `  • Content fetched from ${result.sampledSnapshots.length} sampled snapshots`,
  ];

  if (result.deletedContentFlag) {
    lines.push("  • ⚠ DELETED: Profile/page no longer exists live — archive copies available");
  }
  if (result.nameChanges.length > 0) {
    lines.push(`  • ${result.nameChanges.length} name/title change(s) detected across archive`);
    lines.push(`    Latest: "${result.nameChanges[result.nameChanges.length - 1].from}" → "${result.nameChanges[result.nameChanges.length - 1].to}"`);
  }
  if (result.bioChanges.length > 0) {
    lines.push(`  • ${result.bioChanges.length} bio/description change(s) detected`);
  }

  return lines.join("\n");
}
