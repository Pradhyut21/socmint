import { HibpResult, BreachRecord } from "../types";

async function fetchWithTimeout(url: string, timeoutMs = 5500, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        ...(options.headers as Record<string, string> || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ── HIBP Email Breach Check ───────────────────────────────────────────
export async function fetchHibpBreaches(email: string): Promise<HibpResult> {
  const checkedAt = new Date().toISOString();
  const apiKey = process.env.HIBP_API_KEY;

  if (!apiKey) {
    return {
      email,
      breachCount: 0,
      breaches: [],
      pasteCount: 0,
      status: "NOT_CONFIGURED",
      note: "HaveIBeenPwned API key not configured. Add HIBP_API_KEY to .env.local to enable live breach checking.",
      checkedAt,
    };
  }

  try {
    const [breachResp, pasteResp] = await Promise.allSettled([
      fetchWithTimeout(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, 8000).catch(() => null),
      fetchWithTimeout(`https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`, 8000).catch(() => null),
    ]);

    let breaches: BreachRecord[] = [];
    let pasteCount = 0;

    if (breachResp.status === "fulfilled" && breachResp.value) {
      const resp = breachResp.value as Response;
      if (resp.status === 404) {
        // no breaches
      } else if (resp.ok) {
        const data = await resp.json();
        breaches = Array.isArray(data) ? data.map((b: any) => ({
          name: b.Name,
          breachDate: b.BreachDate,
          dataClasses: b.DataClasses || [],
          description: b.Description?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
          domain: b.Domain,
          isVerified: b.IsVerified,
          pwnCount: b.PwnCount,
        })) : [];
      }
    }

    if (pasteResp.status === "fulfilled" && pasteResp.value) {
      const resp = pasteResp.value as Response;
      if (resp.ok) {
        const data = await resp.json();
        pasteCount = Array.isArray(data) ? data.length : 0;
      }
    }

    return {
      email,
      breachCount: breaches.length,
      breaches: breaches.slice(0, 10),
      pasteCount,
      status: breaches.length > 0 ? "FOUND" : "CLEAN",
      note: breaches.length > 0
        ? `Email found in ${breaches.length} data breach(es). Credentials may be compromised.`
        : "No known breaches found for this email address.",
      checkedAt,
    };
  } catch {
    return {
      email,
      breachCount: 0,
      breaches: [],
      pasteCount: 0,
      status: "ERROR",
      note: "HIBP check failed. Verify API key and network access.",
      checkedAt,
    };
  }
}

// ── Paste leak checker ────────────────────────────────────────────────
export async function fetchLivePasteLeaks(query: string): Promise<any[]> {
  const pastes: any[] = [];
  try {
    const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent('"' + query + '" (site:pastebin.com OR site:justpaste.it OR site:paste.org)')}`;
    const resp = await fetchWithTimeout(searchUrl, 5000);
    if (!resp.ok) return [];

    const html = await resp.text();
    const blocks = html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi);

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const urlMatch = block.match(/href="([^"]*RU=[^"]*)"/i) || block.match(/href="([^"]*)"/i);
      let decodedUrl = '';
      if (urlMatch) {
        const rawUrl = urlMatch[1];
        if (rawUrl.includes('RU=')) {
          const ruMatch = rawUrl.match(/RU=([^/&"]+)/);
          if (ruMatch) {
            try {
              decodedUrl = decodeURIComponent(ruMatch[1]);
            } catch (e) {}
          }
        } else if (rawUrl.startsWith('http') && !rawUrl.includes('yahoo.com')) {
          decodedUrl = rawUrl;
        }
      }
      if (!decodedUrl) continue;

      const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const title = h3Match ? h3Match[1].replace(/<[^>]+>/g, '').trim() : 'Public Paste Leak';

      const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || 
                           block.match(/<p[^>]*class="[^"]*lh-16[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<[^>]+>/g, '').trim()
        : 'Raw credentials paste snippet containing target reference.';

      const lq = query.toLowerCase();
      if (!snippet.toLowerCase().includes(lq) && !title.toLowerCase().includes(lq) && !decodedUrl.toLowerCase().includes(lq)) continue;

      let platform = "Pastebin";
      if (decodedUrl.includes("justpaste.it")) platform = "JustPaste.it";
      else if (decodedUrl.includes("paste.org")) platform = "Paste.org";

      pastes.push({
        id: `paste-leak-${i}-${Date.now()}`,
        platform,
        title: title.length > 60 ? title.slice(0, 60) + '...' : title,
        snippet,
        url: decodedUrl,
        postedAt: new Date().toLocaleDateString("en-IN"),
        riskTag: "CREDENTIAL LEAK"
      });
    }
  } catch (err) {
    console.error("Live paste leak fetch failed:", err);
  }
  return pastes;
}
