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

// ── Gravatar / Google Account Photo Resolver ─────────────────────────
// Uses MD5 hash of the email to query Gravatar's public API.
// A valid avatar response (HTTP 200) indicates a Google/Gravatar-linked account.
export interface GravatarResult {
  email: string;
  hasGravatar: boolean;
  avatarUrl: string | null;
  gravatarProfileUrl: string | null;
  displayName: string | null;
  checkedAt: string;
}

/** Minimal MD5 — no external dependency. */
function md5(str: string): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function rol(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & c) | (~b & d), a, b, x, s, t);
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & d) | (c & ~d), a, b, x, s, t);
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(b ^ c ^ d, a, b, x, s, t);
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(c ^ (b | ~d), a, b, x, s, t);

  const utf8 = unescape(encodeURIComponent(str));
  const len = utf8.length;
  const n = ((len + 8) >> 6) + 1;
  const m: number[] = new Array(n * 16).fill(0);
  for (let i = 0; i < len; i++) m[i >> 2] |= utf8.charCodeAt(i) << ((i % 4) * 8);
  m[len >> 2] |= 0x80 << ((len % 4) * 8);
  m[n * 16 - 2] = len * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < m.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a=ff(a,b,c,d,m[i+0],7,-680876936);b=ff(d,a,b,c,m[i+1],12,-389564586);c=ff(c,d,a,b,m[i+2],17,606105819);d=ff(b,c,d,a,m[i+3],22,-1044525330);
    a=ff(a,b,c,d,m[i+4],7,-176418897);b=ff(d,a,b,c,m[i+5],12,1200080426);c=ff(c,d,a,b,m[i+6],17,-1473231341);d=ff(b,c,d,a,m[i+7],22,-45705983);
    a=ff(a,b,c,d,m[i+8],7,1770035416);b=ff(d,a,b,c,m[i+9],12,-1958414417);c=ff(c,d,a,b,m[i+10],17,-42063);d=ff(b,c,d,a,m[i+11],22,-1990404162);
    a=ff(a,b,c,d,m[i+12],7,1804603682);b=ff(d,a,b,c,m[i+13],12,-40341101);c=ff(c,d,a,b,m[i+14],17,-1502002290);d=ff(b,c,d,a,m[i+15],22,1236535329);
    a=gg(a,b,c,d,m[i+1],5,-165796510);b=gg(d,a,b,c,m[i+6],9,-1069501632);c=gg(c,d,a,b,m[i+11],14,643717713);d=gg(b,c,d,a,m[i+0],20,-373897302);
    a=gg(a,b,c,d,m[i+5],5,-701558691);b=gg(d,a,b,c,m[i+10],9,38016083);c=gg(c,d,a,b,m[i+15],14,-660478335);d=gg(b,c,d,a,m[i+4],20,-405537848);
    a=gg(a,b,c,d,m[i+9],5,568446438);b=gg(d,a,b,c,m[i+14],9,-1019803690);c=gg(c,d,a,b,m[i+3],14,-187363961);d=gg(b,c,d,a,m[i+8],20,1163531501);
    a=gg(a,b,c,d,m[i+13],5,-1444681467);b=gg(d,a,b,c,m[i+2],9,-51403784);c=gg(c,d,a,b,m[i+7],14,1735328473);d=gg(b,c,d,a,m[i+12],20,-1926607734);
    a=hh(a,b,c,d,m[i+5],4,-378558);b=hh(d,a,b,c,m[i+8],11,-2022574463);c=hh(c,d,a,b,m[i+11],16,1839030562);d=hh(b,c,d,a,m[i+14],23,-35309556);
    a=hh(a,b,c,d,m[i+1],4,-1530992060);b=hh(d,a,b,c,m[i+4],11,1272893353);c=hh(c,d,a,b,m[i+7],16,-155497632);d=hh(b,c,d,a,m[i+10],23,-1094730640);
    a=hh(a,b,c,d,m[i+13],4,681279174);b=hh(d,a,b,c,m[i+0],11,-358537222);c=hh(c,d,a,b,m[i+3],16,-722521979);d=hh(b,c,d,a,m[i+6],23,76029189);
    a=hh(a,b,c,d,m[i+9],4,-640364487);b=hh(d,a,b,c,m[i+12],11,-421815835);c=hh(c,d,a,b,m[i+15],16,530742520);d=hh(b,c,d,a,m[i+2],23,-995338651);
    a=ii(a,b,c,d,m[i+0],6,-198630844);b=ii(d,a,b,c,m[i+7],10,1126891415);c=ii(c,d,a,b,m[i+14],15,-1416354905);d=ii(b,c,d,a,m[i+5],21,-57434055);
    a=ii(a,b,c,d,m[i+12],6,1700485571);b=ii(d,a,b,c,m[i+3],10,-1894986606);c=ii(c,d,a,b,m[i+10],15,-1051523);d=ii(b,c,d,a,m[i+1],21,-2054922799);
    a=ii(a,b,c,d,m[i+8],6,1873313359);b=ii(d,a,b,c,m[i+15],10,-30611744);c=ii(c,d,a,b,m[i+6],15,-1560198380);d=ii(b,c,d,a,m[i+13],21,1309151649);
    a=ii(a,b,c,d,m[i+4],6,-145523070);b=ii(d,a,b,c,m[i+11],10,-1120210379);c=ii(c,d,a,b,m[i+2],15,718787259);d=ii(b,c,d,a,m[i+9],21,-343485551);
    a=safeAdd(a,oa);b=safeAdd(b,ob);c=safeAdd(c,oc);d=safeAdd(d,od);
  }
  const h = "0123456789abcdef";
  const hex = (n: number) => { let s=""; for(let i=0;i<4;i++) s+=h[(n>>(i*8+4))&0xf]+h[(n>>(i*8))&0xf]; return s; };
  return hex(a)+hex(b)+hex(c)+hex(d);
}

export async function fetchGravatarData(email: string): Promise<GravatarResult> {
  const checkedAt = new Date().toISOString();
  const cleanEmail = email.trim().toLowerCase();
  const hash = md5(cleanEmail);

  try {
    // d=404 means: return 404 instead of default image when no gravatar exists
    const avatarResp = await fetchWithTimeout(
      `https://www.gravatar.com/avatar/${hash}?d=404&s=200`, 4000
    );
    if (!avatarResp.ok) {
      return { email, hasGravatar: false, avatarUrl: null, gravatarProfileUrl: null, displayName: null, checkedAt };
    }

    // Avatar exists — try profile JSON (may fail if profile is private)
    let displayName: string | null = null;
    try {
      const profileResp = await fetchWithTimeout(
        `https://www.gravatar.com/${hash}.json`, 3000, { headers: { Accept: "application/json" } }
      );
      if (profileResp.ok) {
        const profileData = await profileResp.json();
        const entry = profileData?.entry?.[0];
        displayName = entry?.displayName || entry?.name?.formatted || entry?.preferredUsername || null;
      }
    } catch { /* profile is optional */ }

    console.log(`[GRAVATAR] ✓ ${cleanEmail} → Gravatar confirmed (${displayName || "anonymous"})`);
    return {
      email,
      hasGravatar: true,
      avatarUrl: `https://www.gravatar.com/avatar/${hash}?s=200`,
      gravatarProfileUrl: `https://www.gravatar.com/${hash}`,
      displayName,
      checkedAt,
    };
  } catch (err) {
    console.error(`[GRAVATAR] Failed for ${cleanEmail}:`, err);
    return { email, hasGravatar: false, avatarUrl: null, gravatarProfileUrl: null, displayName: null, checkedAt };
  }
}
