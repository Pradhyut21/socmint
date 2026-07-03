/**
 * Wayback Machine Snapshot Timeline Fetcher
 *
 * Uses the CDX Server API (public, no key required) to retrieve all archived
 * snapshots for a given URL and builds a diff-aware timeline.
 *
 * CDX API reference: https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
 */

export interface WaybackSnapshot {
  timestamp: string;         // e.g. "20230415183012"
  date: string;              // formatted: "2023-04-15"
  snapshotUrl: string;       // full Wayback Machine URL
  statusCode: string;        // e.g. "200"
  mimeType: string;
  ogTitle: string | null;
  ogDescription: string | null;
  changeDetected: boolean;   // true if title/description changed vs previous snapshot
}

export interface WaybackTimeline {
  url: string;
  totalSnapshots: number;
  sampledSnapshots: WaybackSnapshot[];
  earliestDate: string | null;
  latestDate: string | null;
  nameChanges: { from: string; to: string; date: string }[];
  bioChanges:  { from: string; to: string; date: string }[];
}

const UA = "Mozilla/5.0 (compatible; SOCMINT-Shield/2.0; +https://socmint.shield)";

async function fetchWithTimeout(url: string, timeoutMs = 6000, opts: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { "User-Agent": UA, ...(opts.headers as Record<string, string> || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

function extractOg(html: string, property: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"));
  return m?.[1]?.trim() || null;
}

/** Fetches all CDX rows for a URL and returns a deduplicated, sampled set. */
export async function fetchWaybackTimeline(targetUrl: string, maxSamples = 8): Promise<WaybackTimeline> {
  const result: WaybackTimeline = {
    url: targetUrl,
    totalSnapshots: 0,
    sampledSnapshots: [],
    earliestDate: null,
    latestDate: null,
    nameChanges: [],
    bioChanges: [],
  };

  try {
    // CDX API: fetch all HTTP-200 text/html snapshots, limited fields
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&filter=mimetype:text/html&limit=200&collapse=timestamp:8`;
    console.log(`[WAYBACK] CDX query: ${cdxUrl}`);

    const cdxResp = await fetchWithTimeout(cdxUrl, 8000);
    if (!cdxResp.ok) return result;

    const rows: string[][] = await cdxResp.json();
    if (!Array.isArray(rows) || rows.length < 2) return result;

    // First row is headers — skip it
    const dataRows = rows.slice(1);
    result.totalSnapshots = dataRows.length;

    if (dataRows.length === 0) return result;

    // Set earliest/latest dates
    const firstTs = dataRows[0][0];
    const lastTs  = dataRows[dataRows.length - 1][0];
    result.earliestDate = `${firstTs.slice(0,4)}-${firstTs.slice(4,6)}-${firstTs.slice(6,8)}`;
    result.latestDate   = `${lastTs.slice(0,4)}-${lastTs.slice(4,6)}-${lastTs.slice(6,8)}`;

    // Sample evenly across the timeline
    const step = Math.max(1, Math.floor(dataRows.length / maxSamples));
    const sampled: string[][] = [];
    for (let i = 0; i < dataRows.length; i += step) {
      sampled.push(dataRows[i]);
      if (sampled.length >= maxSamples) break;
    }
    // Always include the latest
    if (sampled[sampled.length - 1][0] !== lastTs) sampled.push(dataRows[dataRows.length - 1]);

    // Fetch each sampled snapshot and extract OG metadata
    const snapshots: WaybackSnapshot[] = [];
    for (const row of sampled) {
      const ts = row[0];
      const orig = row[1];
      const snapshotUrl = `https://web.archive.org/web/${ts}/${orig}`;
      const date = `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}`;

      let ogTitle: string | null = null;
      let ogDescription: string | null = null;

      try {
        const snapResp = await fetchWithTimeout(snapshotUrl, 6000);
        if (snapResp.ok) {
          const html = await snapResp.text();
          ogTitle       = extractOg(html, "title")
            || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null;
          ogDescription = extractOg(html, "description") || null;
        }
      } catch { /* timeout — skip this snapshot's content */ }

      snapshots.push({
        timestamp: ts,
        date,
        snapshotUrl,
        statusCode: row[2] || "200",
        mimeType: row[3] || "text/html",
        ogTitle,
        ogDescription,
        changeDetected: false, // filled below
      });
    }

    // Mark changes between consecutive snapshots
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
        result.bioChanges.push({ from: prev.ogDescription.slice(0, 120), to: curr.ogDescription.slice(0, 120), date: curr.date });
      }
    }

    result.sampledSnapshots = snapshots;
    console.log(`[WAYBACK] ✓ ${targetUrl}: ${result.totalSnapshots} snapshots, ${snapshots.length} sampled, ${result.nameChanges.length} name changes`);
  } catch (err) {
    console.error(`[WAYBACK] Timeline fetch failed for ${targetUrl}:`, err);
  }

  return result;
}
