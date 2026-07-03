import { PlatformAccount, Post, SuspectProfile } from "../types";
import { getDemoProbeResult, getDemoGithubData } from "../mock/demoData";

export type ProbeResult = {
  ok: boolean;
  status?: number;
  title?: string;
  description?: string;
  verifiedUsername?: string;
  verifiedUrl?: string;
};

export type PlatformProbe = {
  platform: PlatformAccount["platform"];
  label: string;
  url: (username: string) => string;
  normalize?: (username: string) => string;
  tier: 1 | 2;
};

export const PLATFORM_PROBES: PlatformProbe[] = [
  // Tier 1 — Official APIs
  { tier: 1, platform: "github",    label: "GitHub",     url: (u) => `https://github.com/${u}` },
  { tier: 1, platform: "reddit",    label: "Reddit",     url: (u) => `https://www.reddit.com/user/${u}` },
  { tier: 1, platform: "hackernews",label: "HackerNews", url: (u) => `https://news.ycombinator.com/user?id=${u}` },
  { tier: 1, platform: "devto",     label: "Dev.to",     url: (u) => `https://dev.to/${u}` },
  { tier: 1, platform: "gitlab",    label: "GitLab",     url: (u) => `https://gitlab.com/${u}` },
  { tier: 1, platform: "tumblr",    label: "Tumblr",     url: (u) => `https://${u}.tumblr.com` },
  // Tier 2 — HTTP existence probes
  { tier: 2, platform: "twitter",   label: "X / Twitter",url: (u) => `https://x.com/${u}` },
  { tier: 2, platform: "instagram", label: "Instagram",  url: (u) => `https://www.instagram.com/${u}` },
  { tier: 2, platform: "facebook",  label: "Facebook",   url: (u) => `https://www.facebook.com/${u}` },
  { tier: 2, platform: "telegram",  label: "Telegram",   url: (u) => `https://t.me/${u}` },
  { tier: 2, platform: "linkedin",  label: "LinkedIn",   normalize: (u) => u.replace(/^in\//, "").replace(/[\s_.]+/g, "-").toLowerCase(), url: (u) => `https://www.linkedin.com/in/${u}` },
  { tier: 2, platform: "tiktok",    label: "TikTok",     url: (u) => `https://www.tiktok.com/@${u}` },
  { tier: 2, platform: "snapchat",  label: "Snapchat",   url: (u) => `https://www.snapchat.com/add/${u}` },
  { tier: 2, platform: "pinterest", label: "Pinterest",  url: (u) => `https://www.pinterest.com/${u}` },
  { tier: 2, platform: "soundcloud",label: "SoundCloud", url: (u) => `https://soundcloud.com/${u}` },
  { tier: 2, platform: "medium",    label: "Medium",     url: (u) => `https://medium.com/@${u}` },
  { tier: 2, platform: "quora",     label: "Quora",      url: (u) => `https://www.quora.com/profile/${u}` },
  { tier: 2, platform: "steam",     label: "Steam",      url: (u) => `https://steamcommunity.com/id/${u}` },
  { tier: 2, platform: "pastebin",  label: "Pastebin",   url: (u) => `https://pastebin.com/u/${u}` },
  { tier: 2, platform: "youtube",   label: "YouTube",    url: (u) => `https://www.youtube.com/@${u}` },
];

export const RISK_TERMS = [
  "fraud", "scam", "hawala", "mule", "otp", "carding", "crypto",
  "cash drop", "bypass", "leak", "stolen", "session", "escrow",
  "mirror payment", "phishing", "ransomware", "darkweb", "dark web",
  "hacking", "exploit", "keylogger", "ddos", "botnet", "deepfake",
  "money laundering", "shell company", "fake kyc", "sim swap",
];

export function cleanQuery(query: string) {
  return query.trim().replace(/^@/, "").replace(/\s+/g, "");
}

export function scoreText(text: string) {
  const haystack = text.toLowerCase();
  return RISK_TERMS.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function confidenceFor(platform: string, query: string, result: ProbeResult): PlatformAccount["confidence"] {
  if (platform === "github" || platform === "reddit" || platform === "hackernews" || platform === "devto" || platform === "gitlab") {
    return "CONFIRMED";
  }
  if (result.ok && result.title?.toLowerCase().includes(query.toLowerCase())) return "PROBABLE";
  return "POSSIBLE";
}

export function displayNameFromQuery(query: string) {
  const cleaned = query.trim().replace(/^@/, "");
  if (!cleaned) return "Unknown Public Subject";
  return cleaned
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchWithTimeout(url: string, timeoutMs = 3500, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
  };

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}


export function parseHandlesFromBio(bio: string): { platform: string; username: string }[] {
  const found: { platform: string; username: string }[] = [];
  const lowercaseBio = bio.toLowerCase();
  
  const platforms = [
    { name: "instagram", keywords: ["instagram", "ig", "insta"] },
    { name: "twitter", keywords: ["twitter", "x.com", "x:"] },
    { name: "linkedin", keywords: ["linkedin", "li:"] },
    { name: "reddit", keywords: ["reddit", "u/"] },
    { name: "medium", keywords: ["medium"] },
  ];
  
  for (const plat of platforms) {
    for (const keyword of plat.keywords) {
      const idx = lowercaseBio.indexOf(keyword);
      if (idx !== -1) {
        const after = bio.slice(idx + keyword.length);
        const match = after.match(/(?:[:\s\-@=]+)((?:[a-zA-Z0-9_\-\s]+|[.,](?!\s|$))+)/);
        if (match && match[1]) {
          let resolved = match[1].trim();
          const stopWords = [" and ", " at ", " in ", " for ", " on ", " - ", " | "];
          for (const stop of stopWords) {
            const stopIdx = resolved.toLowerCase().indexOf(stop);
            if (stopIdx !== -1) {
              resolved = resolved.slice(0, stopIdx).trim();
            }
          }
          resolved = resolved.replace(/[.,|()]+$/, "").trim();
          if (resolved && resolved.length > 2 && !["com", "http", "https"].includes(resolved.toLowerCase())) {
            found.push({ platform: plat.name, username: resolved });
          }
        }
      }
    }
  }
  return found;
}

export function buildExpandedSearchQuery(query: string): string {
  const cleaned = query.trim().replace(/^@/, "");
  if (!cleaned) return "";

  if (/^\+?\d{10,15}$/.test(cleaned) || cleaned.includes("@") || (cleaned.startsWith("0x") && cleaned.length === 42)) {
    return cleaned;
  }

  const parts = cleaned.split(/[_\-\s]+/);
  if (parts.length > 1) {
    const spaceVariant = parts.join(" ");
    const hyphenVariant = parts.join("-");
    const underscoreVariant = parts.join("_");
    const concatVariant = parts.join("");
    return `("${spaceVariant}" OR "${hyphenVariant}" OR "${underscoreVariant}" OR "${concatVariant}")`;
  }

  return cleaned;
}

export function levenshteinDistance(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

export function extractMeta(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match && match[1] ? match[1].trim() : "";
}

export async function fetchProfileViaSearchEngineAndWayback(
  platform: string,
  username: string,
  profileUrl: string
): Promise<any | null> {
  const lowerUser = username.toLowerCase();
  const lowerPlatform = platform.toLowerCase();
  
  let title = "";
  let description = "";
  let followers = "";
  let searchEngine = "";
  let html = "";
  
  try {
    console.log(`[OSINT-SEARCH] Querying Yahoo for site:${lowerPlatform}.com/${username}...`);
    const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(`site:${lowerPlatform}.com/${username}`)}`;
    const resp = await fetchWithTimeout(yahooUrl, 4500);
    if (resp.ok) {
      html = await resp.text();
      searchEngine = "yahoo";
    }
  } catch (e) {
    console.error(`[OSINT-SEARCH] Yahoo search failed for ${platform}:${username}`, e);
  }
  
  if (!html) {
    try {
      console.log(`[OSINT-SEARCH] Querying Bing for site:${lowerPlatform}.com/${username}...`);
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:${lowerPlatform}.com/${username}`)}`;
      const resp = await fetchWithTimeout(bingUrl, 4500, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } });
      if (resp.ok) {
        html = await resp.text();
        searchEngine = "bing";
      }
    } catch (e) {
      console.error(`[OSINT-SEARCH] Bing search failed for ${platform}:${username}`, e);
    }
  }
  
  if (html) {
    if (searchEngine === "yahoo") {
      const blocks = html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi);
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const blockLower = block.toLowerCase();
        if (blockLower.includes(`${lowerPlatform}.com/${lowerUser}`) || blockLower.includes(`${lowerPlatform}.com%2f${lowerUser}`)) {
          const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
          if (h3Match) title = h3Match[1].replace(/<[^>]+>/g, '').trim();
          const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || 
                               block.match(/<p[^>]*class="[^"]*lh-16[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
          if (snippetMatch) description = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
          break;
        }
      }
    } else if (searchEngine === "bing") {
      const blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const blockLower = block.toLowerCase();
        if (blockLower.includes(`${lowerPlatform}.com/${lowerUser}`) || blockLower.includes(`${lowerPlatform}.com%2f${lowerUser}`)) {
          const h2Match = block.match(/<h2><a[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          if (h2Match) title = h2Match[1].replace(/<[^>]+>/g, '').trim();
          
          const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || 
                               block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (snippetMatch) description = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
          break;
        }
      }
    }
  }

  let waybackHtml = "";
  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${lowerPlatform}.com/${username}&output=json&limit=3`;
    const cdxResp = await fetchWithTimeout(cdxUrl, 4000);
    if (cdxResp.ok) {
      const snapshots = await cdxResp.json();
      if (Array.isArray(snapshots) && snapshots.length > 1) {
        let latestRow: string[] | null = null;
        for (let i = snapshots.length - 1; i >= 1; i--) {
          if (snapshots[i][4] === "200" && snapshots[i][3] === "text/html") {
            latestRow = snapshots[i];
            break;
          }
        }
        if (latestRow) {
          const timestamp = latestRow[1];
          const original = latestRow[2];
          const rawUrl = `https://web.archive.org/web/${timestamp}id_/${original}`;
          const rawResp = await fetchWithTimeout(rawUrl, 5000);
          if (rawResp.ok) {
            waybackHtml = await rawResp.text();
          }
        }
      }
    }
  } catch (e) {
    console.error(`[OSINT-SEARCH] Wayback CDX failed for ${platform}:${username}`, e);
  }

  if (waybackHtml) {
    const ogTitle = extractMeta(waybackHtml, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                    extractMeta(waybackHtml, /<title[^>]*>([^<]+)<\/title>/i);
    const ogDesc = extractMeta(waybackHtml, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                   extractMeta(waybackHtml, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = extractMeta(waybackHtml, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

    if (ogTitle) title = ogTitle;
    if (ogDesc) description = ogDesc;
    
    const resultObj: any = {
      ok: true,
      status: 200,
      title: title || `${username} on ${platform}`,
      description: description || `Public archived profile retrieved.`,
      verifiedUsername: username,
      verifiedUrl: profileUrl,
    };

    if (lowerPlatform === "instagram") {
      resultObj.instagramMeta = {
        username,
        displayName: title ? title.split(/\s*(?:\(|@)/)[0]?.trim() || title : title,
        bio: description,
        followers: "Not publicly available",
        avatar: ogImage || null,
        profileUrl,
      };
    } else if (lowerPlatform === "youtube") {
      resultObj.youtubeMeta = {
        channelName: title,
        description,
        subscribers: "Not publicly available",
        videoCount: "Not publicly available",
        avatar: ogImage || null,
        profileUrl,
      };
    } else if (lowerPlatform === "pinterest") {
      resultObj.pinterestMeta = {
        displayName: title,
        bio: description,
        followers: "Not publicly available",
        avatar: ogImage || null,
        profileUrl,
      };
    } else if (lowerPlatform === "linkedin") {
      resultObj.linkedinMeta = {
        fullName: title ? title.split(/\s*[|–·•\-]\s*/)[0]?.trim() || title : title,
        jobTitle: title ? title.split(/\s*[|–·•\-]\s*/)[1]?.trim() || null : null,
        company: null,
        education: null,
        headline: title,
        avatar: ogImage || null,
        profileUrl,
        summary: description,
      };
    }

    return resultObj;
  }

  if (title || description) {
    const folMatch = description.match(/(\d+[\d,.]*[kKmM]?)\s*(?:followers|subscribers)/i);
    if (folMatch) followers = folMatch[1];

    const resultObj: any = {
      ok: true,
      status: 200,
      title: title || `${username} on ${platform}`,
      description: description || `Public search index cache retrieved.`,
      verifiedUsername: username,
      verifiedUrl: profileUrl,
    };

    if (lowerPlatform === "instagram") {
      resultObj.instagramMeta = {
        username,
        displayName: title ? title.split(/\s*(?:\(|@)/)[0]?.trim() || title : title,
        bio: description,
        followers: followers || "Not publicly available",
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
        profileUrl,
      };
    } else if (lowerPlatform === "youtube") {
      resultObj.youtubeMeta = {
        channelName: title,
        description,
        subscribers: followers || "Not publicly available",
        videoCount: "Not publicly available",
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
        profileUrl,
      };
    } else if (lowerPlatform === "pinterest") {
      resultObj.pinterestMeta = {
        displayName: title,
        bio: description,
        followers: followers || "Not publicly available",
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
        profileUrl,
      };
    } else if (lowerPlatform === "linkedin") {
      resultObj.linkedinMeta = {
        fullName: title ? title.split(/\s*[|–·•\-]\s*/)[0]?.trim() || title : title,
        jobTitle: title ? title.split(/\s*[|–·•\-]\s*/)[1]?.trim() || null : null,
        company: null,
        education: null,
        headline: title,
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
        profileUrl,
        summary: description,
      };
    }

    return resultObj;
  }

  return null;
}

export async function verifyProfileExistsViaSearch(platform: string, username: string): Promise<string | null> {
  try {
    const lowerUser = username.toLowerCase();
    const lowerPlatform = platform.toLowerCase();

    // Short-circuit for demo users
    if (lowerPlatform === "linkedin") {
      if (lowerUser.includes("pradhyut") || lowerUser.includes("pradhh") || lowerUser.includes("kuruvadi")) {
        return "pradhyuth-kuruvadi";
      }
      if (lowerUser.includes("meghana")) {
        return "meghana-kuruvadi";
      }
      if (lowerUser.includes("shadowtrader") || lowerUser.includes("vikram")) {
        return "vikram-rathore";
      }
      if (lowerUser.includes("sneha") || lowerUser.includes("kulkarni")) {
        return "sneha-kulkarni";
      }
    } else if (lowerPlatform === "instagram") {
      if (lowerUser.includes("pradhh") || lowerUser.includes("pradhyut")) {
        return "pradhh.18";
      }
      if (lowerUser.includes("meghana")) {
        return "meghana_kuruvadi";
      }
    }

    let searchUrl = `https://www.bing.com/search?q=site:${platform}.com/${username}`;
    if (lowerPlatform === "linkedin") {
      const cleanUser = lowerUser.replace(/[._]/g, "-");
      const hyphenated = cleanUser;
      const concat = lowerUser.replace(/[._\-]/g, "");
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`("${hyphenated}" OR "${concat}") site:linkedin.com/in/`)}`;
    } else if (lowerPlatform === "telegram") {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:t.me/${username} OR "t.me/${username}"`)}`;
    } else if (lowerPlatform === "youtube") {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:youtube.com/@${username} OR site:youtube.com/user/${username} OR site:youtube.com/c/${username}`)}`;
    } else if (lowerPlatform === "facebook") {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:facebook.com/${username}`)}`;
    } else if (lowerPlatform === "reddit") {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:reddit.com/user/${username}`)}`;
    } else if (lowerPlatform === "tumblr") {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`"${username}.tumblr.com"`)}`;
    } else if (lowerPlatform === "pinterest") {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:pinterest.com/${username}`)}`;
    }
    const resp = await fetchWithTimeout(searchUrl, 4500, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } });
    if (resp.ok) {
      const html = await resp.text();
      const blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);
      
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const urlMatch = block.match(/href="([^"]+)"/i);
        if (urlMatch) {
          let decodedUrl = "";
          const rawUrl = urlMatch[1];
          if (!rawUrl.includes("bing.com/")) {
            decodedUrl = rawUrl.toLowerCase();
          }

          if (lowerPlatform === "linkedin") {
            const cleanUser = lowerUser.replace(/[._]/g, "-");
            const hyphenated = cleanUser;
            const concat = lowerUser.replace(/[._\-]/g, "");
            if (decodedUrl.includes(`linkedin.com/in/${hyphenated}`)) {
              return hyphenated;
            }
            if (decodedUrl.includes(`linkedin.com/in/${concat}`)) {
              return concat;
            }
          } else if (lowerPlatform === "telegram") {
            if (decodedUrl.includes(`t.me/${lowerUser}`) || decodedUrl.includes(`telegram.me/${lowerUser}`)) {
              return username;
            }
          } else if (lowerPlatform === "youtube") {
            if (decodedUrl.includes(`youtube.com/@${lowerUser}`) || decodedUrl.includes(`youtube.com/user/${lowerUser}`) || decodedUrl.includes(`youtube.com/c/${lowerUser}`)) {
              return username;
            }
          } else if (lowerPlatform === "facebook") {
            if (decodedUrl.includes(`facebook.com/${lowerUser}`) || decodedUrl.includes(`facebook.com/profile.php`)) {
              return username;
            }
          } else if (lowerPlatform === "tumblr") {
            if (decodedUrl.includes(`${lowerUser}.tumblr.com`)) {
              return username;
            }
          } else if (lowerPlatform === "reddit") {
            if (decodedUrl.includes(`reddit.com/user/${lowerUser}`) || decodedUrl.includes(`reddit.com/u/${lowerUser}`)) {
              return username;
            }
          } else {
            if (decodedUrl.includes(`${lowerPlatform}.com/${lowerUser}`)) {
              return username;
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// ─── LinkedIn meta extraction ─────────────────────────────────────────────────
// Parses headline patterns from og:description / meta description tags.
// LinkedIn publicly exposes: "[Full Name] - [Role] at [Company] | LinkedIn"
// og:description: "[Role] at [Company] · Education: [Institution] · Location: [City] ..."

export interface LinkedinMeta {
  fullName: string | null;
  headline: string | null;
  jobTitle: string | null;
  company: string | null;
  education: string | null;
  location: string | null;
  avatar: string | null;
  profileUrl: string | null;
  summary: string | null;
}

export function extractLinkedinMeta(html: string, username: string): LinkedinMeta {
  const ogTitle =
    extractMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i);

  const ogDesc =
    extractMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    extractMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  // Full name: og:title is usually "[Name] - [Headline] | LinkedIn"
  let fullName: string | null = null;
  if (ogTitle) {
    const namePart = ogTitle.split(/\s*[|–-]\s*/)[0]?.trim();
    if (namePart && !namePart.toLowerCase().includes("linkedin") && namePart.length > 1) {
      fullName = namePart;
    }
  }

  // Headline: everything after the name in og:title, or first sentence of description
  let headline: string | null = null;
  if (ogTitle) {
    const parts = ogTitle.split(/\s*[|–-]\s*/);
    if (parts.length >= 2) {
      const h = parts[1]?.trim();
      if (h && !h.toLowerCase().includes("linkedin")) headline = h;
    }
  }
  if (!headline && ogDesc) {
    headline = ogDesc.split(/[.\n]/)[0]?.trim() || null;
  }

  // jobTitle + company: headline is typically "Software Engineer at Google" or "CEO · Company"
  let jobTitle: string | null = null;
  let company: string | null = null;
  if (headline) {
    const atMatch = headline.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|·\-]|$)/i);
    if (atMatch) {
      jobTitle = atMatch[1]?.trim() || null;
      company  = atMatch[2]?.trim() || null;
    } else {
      const dotMatch = headline.match(/^(.+?)\s*[·•]\s*(.+)/);
      if (dotMatch) {
        jobTitle = dotMatch[1]?.trim() || null;
        company  = dotMatch[2]?.trim() || null;
      }
    }
  }

  // Education: look for "Education: [Institution]" or common university keywords in description
  let education: string | null = null;
  if (ogDesc) {
    const eduMatch = ogDesc.match(/Education:\s*([^·\n|.]+)/i);
    if (eduMatch) {
      education = eduMatch[1].trim();
    } else {
      const uniKw = /\b(?:university|college|institute|school|iit|iiit|bits|vtu|nit)\b/i;
      const segments = ogDesc.split(/[·|•]/).map(s => s.trim());
      for (const seg of segments) {
        if (uniKw.test(seg) && seg.length > 4 && seg.length < 80) {
          education = seg;
          break;
        }
      }
    }
  }


  // Location: look for location key indicators in ogDesc
  let location: string | null = null;
  if (ogDesc) {
    const locMatch = ogDesc.match(/(?:Location|Based in):\s*([^·\n|.]+)/i) || ogDesc.match(/(?:in|around)\s+([^·\n|.,]+(?:,\s*[^·\n|.]+)?)\s*·/i);
    if (locMatch) {
      location = locMatch[1].trim();
    }
  }

  const avatar = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || null;
  const profileUrl = `https://www.linkedin.com/in/${username}`;
  const summary = ogDesc || null;

  return { 
    fullName, 
    headline, 
    jobTitle, 
    company, 
    education,
    location,
    avatar,
    profileUrl,
    summary
  };
}

export interface YoutubeMeta {
  channelName: string | null;
  description: string | null;
  subscribers: string;
  videoCount: string;
  avatar: string | null;
  channelUrl: string;
}

export interface PinterestMeta {
  displayName: string | null;
  bio: string | null;
  followers: string;
  avatar: string | null;
  profileUrl: string;
}

export interface InstagramMeta {
  username: string;
  displayName: string | null;
  bio: string | null;
  website: string | null;
  followers: string;
  avatar: string | null;
  profileUrl: string;
}

export async function probePublicProfile(url: string): Promise<ProbeResult & {
  linkedinMeta?: LinkedinMeta;
  instagramMeta?: InstagramMeta;
  youtubeMeta?: YoutubeMeta;
  pinterestMeta?: PinterestMeta;
}> {
  const lowercaseUrl = url.toLowerCase();

  // Delegate demo user probe overrides to the demo data module
  const demoResult = getDemoProbeResult(lowercaseUrl);

  if (demoResult) return demoResult;

  // ── Reddit: use JSON API instead of scraping JS-rendered HTML ───────────────
  if (lowercaseUrl.includes("reddit.com/user/")) {
    const redditUser = lowercaseUrl.split("reddit.com/user/")[1]?.split("/")[0]?.split("?")[0] || "";
    if (redditUser) {
      try {
        const jsonResp = await fetchWithTimeout(`https://www.reddit.com/user/${redditUser}/about.json`, 5000);
        if (jsonResp.ok) {
          const data = await jsonResp.json();
          if (data?.data?.name) {
            return { ok: true, status: 200, title: data.data.name, description: data.data.subreddit?.public_description || "Active Reddit account found." };
          }
        }
        return { ok: false, status: jsonResp.status };
      } catch {
        return { ok: false };
      }
    }
  }

  // ── Instagram: use internal web API to bypass the login wall ─────────────────
  // Instagram's web app makes this call itself — no auth required, just the app ID.
  if (lowercaseUrl.includes("instagram.com/") && !lowercaseUrl.includes("/p/") && !lowercaseUrl.includes("/reel/")) {
    const igUser = lowercaseUrl.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || "";
    if (igUser && igUser.length > 0 && !igUser.startsWith("explore") && !igUser.startsWith("accounts")) {
      try {
        const igApiResp = await fetchWithTimeout(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${igUser}`,
          5500,
          {
            headers: {
              "x-ig-app-id": "936619743392459",
              "x-requested-with": "XMLHttpRequest",
              Referer: "https://www.instagram.com/",
              Accept: "application/json",
            },
          }
        );
        if (igApiResp.ok) {
          const igData = await igApiResp.json();
          const igProfile = igData?.data?.user;
          if (igProfile) {
            const isPrivate: boolean = igProfile.is_private ?? false;
            const followerCount: number = igProfile.edge_followed_by?.count ?? 0;
            const instagramMeta: InstagramMeta = {
              username:    igProfile.username    || igUser,
              displayName: igProfile.full_name   || null,
              bio:         igProfile.biography   || null,
              website:     igProfile.external_url || null,
              followers:   String(followerCount),
              avatar:      igProfile.profile_pic_url_hd || igProfile.profile_pic_url || null,
              profileUrl:  url,
            };
            return {
              ok: !isPrivate,
              status: isPrivate ? 401 : 200,
              title:   igProfile.full_name || igUser,
              description: igProfile.biography || `Instagram profile for @${igUser}.`,
              instagramMeta,
            };
          }
        }
        // API returned non-200 (private / suspended / not found) — don't fall through
        if (igApiResp.status === 404) return { ok: false, status: 404 };
      } catch {
        // Network failure — fall through to standard HTML probe
      }
    }
  }


  // ── TikTok: use oEmbed endpoint instead of scraping Cloudflare-protected HTML ──
  if (lowercaseUrl.includes("tiktok.com/@")) {
    const tikUser = lowercaseUrl.split("tiktok.com/@")[1]?.split("/")[0]?.split("?")[0] || "";
    if (tikUser) {
      try {
        const oembedResp = await fetchWithTimeout(
          `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${tikUser}`,
          5000
        );
        if (oembedResp.ok) {
          const data = await oembedResp.json();
          if (data?.author_name) {
            return {
              ok: true,
              status: 200,
              title: data.author_name,
              description: data.title || `TikTok creator @${tikUser}`,
            };
          }
        }
        if (oembedResp.status === 404) return { ok: false, status: 404 };
      } catch {
        // fall through to HTML probe
      }
    }
  }

  // ── Medium: use RSS feed instead of scraping login-walled HTML ───────────────
  if (lowercaseUrl.includes("medium.com/@")) {
    const medUser = lowercaseUrl.split("medium.com/@")[1]?.split("/")[0]?.split("?")[0] || "";
    if (medUser) {
      try {
        const rssResp = await fetchWithTimeout(
          `https://medium.com/feed/@${medUser}`,
          5000,
          { headers: { Accept: "application/rss+xml, application/xml, text/xml" } }
        );
        if (rssResp.ok) {
          const rssXml = await rssResp.text();
          // Valid RSS feed = account exists
          if (rssXml.includes("<rss") || rssXml.includes("<feed")) {
            const titleMatch = rssXml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                               rssXml.match(/<title>([^<]+)<\/title>/);
            const displayName = titleMatch?.[1]?.replace(/ – Medium$/, "").trim() || medUser;
            // Count articles
            const articleCount = (rssXml.match(/<item>/g) || []).length;
            return {
              ok: true,
              status: 200,
              title: displayName,
              description: `Medium writer with ${articleCount} public article${articleCount !== 1 ? "s" : ""}.`,
            };
          }
        }
        if (rssResp.status === 404) return { ok: false, status: 404 };
      } catch {
        // fall through to HTML probe
      }
    }
  }

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      if (response.status === 429 || response.status === 999 || response.status === 403) {
        const platformName = lowercaseUrl.includes("instagram.com") ? "instagram"
          : lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com") ? "twitter"
          : lowercaseUrl.includes("linkedin.com") ? "linkedin"
          : lowercaseUrl.includes("t.me") ? "telegram"
          : lowercaseUrl.includes("facebook.com") ? "facebook"
          : lowercaseUrl.includes("youtube.com") ? "youtube"
          : lowercaseUrl.includes("pinterest.com") ? "pinterest"
          : lowercaseUrl.includes(".tumblr.com") ? "tumblr"
          : "";
        if (platformName) {
          let usernamePart = "";
          if (platformName === "linkedin") {
            usernamePart = lowercaseUrl.split("linkedin.com/in/")[1]?.split("/")[0]?.split("?")[0] || "";
          } else if (platformName === "telegram") {
            usernamePart = lowercaseUrl.split("t.me/")[1]?.split("/")[0]?.split("?")[0] || "";
          } else if (platformName === "youtube") {
            const splitAt = lowercaseUrl.includes("youtube.com/@") ? "youtube.com/@" : "youtube.com/";
            usernamePart = lowercaseUrl.split(splitAt)[1]?.split("/")[0]?.split("?")[0] || "";
            if (usernamePart === "user" || usernamePart === "c" || usernamePart === "channel") {
              usernamePart = lowercaseUrl.split("youtube.com/")[1]?.split("/")[1]?.split("?")[0] || "";
            }
          } else if (platformName === "pinterest") {
            usernamePart = lowercaseUrl.split("pinterest.com/")[1]?.split("/")[0]?.split("?")[0] || "";
          } else if (platformName === "tumblr") {
            usernamePart = lowercaseUrl.split("//")[1]?.split(".tumblr.com")[0] || "";
          } else {
            usernamePart = lowercaseUrl.split(`${platformName}.com/`)[1]?.split("/")[0]?.split("?")[0] || "";
          }
          if (usernamePart) {
            const fallbackResult = await fetchProfileViaSearchEngineAndWayback(platformName, usernamePart, url);
            if (fallbackResult) {
              return fallbackResult;
            }
            const verifiedUsername = await verifyProfileExistsViaSearch(platformName, usernamePart);
            if (verifiedUsername) {
              const verifiedUrl = platformName === "linkedin" ? `https://www.linkedin.com/in/${verifiedUsername}`
                : platformName === "tumblr" ? `https://${verifiedUsername}.tumblr.com`
                : lowercaseUrl;
              return { ok: true, status: 200, title: `${verifiedUsername} on ${platformName}`, description: `Public profile found and verified via search indexing.`, verifiedUsername, verifiedUrl };
            }
          }
        }
      }
      return { ok: response.status < 400, status: response.status };
    }

    const html = await response.text();
    const title = extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i);
    const description =
      extractMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      extractMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

    const lowerTitle = title?.toLowerCase() || "";
    
    // Check for login redirects or authorization checks
    if (lowerTitle.includes("login") || lowerTitle.includes("sign in") || lowerTitle.includes("log in") || lowerTitle.includes("sign up") || lowerTitle.includes("register") || lowerTitle.includes("authorize") || lowerTitle.includes("sign-in")) {
      const platformName = lowercaseUrl.includes("instagram.com") ? "instagram"
        : lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com") ? "twitter"
        : lowercaseUrl.includes("linkedin.com") ? "linkedin"
        : lowercaseUrl.includes("facebook.com") ? "facebook"
        : lowercaseUrl.includes("youtube.com") ? "youtube"
        : lowercaseUrl.includes("pinterest.com") ? "pinterest"
        : lowercaseUrl.includes(".tumblr.com") ? "tumblr"
        : "";
      if (platformName) {
        let usernamePart = "";
        if (platformName === "linkedin") {
          usernamePart = lowercaseUrl.split("linkedin.com/in/")[1]?.split("/")[0]?.split("?")[0] || "";
        } else if (platformName === "youtube") {
          const splitAt = lowercaseUrl.includes("youtube.com/@") ? "youtube.com/@" : "youtube.com/";
          usernamePart = lowercaseUrl.split(splitAt)[1]?.split("/")[0]?.split("?")[0] || "";
          if (usernamePart === "user" || usernamePart === "c" || usernamePart === "channel") {
            usernamePart = lowercaseUrl.split("youtube.com/")[1]?.split("/")[1]?.split("?")[0] || "";
          }
        } else if (platformName === "pinterest") {
          usernamePart = lowercaseUrl.split("pinterest.com/")[1]?.split("/")[0]?.split("?")[0] || "";
        } else if (platformName === "tumblr") {
          usernamePart = lowercaseUrl.split("//")[1]?.split(".tumblr.com")[0] || "";
        } else {
          usernamePart = lowercaseUrl.split(`${platformName}.com/`)[1]?.split("/")[0]?.split("?")[0] || "";
        }
        if (usernamePart) {
          const fallbackResult = await fetchProfileViaSearchEngineAndWayback(platformName, usernamePart, url);
          if (fallbackResult) {
            return fallbackResult;
          }
          const verifiedUsername = await verifyProfileExistsViaSearch(platformName, usernamePart);
          if (verifiedUsername) {
            const verifiedUrl = platformName === "linkedin" ? `https://www.linkedin.com/in/${verifiedUsername}`
              : platformName === "tumblr" ? `https://${verifiedUsername}.tumblr.com`
              : lowercaseUrl;
            return { ok: true, status: 200, title: `${verifiedUsername} on ${platformName}`, description: `Public profile found and verified via search indexing.`, verifiedUsername, verifiedUrl };
          }
        }
      }
      return { ok: false, status: response.status, title, description };
    }
    
    // Check for generic homepage landing page titles (indicating redirects)
    const genericTitles = [
      "twitter", "x", "x / home", "instagram", "facebook",
      "reddit: the front page of the internet", "reddit - dive into anything",
      "pinterest", "tumblr", "soundcloud", "medium", "steam community",
      "telegram", "telegram web", "youtube",
    ];
    if (genericTitles.some(gt => lowerTitle === gt || lowerTitle.startsWith(gt + " - ") || lowerTitle.endsWith(" | log in") || lowerTitle.endsWith(" | sign in"))) {
      const platformName = lowercaseUrl.includes("instagram.com") ? "instagram"
        : lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com") ? "twitter"
        : lowercaseUrl.includes("linkedin.com") ? "linkedin"
        : lowercaseUrl.includes("t.me") ? "telegram"
        : lowercaseUrl.includes("facebook.com") ? "facebook"
        : lowercaseUrl.includes("youtube.com") ? "youtube"
        : lowercaseUrl.includes("pinterest.com") ? "pinterest"
        : lowercaseUrl.includes(".tumblr.com") ? "tumblr"
        : "";
      if (platformName) {
        let usernamePart = "";
        if (platformName === "linkedin") {
          usernamePart = lowercaseUrl.split("linkedin.com/in/")[1]?.split("/")[0]?.split("?")[0] || "";
        } else if (platformName === "telegram") {
          usernamePart = lowercaseUrl.split("t.me/")[1]?.split("/")[0]?.split("?")[0] || "";
        } else if (platformName === "youtube") {
          const splitAt = lowercaseUrl.includes("youtube.com/@") ? "youtube.com/@" : "youtube.com/";
          usernamePart = lowercaseUrl.split(splitAt)[1]?.split("/")[0]?.split("?")[0] || "";
          if (usernamePart === "user" || usernamePart === "c" || usernamePart === "channel") {
            usernamePart = lowercaseUrl.split("youtube.com/")[1]?.split("/")[1]?.split("?")[0] || "";
          }
        } else if (platformName === "pinterest") {
          usernamePart = lowercaseUrl.split("pinterest.com/")[1]?.split("/")[0]?.split("?")[0] || "";
        } else if (platformName === "tumblr") {
          usernamePart = lowercaseUrl.split("//")[1]?.split(".tumblr.com")[0] || "";
        } else {
          usernamePart = lowercaseUrl.split(`${platformName}.com/`)[1]?.split("/")[0]?.split("?")[0] || "";
        }
        if (usernamePart) {
          const fallbackResult = await fetchProfileViaSearchEngineAndWayback(platformName, usernamePart, url);
          if (fallbackResult) {
            return fallbackResult;
          }
          const verifiedUsername = await verifyProfileExistsViaSearch(platformName, usernamePart);
          if (verifiedUsername) {
            const verifiedUrl = platformName === "linkedin" ? `https://www.linkedin.com/in/${verifiedUsername}`
              : platformName === "tumblr" ? `https://${verifiedUsername}.tumblr.com`
              : lowercaseUrl;
            return { ok: true, status: 200, title: `${verifiedUsername} on ${platformName}`, description: `Public profile found and verified via search indexing.`, verifiedUsername, verifiedUrl };
          }
        }
      }
      return { ok: false, status: response.status, title, description };
    }

    // ── LinkedIn meta extraction ─────────────────────────────────────────
    if (lowercaseUrl.includes("linkedin.com/in/")) {
      const liUsername = lowercaseUrl.split("linkedin.com/in/")[1]?.split("/")[0]?.split("?")[0] || "";
      const linkedinMeta = extractLinkedinMeta(html, liUsername);
      const isRealProfile = !!/not found|page doesn't exist|this account doesn't exist|404|no such user/i.test(`${title} ${description} ${html}`) === false;
      console.log(`[LINKEDIN] Meta extracted for "${liUsername}": name="${linkedinMeta.fullName}", title="${linkedinMeta.jobTitle}", company="${linkedinMeta.company}"`);
      return {
        ok: isRealProfile,
        status: response.status,
        title,
        description,
        linkedinMeta,
      };
    }

    // ── Instagram meta extraction ────────────────────────────────────────
    if (lowercaseUrl.includes("instagram.com/")) {
      const username = lowercaseUrl.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || "";
      let followers = "Not publicly available";
      const folMatch = html.match(/([\d.,kKmM]+)\s+followers/i);
      if (folMatch) followers = folMatch[1];
      let website = "Not publicly available";
      const webMatch = html.match(/"external_url":\s*"([^"]+)"/);
      if (webMatch) website = webMatch[1];
      const avatar = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || null;

      const instagramMeta: InstagramMeta = {
        username,
        displayName: title || null,
        bio: description || null,
        website: website !== "Not publicly available" ? website : null,
        followers,
        avatar,
        profileUrl: url
      };
      return {
        ok: !/not found|page doesn't exist|this account doesn't exist|404|no such user/i.test(`${title} ${description} ${html}`),
        status: response.status,
        title,
        description,
        instagramMeta
      };
    }

    // ── YouTube meta extraction ──────────────────────────────────────────
    if (lowercaseUrl.includes("youtube.com/")) {
      let subscribers = "Not publicly available";
      const subMatch = html.match(/"subscriberCountText":\s*\{\s*"simpleText":\s*"([^"]+)"\s*\}/) || html.match(/([^"\s]+)\s+subscribers/i);
      if (subMatch) subscribers = subMatch[1];
      let videoCount = "Not publicly available";
      const vidMatch = html.match(/"videoCountText":\s*\{\s*"simpleText":\s*"([^"]+)"\s*\}/) || html.match(/([^"\s]+)\s+videos/i);
      if (vidMatch) videoCount = vidMatch[1];
      const avatar = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || null;

      const youtubeMeta: YoutubeMeta = {
        channelName: title || null,
        description: description || null,
        subscribers,
        videoCount,
        avatar,
        channelUrl: url
      };
      return {
        ok: !/not found|404|no such channel/i.test(`${title} ${description} ${html}`),
        status: response.status,
        title,
        description,
        youtubeMeta
      };
    }

    // ── Pinterest meta extraction ────────────────────────────────────────
    if (lowercaseUrl.includes("pinterest.com/")) {
      let followers = "Not publicly available";
      const folMatch = html.match(/"follower_count":\s*(\d+)/) || html.match(/([^"\s]+)\s+followers/i);
      if (folMatch) followers = folMatch[1];
      const avatar = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || null;

      const pinterestMeta: PinterestMeta = {
        displayName: title || null,
        bio: description || null,
        followers,
        avatar,
        profileUrl: url
      };
      return {
        ok: !/not found|404|no such page/i.test(`${title} ${description} ${html}`),
        status: response.status,
        title,
        description,
        pinterestMeta
      };
    }

    return {
      ok: !/not found|page doesn't exist|this account doesn't exist|404|no such user/i.test(`${title} ${description} ${html}`),
      status: response.status,
      title,
      description,
    };
  } catch {
    return { ok: false };
  }
}


export function formatGithubEvent(event: any): Post {
  let content = `${event.type?.replace("Event", "") || "Activity"} activity on ${event.repo?.name || "a public repository"}`;
  
  if (event.type === "PushEvent" && event.payload?.commits) {
    const commits = event.payload.commits;
    if (Array.isArray(commits) && commits.length > 0) {
      const commitMsgs = commits.slice(0, 3).map((c: any) => `'${c.message || ""}'`).join(", ");
      const moreStr = commits.length > 3 ? ` and ${commits.length - 3} more` : "";
      content = `Pushed ${commits.length} commit${commits.length > 1 ? "s" : ""} to ${event.repo?.name || "repository"}: ${commitMsgs}${moreStr}`;
    } else {
      content = `Pushed commits to ${event.repo?.name || "repository"}`;
    }
  } else if (event.type === "CreateEvent") {
    content = `Created ${event.payload?.ref_type || "repository"} ${event.payload?.ref || ""} in ${event.repo?.name || "a public repository"}`;
  } else if (event.type === "PullRequestEvent") {
    content = `${event.payload?.action || "Opened"} Pull Request #${event.payload?.number || ""} in ${event.repo?.name || "repository"}`;
  } else if (event.type === "IssuesEvent") {
    content = `${event.payload?.action || "Opened"} issue #${event.payload?.issue?.number || ""} in ${event.repo?.name || "repository"}`;
  }
  
  return {
    id: `github-${event.id}`,
    platform: "github",
    content,
    postedAt: event.created_at,
    flagLevel: "NORMAL",
    capturedAt: new Date().toISOString(),
  };
}

export async function fuzzyGithubSearch(username: string, githubTokenOverride?: string): Promise<{ account?: Partial<PlatformAccount>; posts: Post[]; resolvedUsername?: string }> {
  try {
    const token = githubTokenOverride || process.env.GITHUB_TOKEN;
    const requestOptions: RequestInit = {
      headers: {
        Accept: "application/vnd.github.v3+json",
      }
    };
    if (token) {
      (requestOptions.headers as Record<string, string>)["Authorization"] = `token ${token}`;
    }

    const searchResp = await fetchWithTimeout(
      `https://api.github.com/search/users?q=${encodeURIComponent(username)}+in:login&per_page=5`,
      7000,
      requestOptions
    );
    if (!searchResp.ok) return { posts: [] };
    const searchData = await searchResp.json();

    if (!searchData.items || searchData.items.length === 0) return { posts: [] };

    const lowerQuery = username.toLowerCase();
    const ranked = searchData.items
      .map((item: any) => ({
        login: item.login as string,
        distance: levenshteinDistance(lowerQuery, (item.login as string).toLowerCase()),
        avatarUrl: item.avatar_url as string,
      }))
      .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

    const maxDistance = lowerQuery.length <= 5 ? 1 : lowerQuery.length <= 9 ? 2 : 3;
    const bestMatch = ranked[0];
    if (!bestMatch || bestMatch.distance > maxDistance) return { posts: [] };

    const resolvedUsername = bestMatch.login;
    console.log(`[SOCMINT] Fuzzy match: "${username}" → "${resolvedUsername}" (edit distance: ${bestMatch.distance})`);

    const [userResp, eventsResp] = await Promise.all([
      fetchWithTimeout(`https://api.github.com/users/${resolvedUsername}`, 3500, requestOptions),
      fetchWithTimeout(`https://api.github.com/users/${resolvedUsername}/events/public?per_page=5`, 3500, requestOptions),
    ]);

    if (!userResp.ok) return { posts: [] };


    const user = await userResp.json();
    const events = eventsResp.ok ? await eventsResp.json() : [];

    const posts: Post[] = Array.isArray(events)
      ? events.slice(0, 5).map((event: any) => formatGithubEvent(event))
      : [];

    return {
      account: {
        displayName: user.name || user.login,
        bio: user.bio || "Public GitHub profile found. No bio exposed.",
        profilePicUrl: user.avatar_url,
        followers: user.followers || 0,
        creationDate: user.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      },
      posts,
      resolvedUsername,
    };
  } catch {
    return { posts: [] };
  }
}

export async function fetchGithubActivity(username: string, isNameQuery = false, githubTokenOverride?: string): Promise<{ account?: Partial<PlatformAccount>; posts: Post[]; resolvedUsername?: string; errorStatus?: number }> {
  try {
    const token = githubTokenOverride || process.env.GITHUB_TOKEN;
    const requestOptions: RequestInit = {
      headers: {
        Accept: "application/vnd.github.v3+json",
      }
    };
    if (token) {
      (requestOptions.headers as Record<string, string>)["Authorization"] = `token ${token}`;
    }

    const [userResponse, eventsResponse, reposResponse, orgsResponse] = await Promise.all([
      fetchWithTimeout(`https://api.github.com/users/${username}`, 3500, requestOptions),
      fetchWithTimeout(`https://api.github.com/users/${username}/events/public?per_page=5`, 3500, requestOptions),
      fetchWithTimeout(`https://api.github.com/users/${username}/repos?sort=stars&per_page=10`, 3500, requestOptions),
      fetchWithTimeout(`https://api.github.com/users/${username}/orgs`, 3500, requestOptions),
    ]);


    if (userResponse.ok) {
      const user = await userResponse.json();
      const events = eventsResponse.ok ? await eventsResponse.json() : [];
      const rawRepos = reposResponse.ok ? await reposResponse.json() : [];
      const rawOrgs  = orgsResponse.ok  ? await orgsResponse.json()  : [];

      const posts: Post[] = Array.isArray(events)
        ? events.slice(0, 5).map((event: any) => formatGithubEvent(event))
        : [];

      // ── Build GithubIntelligence ──────────────────────────────────────
      const repos: import("../types").GithubRepo[] = Array.isArray(rawRepos)
        ? rawRepos.slice(0, 10).map((r: any) => ({
            name:        r.name,
            description: r.description ?? null,
            language:    r.language    ?? null,
            stars:       r.stargazers_count ?? 0,
            forks:       r.forks_count      ?? 0,
            topics:      Array.isArray(r.topics) ? r.topics : [],
            homepage:    r.homepage ?? null,
            createdAt:   r.created_at ?? "",
            pushedAt:    r.pushed_at  ?? "",
            url:         r.html_url   ?? `https://github.com/${user.login}/${r.name}`,
          }))
        : [];

      const topRepos = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 3);

      const techStack = [...new Set(
        repos.map(r => r.language).filter((l): l is string => !!l)
      )];

      // ── Extended computations ──
      const langCounts: Record<string, number> = {};
      repos.forEach(r => {
        if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      });
      const primaryLanguage = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      const mostStarredRepo = topRepos[0]?.name || "N/A";
      const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
      const totalForks = repos.reduce((sum, r) => sum + r.forks, 0);

      const categories: Record<string, number> = { Frontend: 0, Backend: 0, "Data Science": 0, System: 0, Other: 0 };
      repos.forEach(r => {
        const lang = (r.language || "").toLowerCase();
        const topicsStr = r.topics.join(" ").toLowerCase();
        if (lang === "javascript" || lang === "typescript" || lang === "html" || lang === "css") {
          categories.Frontend++;
        } else if (lang === "jupyter notebook" || lang === "r" || lang === "julia" || topicsStr.includes("data-science") || topicsStr.includes("machine-learning")) {
          categories["Data Science"]++;
        } else if (lang === "c" || lang === "assembly" || lang === "makefile" || lang === "shell") {
          categories.System++;
        } else if (lang === "python" || lang === "go" || lang === "rust" || lang === "ruby" || lang === "php" || lang === "java" || lang === "c#" || lang === "c++") {
          categories.Backend++;
        } else {
          categories.Other++;
        }
      });
      const repoCategories = Object.entries(categories).map(([category, count]) => ({ category, count })).filter(c => c.count > 0);
      const allTopics = [...new Set(repos.flatMap(r => r.topics))].slice(0, 15);

      const orgs: { login: string; description: string | null }[] = Array.isArray(rawOrgs)
        ? rawOrgs.slice(0, 8).map((o: any) => ({
            login:       o.login,
            description: o.description ?? null,
          }))
        : [];

      const createdAt   = user.created_at ?? new Date().toISOString();
      const updatedAt   = user.updated_at ?? new Date().toISOString();
      const accountAgeDays = Math.floor(
        (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const seniorityEstimate = (accountAgeDays > 1825 && user.public_repos > 20)
        ? "Senior Developer" as const
        : (accountAgeDays > 730 && user.public_repos > 5)
          ? "Mid-Level Developer" as const
          : "Junior / Hobbyist Developer" as const;

      const githubIntel: import("../types").GithubIntelligence = {
        login:         user.login,
        name:          user.name          ?? null,
        company:       user.company       ?? null,
        blog:          user.blog          || null,
        location:      user.location      ?? null,
        email:         user.email         ?? null,
        hireable:      user.hireable      ?? null,
        publicRepos:   user.public_repos  ?? 0,
        publicGists:   user.public_gists  ?? 0,
        followers:     user.followers     ?? 0,
        following:     user.following     ?? 0,
        createdAt,
        updatedAt,
        accountAgeDays,
        topRepos,
        techStack,
        organizations: orgs,
        primaryLanguage,
        mostStarredRepo,
        totalStars,
        totalForks,
        repoCategories,
        allTopics,
        seniorityEstimate,
      };


      console.log(`[GITHUB] ✓ Live API success for "${username}" → ${user.login} (${user.followers} followers, ${repos.length} repos, ${orgs.length} orgs)`);
      return {
        account: {
          displayName:  user.name || user.login,
          bio:          user.bio  || "Public GitHub profile found. No bio exposed.",
          profilePicUrl: user.avatar_url,
          followers:    user.followers || 0,
          creationDate: createdAt.slice(0, 10),
          githubIntel,
        },
        posts,
        resolvedUsername: user.login,
      };
    }

    // Live API returned non-OK (e.g. 404). Try demo data first, then fuzzy search.
    console.log(`[GITHUB] Live API returned ${userResponse.status} for "${username}"`);
    const demoData = getDemoGithubData(username);
    if (demoData) {
      console.log(`[GITHUB] ✓ Demo data fallback used for "${username}"`);
      return { ...demoData, errorStatus: userResponse.status } as any;
    }

    return { posts: [], errorStatus: userResponse.status };

    // Last resort: fuzzy username search
    return await fuzzyGithubSearch(username);

  } catch (err) {
    console.error(`[GITHUB] Network error for "${username}":`, err);
    // On network failure, try demo data
    const demoData = getDemoGithubData(username);
    if (demoData) return demoData;
    return { posts: [] };
  }
}

export async function fetchRedditActivity(username: string): Promise<Post[]> {
  try {
    // Fire both about and submitted concurrently
    const [aboutResp, submittedResp] = await Promise.all([
      fetchWithTimeout(`https://www.reddit.com/user/${username}/about.json`),
      fetchWithTimeout(`https://www.reddit.com/user/${username}/submitted.json?limit=25`),
    ]);

    if (!aboutResp.ok) {
      const posts: Post[] = [];
      (posts as any)._errorStatus = aboutResp.status;
      // Use demo data if available
      const demoData = getDemoProbeResult(`https://www.reddit.com/user/${username}`);
      if (demoData) {
        return posts;
      }
      return posts;
    }

    const children: any[] = [];
    let redditIntel: import("../types").RedditIntelligence | undefined;

    // ── Parse about.json ─────────────────────────────────────────────────
    if (aboutResp.ok) {
      const aboutData = await aboutResp.json();
      const d = aboutData?.data;
      if (d) {
        const cakeDay      = d.created_utc
          ? new Date(d.created_utc * 1000).toISOString()
          : new Date().toISOString();
        const accountAgeDays = Math.floor(
          (Date.now() - new Date(cakeDay).getTime()) / (1000 * 60 * 60 * 24)
        );
        redditIntel = {
          commentKarma:     d.comment_karma   ?? 0,
          linkKarma:        d.link_karma       ?? 0,
          totalKarma:       (d.comment_karma ?? 0) + (d.link_karma ?? 0),
          cakeDay,
          isGold:           d.is_gold          ?? false,
          verified:         d.verified         ?? false,
          topSubreddits:    [],   // filled after parsing posts
          postingFrequency: 0,    // filled after parsing posts
          topKeywords:      [],   // filled after parsing posts
          accountAgeDays,
        };
      }
    }

    // ── Parse submitted.json ─────────────────────────────────────────────
    if (submittedResp.ok) {
      const data = await submittedResp.json();
      const raw  = data?.data?.children;
      if (Array.isArray(raw)) children.push(...raw);
    }

    // ── Derive community activity stats ──────────────────────────────────
    if (redditIntel && children.length > 0) {
      // Subreddit frequency map
      const srMap: Record<string, number> = {};
      for (const c of children) {
        const sr = c.data?.subreddit as string | undefined;
        if (sr) srMap[sr] = (srMap[sr] ?? 0) + 1;
      }
      redditIntel.topSubreddits = Object.entries(srMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([subreddit, count]) => ({ subreddit, count }));

      // Posting frequency: posts per week over the sampled span
      const timestamps = children
        .map(c => c.data?.created_utc as number | undefined)
        .filter((t): t is number => typeof t === "number")
        .sort((a, b) => a - b);
      if (timestamps.length >= 2) {
        const spanDays =
          (timestamps[timestamps.length - 1] - timestamps[0]) / (60 * 60 * 24);
        redditIntel.postingFrequency =
          spanDays > 0
            ? Math.round((children.length / spanDays) * 7 * 10) / 10
            : children.length;
      }

      // Top keywords from post titles (simple frequency, skip stop-words)
      const STOP = new Set([
        "the","a","an","and","or","but","is","are","was","were","i","my","me",
        "in","on","at","to","for","of","with","from","it","this","that","be",
        "have","has","not","by","as","do","can","will","if","so","what","why",
        "how","when","who","any","all","about","just","more","like","than",
        "we","you","he","she","they","its","no","up","out","get",
      ]);
      const wordFreq: Record<string, number> = {};
      for (const c of children) {
        const title: string = c.data?.title ?? "";
        for (const raw of title.toLowerCase().split(/\W+/)) {
          if (raw.length > 3 && !STOP.has(raw)) {
            wordFreq[raw] = (wordFreq[raw] ?? 0) + 1;
          }
        }
      }
      redditIntel.topKeywords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([w]) => w);
    }

    // ── Build Post[] from the fetched submissions ────────────────────────
    const posts: Post[] = children.slice(0, 5).map(
      (child: { data: { id: string; title: string; selftext?: string; created_utc: number; subreddit?: string } }) => ({
        id:        `reddit-${child.data.id}`,
        platform:  "reddit",
        content:   [child.data.title, child.data.selftext].filter(Boolean).join(" - ").slice(0, 420),
        postedAt:  new Date(child.data.created_utc * 1000).toISOString(),
        flagLevel: scoreText(child.data.title + " " + (child.data.selftext || "")) > 0
          ? "SUSPICIOUS"
          : "NORMAL",
        flagReason:  "Keyword match in public Reddit submission.",
        capturedAt:  new Date().toISOString(),
        // Attach intel to the first post so liveSocmint can pick it up
        ...(child === children[0] && redditIntel ? { _redditIntel: redditIntel } : {}),
      })
    );

    // Expose intel on the post array for the caller to pick up
    if (redditIntel) (posts as any)._redditIntel = redditIntel;
    return posts;
  } catch {
    return [];
  }
}


export async function fetchHackerNewsActivity(username: string): Promise<{ account?: Partial<PlatformAccount>; posts: Post[] }> {
  try {
    const userResp = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/user/${username}.json`);
    if (!userResp.ok) return { posts: [] };
    const user = await userResp.json();
    if (!user || user.error) return { posts: [] };

    const submitted: number[] = (user.submitted || []).slice(0, 5);
    const postResults = await Promise.allSettled(
      submitted.map((id) =>
        fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json())
      )
    );

    const posts: Post[] = postResults
      .filter((r) => r.status === "fulfilled" && r.value?.title)
      .map((r) => {
        const item = (r as PromiseFulfilledResult<any>).value;
        const content = [item.title, item.text?.replace(/<[^>]+>/g, " ").slice(0, 200)].filter(Boolean).join(" — ");
        return {
          id: `hn-${item.id}`,
          platform: "hackernews",
          content,
          postedAt: new Date((item.time || 0) * 1000).toISOString(),
          flagLevel: scoreText(content) > 0 ? "SUSPICIOUS" : "NORMAL",
          flagReason: scoreText(content) > 0 ? "Risk keyword match in HackerNews submission." : undefined,
          capturedAt: new Date().toISOString(),
        };
      });

    return {
      account: {
        displayName: user.id,
        bio: `HackerNews user since ${new Date((user.created || 0) * 1000).getFullYear()}. Karma: ${user.karma || 0}.`,
        followers: user.karma || 0,
        creationDate: new Date((user.created || 0) * 1000).toISOString().slice(0, 10),
      },
      posts,
    };
  } catch {
    return { posts: [] };
  }
}

export async function fetchDevToActivity(username: string): Promise<{ account?: Partial<PlatformAccount>; posts: Post[] }> {
  try {
    const [userResp, articlesResp] = await Promise.all([
      fetchWithTimeout(`https://dev.to/api/users/by_username?url=${username}`),
      fetchWithTimeout(`https://dev.to/api/articles?username=${username}&per_page=5`),
    ]);
    if (!userResp.ok) return { posts: [] };
    const user = await userResp.json();
    const articles = articlesResp.ok ? await articlesResp.json() : [];

    const posts: Post[] = Array.isArray(articles)
      ? articles.map((a: any) => ({
          id: `devto-${a.id}`,
          platform: "devto",
          content: `${a.title}${a.description ? ` — ${a.description}` : ""}`,
          postedAt: a.published_at || new Date().toISOString(),
          flagLevel: scoreText(a.title + " " + (a.description || "")) > 0 ? "SUSPICIOUS" : "NORMAL",
          flagReason: "Risk keyword in Dev.to article.",
          capturedAt: new Date().toISOString(),
        }))
      : [];

    return {
      account: {
        displayName: user.name || user.username,
        bio: user.summary || "Dev.to profile found.",
        profilePicUrl: user.profile_image_90 || user.profile_image,
        followers: user.followers_count || 0,
        creationDate: user.joined_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      },
      posts,
    };
  } catch {
    return { posts: [] };
  }
}

export async function fetchGitLabActivity(username: string): Promise<{ account?: Partial<PlatformAccount> & { projects?: string[]; location?: string; followers?: number }; posts: Post[]; errorStatus?: number }> {
  try {
    const resp = await fetchWithTimeout(`https://gitlab.com/api/v4/users?username=${username}&per_page=1`);
    if (!resp.ok) return { posts: [], errorStatus: resp.status };
    const users = await resp.json();
    if (!Array.isArray(users) || users.length === 0) return { posts: [], errorStatus: 404 };
    const user = users[0];

    // Try fetching projects if user exists
    let projects: string[] = [];
    try {
      const projResp = await fetchWithTimeout(`https://gitlab.com/api/v4/users/${user.id}/projects?per_page=5`);
      if (projResp.ok) {
        const projData = await projResp.json();
        if (Array.isArray(projData)) {
          projects = projData.map((p: any) => p.name);
        }
      }
    } catch (e) {
      console.warn("Could not fetch GitLab projects", e);
    }

    return {
      account: {
        displayName: user.name || user.username,
        bio: user.bio || "GitLab public profile found.",
        profilePicUrl: user.avatar_url,
        followers: user.followers || 0,
        creationDate: user.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        profileUrl: user.web_url || `https://gitlab.com/${username}`,
        projects,
        location: user.location || "Not publicly available"
      },
      posts: [],
    };
  } catch {
    return { posts: [] };
  }
}


export async function searchWebForSocialProfiles(query: string, capturedAt: string): Promise<{
  accounts: PlatformAccount[];
  education: { institution: string; degree: string; period: string; webEnriched?: boolean; website?: string; description?: string }[];
  experience: { role: string; company: string; period: string; details: string }[];
  hackathons: { name: string; result: string; year: string; source: string }[];
  suggestedProfiles: { name: string; platform: string; handle: string; profileUrl: string; bio?: string; followers?: number; matchScore: number }[];
}> {
  const discoveredAccounts: PlatformAccount[] = [];
  const education: { institution: string; degree: string; period: string; webEnriched?: boolean; website?: string; description?: string }[] = [];
  const experience: { role: string; company: string; period: string; details: string }[] = [];
  const hackathons: { name: string; result: string; year: string; source: string }[] = [];
  const suggestedProfiles: { name: string; platform: string; handle: string; profileUrl: string; bio?: string; followers?: number; matchScore: number }[] = [];

  try {
    const expanded = buildExpandedSearchQuery(query);
    const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(expanded + " (site:linkedin.com OR site:instagram.com OR site:github.com)")}`;
    
    let html = "";
    let searchEngine = "yahoo";
    
    try {
      console.log(`[OSINT-SEARCH] Querying Yahoo for site search...`);
      const resp = await fetchWithTimeout(searchUrl, 5000);
      if (resp.ok) {
        html = await resp.text();
      }
    } catch (e) {
      console.error(`[OSINT-SEARCH] Yahoo search query failed:`, e);
    }
    
    let blocks = html ? html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi) : [];
    
    // Fall back to Bing Search if Yahoo blocks/fails or returns no results
    if (blocks.length <= 1) {
      try {
        searchEngine = "bing";
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(expanded + " (site:linkedin.com OR site:instagram.com OR site:github.com)")}`;
        console.log(`[OSINT-SEARCH] Fallback: Querying Bing for site search...`);
        const resp = await fetchWithTimeout(bingUrl, 5000, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } });
        if (resp.ok) {
          html = await resp.text();
          blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);
        }
      } catch (e) {
        console.error(`[OSINT-SEARCH] Fallback Bing search query failed:`, e);
      }
    }

    const resultsMap = new Map<string, { url: string; title: string; snippet: string }>();

    if (searchEngine === "yahoo") {
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
        
        const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        let title = '';
        if (h3Match) {
          title = h3Match[1].replace(/<[^>]+>/g, '').trim();
        } else {
          const firstAnchorText = block.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
          if (firstAnchorText) {
            title = firstAnchorText[1].replace(/<[^>]+>/g, '').trim();
          }
        }
        
        const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || 
                             block.match(/<p[^>]*class="[^"]*lh-16[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                             block.match(/<span[^>]*class="[^"]*compDscr[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        
        if (decodedUrl && (title || snippet)) {
          resultsMap.set(decodedUrl, { url: decodedUrl, title, snippet });
        } else if (decodedUrl) {
          resultsMap.set(decodedUrl, { url: decodedUrl, title: title || 'Profile', snippet: snippet || '' });
        } else if (resultsMap.size > 0 && (title || snippet)) {
          const lastKey = Array.from(resultsMap.keys()).pop();
          if (lastKey) {
            const existing = resultsMap.get(lastKey)!;
            resultsMap.set(lastKey, {
              url: existing.url,
              title: existing.title && existing.title !== 'Profile' ? existing.title : title,
              snippet: existing.snippet ? existing.snippet : snippet
            });
          }
        }
      }
    } else if (searchEngine === "bing") {
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const hrefMatch = block.match(/href="([^"]*)"/i);
        const decodedUrl = hrefMatch ? hrefMatch[1] : "";
        if (!decodedUrl || decodedUrl.includes("bing.com/")) continue;
        
        const h2Match = block.match(/<h2><a[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        let title = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : "";
        
        const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || 
                             block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        let snippet = '';
        if (snippetMatch) {
          snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
        }
        
        if (decodedUrl) {
          resultsMap.set(decodedUrl, { url: decodedUrl, title, snippet });
        }
      }
    }

    for (const [url, item] of resultsMap.entries()) {
      const lowerUrl = url.toLowerCase();
      
      let platform: "linkedin" | "instagram" | "github" | "" = "";
      if (lowerUrl.includes("linkedin.com/in/")) {
        platform = "linkedin";
      } else if (lowerUrl.includes("instagram.com/")) {
        platform = "instagram";
      } else if (lowerUrl.includes("github.com/")) {
        platform = "github";
      }
      
      if (!platform) continue;
      
      let handle = "";
      if (platform === "linkedin") {
        handle = url.split("/in/")[1]?.split("/")[0]?.split("?")[0] || "";
      } else if (platform === "instagram") {
        if (lowerUrl.includes("/p/") || lowerUrl.includes("/reel/") || lowerUrl.includes("/explore/")) continue;
        handle = url.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || "";
      } else if (platform === "github") {
        handle = url.split("github.com/")[1]?.split("/")[0]?.split("?")[0] || "";
        if (["topics", "trending", "features", "marketplace", "pricing", "search", "explore", "about"].includes(handle.toLowerCase())) {
          continue;
        }
      }
      
      if (!handle || handle.length < 2) continue;
      
      let followers = 0;
      if (platform === "instagram") {
        const matchInsta = item.snippet.match(/(\d+[\d,.]*)\ s*(?:Followers|followers)/i);
        if (matchInsta) {
          followers = parseInt(matchInsta[1].replace(/,/g, ''));
        } else {
          followers = 280;
        }
      } else if (platform === "linkedin") {
        const matchConn = item.snippet.match(/(\d+[\d,.]*[+kKmM]?)\s*(?:connections|Connections|followers|Followers)/i);
        if (matchConn) {
          const rawVal = matchConn[1].toLowerCase();
          if (rawVal.includes('k')) followers = parseFloat(rawVal) * 1000;
          else if (rawVal.includes('m')) followers = parseFloat(rawVal) * 1000000;
          else followers = parseInt(rawVal.replace(/[+,]/g, ''));
        } else {
          followers = 500;
        }
      } else {
        followers = 45;
      }
      
      const collegeKeywords = ["college", "university", "institute", "school", "bmsce", "rvce", "iiit", "iit", "pesit", "msrit", "bnmit", "vtu", "autonomous"];
      const workKeywords = ["intern", "engineer", "analyst", "developer", "manager", "designer", "consultant", "architect", "lead", "founder", "cto", "ceo"];
      const hackathonKeywords = ["hackathon", "hack", "devfest", "ideathon", "buildathon", "smart india hackathon", "sih", "mlh", "winner", "finalist"];

      const eduMatch = item.snippet.match(/Education:\s*([^·\n|]+)/i);
      if (eduMatch) {
        const institution = eduMatch[1].replace(/&middot;/g, '').trim();
        if (institution && institution.length > 2 && !education.some(e => e.institution.toLowerCase() === institution.toLowerCase())) {
          education.push({
            institution,
            degree: "Public Academic Record",
            period: "Sourced via LinkedIn Index",
            webEnriched: false,
          });
        }
      }
      
      const expMatch = item.snippet.match(/Experience:\s*([^·\n|]+)/i);
      if (expMatch) {
        const company = expMatch[1].replace(/&middot;/g, '').trim();
        if (company && company.length > 2 && !experience.some(e => e.company.toLowerCase() === company.toLowerCase())) {
          experience.push({
            role: "Professional Role",
            company,
            period: "Sourced via LinkedIn Index",
            details: `Identified public role: ${company}`
          });
        }
      }

      const segments = item.snippet.split(/\s*[-|·|•|\|]\s*/);
      for (const seg of segments) {
        const cleanSeg = seg.trim();
        const lowerSeg = cleanSeg.toLowerCase();
        
        const cleanVal = cleanSeg
          .replace(/^(?:student\s+at|studied\s+at|alumni\s+of|alumnus\s+of|pursuing\s+[a-zA-Z\s]+\s+at|education:\s*|profile\s+of\s+|working\s+as\s+a\s+|works\s+at\s+)/i, "")
          .trim();

        if (collegeKeywords.some(cw => lowerSeg.includes(cw))) {
          if (cleanVal.length > 4 && !education.some(e => e.institution.toLowerCase().includes(cleanVal.toLowerCase()) || cleanVal.toLowerCase().includes(e.institution.toLowerCase()))) {
            education.push({
              institution: cleanVal,
              degree: "Public Academic Record",
              period: "Sourced via Search Index",
              webEnriched: false,
            });
          }
        }

        if (workKeywords.some(ww => lowerSeg.includes(ww)) && !lowerSeg.includes("student") && !lowerSeg.includes("education")) {
          if (cleanVal.length > 4 && !experience.some(exp => exp.role.toLowerCase().includes(cleanVal.toLowerCase()) || cleanVal.toLowerCase().includes(exp.role.toLowerCase()))) {
            experience.push({
              role: cleanVal,
              company: "Public Professional Role",
              period: "Sourced via Search Index",
              details: cleanVal
            });
          }
        }

        if (hackathonKeywords.some(hw => lowerSeg.includes(hw))) {
          const yearMatch = cleanSeg.match(/\b(20\d{2})\b/);
          const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
          const resultMatch = cleanSeg.match(/\b(winner|finalist|runner[- ]up|participant|1st|2nd|3rd)\b/i);
          const result = resultMatch ? resultMatch[1].charAt(0).toUpperCase() + resultMatch[1].slice(1) : "Participant";
          const hackName = cleanVal.replace(/\b(winner|finalist|runner[- ]up|participant|1st|2nd|3rd|in|at|of|the)\b/gi, "").trim() || cleanSeg;

          if (hackName.length > 3 && !hackathons.some(h => h.name.toLowerCase() === hackName.toLowerCase())) {
            hackathons.push({
              name: hackName,
              result,
              year,
              source: "Search Index Annotation"
            });
          }
        }
      }
      
      const existsIdx = discoveredAccounts.findIndex(a => a.platform === platform && a.username.toLowerCase() === handle.toLowerCase());
      if (existsIdx === -1) {
        discoveredAccounts.push({
          id: `${platform}-${handle}-${Date.now()}`,
          platform,
          username: handle,
          profileUrl: url,
          displayName: item.title.split("|")[0].split(" - ")[0].trim() || `${platform} Profile`,
          bio: item.snippet.slice(0, 160),
          followers,
          creationDate: new Date().toISOString().slice(0, 10),
          confidence: "PROBABLE",
          capturedAt,
          reason: `Discovered via social crawling index query.`
        });
      }
    }
  } catch (err) {
    console.error("Dynamic web search crawler failed:", err);
  }

  // ── Progressive Name Prefix Search ─────────────────────────────────────
  try {
    const cleanName = query.trim().replace(/^@/, "");
    const candidateNames = new Set<string>();
    
    let emailPrefix = cleanName;
    if (cleanName.includes("@")) {
      emailPrefix = cleanName.split("@")[0];
    }
    candidateNames.add(emailPrefix);
    
    const resolvedDisplayName = displayNameFromQuery(emailPrefix);
    if (resolvedDisplayName && resolvedDisplayName.toLowerCase() !== emailPrefix.toLowerCase()) {
      candidateNames.add(resolvedDisplayName);
    }
    
    const rawParts = emailPrefix.split(/[._\-\s]+/);
    if (rawParts.length > 1) {
      for (const part of rawParts) {
        if (part.length >= 3) {
          candidateNames.add(part);
        }
      }
    }
    
    const prefixes: string[] = [];
    for (const name of candidateNames) {
      const minLen = Math.max(3, Math.ceil(name.length * 0.4));
      for (let len = minLen; len <= name.length; len++) {
        const p = name.slice(0, len).trim();
        if (p.length >= 3) {
          prefixes.push(p);
        }
      }
    }
    
    for (const name of candidateNames) {
      if (name.includes(" ")) {
        const parts = name.split(" ");
        if (parts.length >= 2) {
          const firstPart = parts[0];
          const secondPart = parts[1];
          for (let l = 1; l <= secondPart.length; l++) {
            prefixes.push(`${firstPart} ${secondPart.slice(0, l)}`);
          }
        }
      }
    }

    const uniquePrefixes = [...new Set(prefixes)].slice(-8);

    const searchPromises = uniquePrefixes.map(async (prefix) => {
      try {
        const prefixUrl = `https://www.google.com/search?q=${encodeURIComponent(
          `"${prefix}" site:linkedin.com/in OR site:instagram.com OR site:github.com OR site:twitter.com`
        )}&num=10`;
        const prefixResp = await fetchWithTimeout(prefixUrl, 4000);
        if (!prefixResp.ok) return [];

        const prefixHtml = await prefixResp.text();
        const pBlocks = prefixHtml.split(/<div[^>]*class="[^\"]*((?<![a-zA-Z0-9-])g(?![a-zA-Z0-9-]))[^"]*"/gi);
        const results: typeof suggestedProfiles = [];

        for (let bi = 1; bi < pBlocks.length; bi++) {
          const blk = pBlocks[bi];
          const urlM = blk.match(/href="(\/url\?[^"]+)"/i) || blk.match(/href="(https?:\/\/[^"]+)"/i);
          if (!urlM) continue;

          let dUrl = "";
          const rawU = urlM[1];
          if (rawU.startsWith("/url?")) {
            const qm = rawU.match(/[?&]q=([^&"]+)/);
            if (qm) { try { dUrl = decodeURIComponent(qm[1]); } catch (_) {} }
          } else if (rawU.startsWith("http") && !rawU.includes("google.com")) {
            dUrl = rawU;
          }
          if (!dUrl) continue;

          const lu = dUrl.toLowerCase();
          let spPlatform = "";
          let spHandle = "";

          if (lu.includes("linkedin.com/in/")) {
            spPlatform = "linkedin";
            spHandle = dUrl.split("/in/")[1]?.split("/")[0]?.split("?")[0] || "";
          } else if (lu.includes("instagram.com/") && !lu.includes("/p/") && !lu.includes("/reel/")) {
            spPlatform = "instagram";
            spHandle = dUrl.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || "";
          } else if (lu.includes("github.com/")) {
            const gh = dUrl.split("github.com/")[1]?.split("/")[0]?.split("?")[0] || "";
            const bl = ["topics","trending","features","marketplace","pricing","search","explore","about"];
            if (!bl.includes(gh.toLowerCase())) { spPlatform = "github"; spHandle = gh; }
          } else if (lu.includes("twitter.com/") || lu.includes("x.com/")) {
            const tw = dUrl.split(/twitter\.com\/|x\.com\//)[1]?.split("/")[0]?.split("?")[0] || "";
            const bl = ["home","explore","notifications","messages","i","search","hashtag","settings"];
            if (!bl.includes(tw.toLowerCase()) && tw.length > 1) { spPlatform = "twitter"; spHandle = tw; }
          }

          if (!spPlatform || !spHandle || spHandle.length < 2) continue;

          const h3M = blk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
          const spTitle = h3M ? h3M[1].replace(/<[^>]+>/g, "").trim() : spHandle;
          const snipM = blk.match(/<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        blk.match(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          const spBio = snipM ? snipM[1].replace(/<[^>]+>/g, "").trim() : "";

          const normHandle = spHandle.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normTitle  = spTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "");
          const mScore = normHandle.startsWith(normPrefix)
            ? Math.round((normPrefix.length / Math.max(normHandle.length, 1)) * 100)
            : normTitle.includes(normPrefix)
            ? Math.round((normPrefix.length / Math.max(normTitle.length, 1)) * 80)
            : 25;

          const spUrl = spPlatform === "linkedin" ? `https://www.linkedin.com/in/${spHandle}` :
                        spPlatform === "instagram" ? `https://www.instagram.com/${spHandle}` :
                        spPlatform === "github" ? `https://github.com/${spHandle}` :
                        `https://twitter.com/${spHandle}`;

          let spFollowers = 0;
          const fM = spBio.match(/(\d+[\d,.]*[kKmM]?)\s*(?:followers|connections)/i);
          if (fM) {
            const fv = fM[1].toLowerCase();
            spFollowers = fv.includes("k") ? parseFloat(fv) * 1000 :
                          fv.includes("m") ? parseFloat(fv) * 1000000 :
                          parseInt(fv.replace(/[+,]/g, "")) || 0;
          }

          results.push({
            name: spTitle.split("|")[0].split(" - ")[0].trim() || spHandle,
            platform: spPlatform,
            handle: spHandle,
            profileUrl: spUrl,
            bio: spBio.slice(0, 150),
            followers: spFollowers,
            matchScore: Math.min(100, mScore),
          });
        }
        return results;
      } catch (_) {
        return [];
      }
    });

    const allResults = await Promise.all(searchPromises);
    for (const prefixResults of allResults) {
      for (const res of prefixResults) {
        const alreadyIn = suggestedProfiles.some(sp =>
          sp.platform === res.platform && sp.handle.toLowerCase() === res.handle.toLowerCase()
        );
        if (!alreadyIn) {
          suggestedProfiles.push(res);
        }
      }
    }

    suggestedProfiles.sort((a, b) => b.matchScore - a.matchScore);
  } catch (err) {
    console.error("Progressive prefix search failed:", err);
  }

  // ── Targeted LinkedIn Education Dork ───────────────────────────────────
  if (education.length === 0) {
    try {
      const searchName = query.includes("@") ? displayNameFromQuery(query.split("@")[0]) : displayNameFromQuery(query);
      const eduDorkUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `site:linkedin.com/in "${searchName}" (college OR university OR institute OR B.Tech OR B.E OR engineering OR MBA)`
      )}&num=5`;
      const eduResp = await fetchWithTimeout(eduDorkUrl, 5000);
      if (eduResp.ok) {
        const eduHtml = await eduResp.text();
        const eduBlocks = eduHtml.split(/<div[^>]*class="[^\"]*((?<![a-zA-Z0-9-])g(?![a-zA-Z0-9-]))[^"]*"/gi);

        for (let ei = 1; ei < eduBlocks.length; ei++) {
          const blk = eduBlocks[ei];
          const snipM = blk.match(/<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        blk.match(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        blk.match(/<span[^>]*class="[^"]*aCOpRe[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          if (!snipM) continue;
          const snippet = snipM[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

          const eduKw = ["college", "university", "institute", "b.tech", "b.e", "m.tech", "mba", "engineering", "iiit", "iit", "nit", "vtu", "pesit", "bmsce", "rvce"];
          const segs = snippet.split(/\s*[-|·•]\s*/);
          for (const seg of segs) {
            const low = seg.toLowerCase();
            if (eduKw.some(ek => low.includes(ek))) {
              const val = seg.replace(/^(?:student at|studied at|alumni of|pursuing [a-zA-Z\s]+ at|education:\s*)/i, "").trim();
              if (val.length > 5 && !education.some(e => e.institution.toLowerCase().includes(val.toLowerCase().slice(0, 12)))) {
                education.push({
                  institution: val.slice(0, 120),
                  degree: "Public Academic Record",
                  period: "LinkedIn Education Dork",
                  webEnriched: false,
                });
              }
            }
          }
          const eduM = snippet.match(/Education:\s*([^·\n|]+)/i);
          if (eduM) {
            const inst = eduM[1].trim();
            if (inst.length > 5 && !education.some(e => e.institution.toLowerCase().includes(inst.toLowerCase().slice(0, 12)))) {
              education.push({
                institution: inst.slice(0, 120),
                degree: "Public Academic Record",
                period: "LinkedIn Education Dork",
                webEnriched: false,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("LinkedIn education dork failed:", err);
    }
  }

  // ── Targeted LinkedIn Experience Dork ───────────────────────────────────
  if (experience.length === 0) {
    try {
      const searchName = query.includes("@") ? displayNameFromQuery(query.split("@")[0]) : displayNameFromQuery(query);
      const expDorkUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `site:linkedin.com/in "${searchName}" (engineer OR developer OR manager OR analyst OR consultant OR founder OR specialist OR works OR experience)`
      )}&num=5`;
      const expResp = await fetchWithTimeout(expDorkUrl, 5000);
      if (expResp.ok) {
        const expHtml = await expResp.text();
        const expBlocks = expHtml.split(/<div[^>]*class="[^\"]*((?<![a-zA-Z0-9-])g(?![a-zA-Z0-9-]))[^"]*"/gi);

        for (let ei = 1; ei < expBlocks.length; ei++) {
          const blk = expBlocks[ei];
          const snipM = blk.match(/<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        blk.match(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        blk.match(/<span[^>]*class="[^"]*aCOpRe[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          if (!snipM) continue;
          const snippet = snipM[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

          const workKw = ["engineer", "developer", "manager", "analyst", "consultant", "founder", "specialist", "intern", "lead", "architect", "designer", "officer"];
          const segs = snippet.split(/\s*[-|·•]\s*/);
          for (const seg of segs) {
            const low = seg.toLowerCase();
            if (workKw.some(wk => low.includes(wk)) && !low.includes("student") && !low.includes("education")) {
              const val = seg.replace(/^(?:student at|studied at|alumni of|pursuing [a-zA-Z\s]+ at|working as a |works at |experience:\s*)/i, "").trim();
              if (val.length > 5 && !experience.some(e => e.role.toLowerCase().includes(val.toLowerCase().slice(0, 12)))) {
                experience.push({
                  role: val.slice(0, 120),
                  company: "Public Professional Role",
                  period: "LinkedIn Experience Dork",
                  details: `Identified public role: ${val}`,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("LinkedIn experience dork failed:", err);
    }
  }

  return { accounts: discoveredAccounts, education, experience, hackathons, suggestedProfiles };
}

export async function probeWhatsAppExists(phone: string): Promise<"FOUND" | "NOT FOUND"> {
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  if (!cleanPhone) return "NOT FOUND";
  const url = `https://wa.me/${cleanPhone}`;
  try {
    const res = await fetchWithTimeout(url, 4000);
    if (res.ok) {
      const text = await res.text();
      if (text.includes("api.whatsapp.com") || text.includes("WhatsApp") || text.includes("Chat on WhatsApp")) {
        return "FOUND";
      }
    }
    return "NOT FOUND";
  } catch {
    return "NOT FOUND";
  }
}

// ─── Twitter/X Public Scraper (via Nitter) ───────────────────────────────────
// Nitter is a privacy-respecting Twitter mirror with public HTML — no API key required.
export interface TwitterPublicProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  joinedDate: string | null;
  tweetCount: string;
  followers: string;
  following: string;
  verified: boolean;
  avatarUrl: string | null;
  pinnedTweet: string | null;
  profileUrl: string;
}

export async function fetchTwitterPublicProfile(username: string): Promise<TwitterPublicProfile | null> {
  const cleanUser = username.replace(/^@/, "").trim();
  if (!cleanUser) return null;

  // Try multiple Nitter instances in case one is down
  const nitterInstances = [
    `https://nitter.net/${cleanUser}`,
    `https://nitter.privacydev.net/${cleanUser}`,
    `https://nitter.poast.org/${cleanUser}`,
  ];

  for (const nitterUrl of nitterInstances) {
    try {
      console.log(`[TWITTER] Querying Nitter: ${nitterUrl}`);
      const resp = await fetchWithTimeout(nitterUrl, 5000, {
        headers: {
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!resp.ok) continue;

      const html = await resp.text();
      if (html.includes("page not found") || html.includes("User not found") || html.includes("No results")) continue;

      // Extract display name from <a class="fullname">
      const displayNameMatch = html.match(/<a[^>]+class="[^"]*fullname[^"]*"[^>]*>([^<]+)<\/a>/i);
      const displayName = displayNameMatch?.[1]?.trim() || null;

      // Bio
      const bioMatch = html.match(/<div[^>]+class="[^"]*profile-bio[^"]*"[^>]*>\s*<p[^>]*>([^<]+)<\/p>/i)
        || html.match(/class="profile-bio"[^>]*>[\s\S]{0,200}<p[^>]*>([\s\S]{0,300}?)<\/p>/i);
      const bio = bioMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || null;

      // Stats: tweets, followers, following
      const statsMatches = [...html.matchAll(/<li[^>]*>\s*<span[^>]*class="[^"]*profile-stat-num[^"]*"[^>]*>([^<]+)<\/span>\s*<span[^>]*>[^<]*<\/span>/gi)];
      const tweetCount  = statsMatches[0]?.[1]?.trim() || "Not publicly available";
      const followers   = statsMatches[1]?.[1]?.trim() || "Not publicly available";
      const following   = statsMatches[2]?.[1]?.trim() || "Not publicly available";

      // Location
      const locationMatch = html.match(/class="[^"]*profile-location[^"]*"[^>]*>[\s\S]{0,100}<\/span>\s*([^<]{2,60})/i)
        || html.match(/icon-location[^>]*>[\s\S]{0,50}<\/span>\s*([^<\n]{2,60})/i);
      const location = locationMatch?.[1]?.trim() || null;

      // Website
      const websiteMatch = html.match(/icon-link[^>]*>[\s\S]{0,50}href="([^"]+)"/i)
        || html.match(/profile-website[^>]*>[\s\S]{0,100}href="([^"]+)"/i);
      const website = websiteMatch?.[1]?.trim() || null;

      // Joined date
      const joinedMatch = html.match(/icon-calendar[^>]*>[\s\S]{0,50}<\/span>\s*([A-Za-z]+\s+\d{4})/i)
        || html.match(/Joined\s+([A-Za-z]+\s+\d{4})/i);
      const joinedDate = joinedMatch?.[1]?.trim() || null;

      // Avatar
      const avatarMatch = html.match(/<img[^>]+class="[^"]*profile-card-avatar[^"]*"[^>]+src="([^"]+)"/i)
        || html.match(/profile-card-avatar[^>]*src="([^"]+)"/i);
      let avatarUrl = avatarMatch?.[1] || null;
      if (avatarUrl && avatarUrl.startsWith("/")) {
        avatarUrl = `https://nitter.net${avatarUrl}`;
      }

      // Verified badge
      const verified = html.includes("icon-ok verified") || html.includes("profile-verified");

      // Pinned tweet
      const pinnedMatch = html.match(/pinned[^>]*>([\s\S]{0,300}?)<\/div>/i);
      const pinnedTweet = pinnedMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || null;

      console.log(`[TWITTER] ✓ Nitter data for @${cleanUser}: ${followers} followers`);
      return {
        username: cleanUser,
        displayName,
        bio,
        location,
        website,
        joinedDate,
        tweetCount,
        followers,
        following,
        verified,
        avatarUrl,
        pinnedTweet,
        profileUrl: `https://x.com/${cleanUser}`,
      };
    } catch (err) {
      console.error(`[TWITTER] Nitter instance failed (${nitterUrl}):`, err);
    }
  }

  console.log(`[TWITTER] All Nitter instances failed for @${cleanUser}`);
  return null;
}

// ─── Instagram Public Scraper (via Picuki mirror) ────────────────────────────
// Picuki is a public Instagram web viewer — no auth required.
export interface InstagramPublicProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  postCount: string;
  followers: string;
  following: string;
  avatarUrl: string | null;
  recentHashtags: string[];
  isVerified: boolean;
  profileUrl: string;
}

export async function fetchInstagramPublicProfile(username: string): Promise<InstagramPublicProfile | null> {
  const cleanUser = username.replace(/^@/, "").trim();
  if (!cleanUser) return null;

  const mirrors = [
    `https://www.picuki.com/profile/${cleanUser}`,
    `https://imginn.com/${cleanUser}/`,
  ];

  for (const mirrorUrl of mirrors) {
    try {
      console.log(`[INSTAGRAM] Querying mirror: ${mirrorUrl}`);
      const resp = await fetchWithTimeout(mirrorUrl, 6000, {
        headers: {
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://www.google.com/",
        },
      });
      if (!resp.ok) continue;

      const html = await resp.text();
      if (html.includes("Profile not found") || html.includes("doesn't exist") || html.includes("not found")) continue;

      let displayName: string | null = null;
      let bio: string | null = null;
      let postCount = "Not publicly available";
      let followers = "Not publicly available";
      let following = "Not publicly available";
      let avatarUrl: string | null = null;
      let isVerified = false;
      const recentHashtags: string[] = [];

      if (mirrorUrl.includes("picuki")) {
        // Picuki-specific parsing
        const nameMatch = html.match(/<h1[^>]*class="[^"]*profile-name[^"]*"[^>]*>([^<]+)<\/h1>/i)
          || html.match(/<title>([^|<]+)/i);
        displayName = nameMatch?.[1]?.trim() || null;

        const bioMatch = html.match(/<div[^>]*class="[^"]*profile-description[^"]*"[^>]*>([\s\S]{0,400}?)<\/div>/i);
        bio = bioMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;

        const statsMatch = [...html.matchAll(/([0-9,.kKmM]+)\s*<\/span>\s*<span[^>]*>([a-zA-Z]+)/gi)];
        statsMatch.forEach(m => {
          const val = m[1]; const label = m[2].toLowerCase();
          if (label.includes("post")) postCount = val;
          else if (label.includes("follower")) followers = val;
          else if (label.includes("following")) following = val;
        });

        const avatarMatch = html.match(/<img[^>]+class="[^"]*profile-avatar[^"]*"[^>]+src="([^"]+)"/i)
          || html.match(/profile-avatar[^>]*>\s*<img[^>]+src="([^"]+)"/i);
        avatarUrl = avatarMatch?.[1] || null;

        isVerified = html.includes("profile-verified") || html.includes("verified-account");

        // Extract hashtags from captions
        const hashtagMatches = [...html.matchAll(/#([a-zA-Z0-9_]+)/g)];
        hashtagMatches.slice(0, 15).forEach(m => {
          if (!recentHashtags.includes(m[1])) recentHashtags.push(m[1]);
        });

      } else if (mirrorUrl.includes("imginn")) {
        // Imginn-specific parsing
        const nameMatch = html.match(/<h1[^>]*>([\s\S]{1,80}?)<\/h1>/i)
          || html.match(/<title>([^|<@]+)/i);
        displayName = nameMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || null;

        const bioMatch = html.match(/<p[^>]*class="[^"]*bio[^"]*"[^>]*>([\s\S]{0,400}?)<\/p>/i)
          || html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]{0,400}?)<\/div>/i);
        bio = bioMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || null;

        const countMatches = [...html.matchAll(/<span[^>]*>\s*([0-9,.kKmM]+)\s*<\/span>\s*<span[^>]*>\s*(Posts|Followers|Following)/gi)];
        countMatches.forEach(m => {
          const label = m[2].toLowerCase();
          if (label === "posts") postCount = m[1];
          else if (label === "followers") followers = m[1];
          else if (label === "following") following = m[1];
        });

        const avatarMatch = html.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/i);
        avatarUrl = avatarMatch?.[1] || null;

        const hashtagMatches = [...html.matchAll(/#([a-zA-Z0-9_]+)/g)];
        hashtagMatches.slice(0, 15).forEach(m => {
          if (!recentHashtags.includes(m[1])) recentHashtags.push(m[1]);
        });
      }

      console.log(`[INSTAGRAM] ✓ Mirror data for @${cleanUser}: ${followers} followers`);
      return {
        username: cleanUser,
        displayName,
        bio,
        postCount,
        followers,
        following,
        avatarUrl,
        recentHashtags: [...new Set(recentHashtags)].slice(0, 15),
        isVerified,
        profileUrl: `https://www.instagram.com/${cleanUser}/`,
      };
    } catch (err) {
      console.error(`[INSTAGRAM] Mirror failed (${mirrorUrl}):`, err);
    }
  }

  console.log(`[INSTAGRAM] All mirrors failed for @${cleanUser}`);
  return null;
}

// ─── GitHub Commit Timezone Inference ────────────────────────────────────────
// Analyses commit event timestamps to infer the developer's working timezone.
export interface TimezoneInference {
  peakHourUtc: number;          // 0–23
  peakWindowUtc: string;        // e.g. "22:00–04:00 UTC"
  inferredTimezone: string;     // e.g. "IST (UTC+5:30)"
  confidence: "HIGH" | "MEDIUM" | "LOW";
  commitHourBuckets: number[];  // 24-element array (counts per hour)
  totalCommitsAnalyzed: number;
}

export async function inferTimezoneFromGithubCommits(username: string, githubToken?: string): Promise<TimezoneInference | null> {
  try {
    const token = githubToken || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (token) headers["Authorization"] = `token ${token}`;

    // Fetch last 100 events (mix of PushEvents with commit timestamps)
    const eventsResp = await fetchWithTimeout(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
      5000,
      { headers }
    );
    if (!eventsResp.ok) return null;

    const events: any[] = await eventsResp.json();
    if (!Array.isArray(events) || events.length === 0) return null;

    // Bucket commits by UTC hour
    const hourBuckets = new Array(24).fill(0);
    let totalCommits = 0;

    for (const event of events) {
      if (event.type !== "PushEvent") continue;
      const commits: any[] = event.payload?.commits || [];
      for (const commit of commits) {
        // Use the event created_at timestamp (closest we can get without full commit API)
        const ts = event.created_at;
        if (!ts) continue;
        const hour = new Date(ts).getUTCHours();
        hourBuckets[hour]++;
        totalCommits++;
      }
    }

    if (totalCommits < 3) return null; // Not enough data

    // Find peak hour
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

    // Define peak window (±3 hours)
    const windowStart = (peakHour - 3 + 24) % 24;
    const windowEnd   = (peakHour + 3) % 24;
    const peakWindowUtc = `${String(windowStart).padStart(2, "0")}:00–${String(windowEnd).padStart(2, "0")}:00 UTC`;

    // Map peak hour to likely timezone
    // If peak is during local 09:00–18:00 (business hours), offset = local_time - utc_hour
    // We estimate local business hours as 10:00 local → peak_hour UTC
    const offsetEstimate = 10 - peakHour; // how many hours ahead of UTC
    const normalizedOffset = ((offsetEstimate % 24) + 24) % 24;
    const hoursAhead = normalizedOffset > 12 ? normalizedOffset - 24 : normalizedOffset;

    const timezoneMap: Record<string, string> = {
      "-12": "UTC-12 (Baker Island)",
      "-11": "UTC-11 (Samoa)",
      "-10": "HST (UTC-10, Hawaii)",
      "-9":  "AKST (UTC-9, Alaska)",
      "-8":  "PST (UTC-8, Pacific US)",
      "-7":  "MST (UTC-7, Mountain US)",
      "-6":  "CST (UTC-6, Central US)",
      "-5":  "EST (UTC-5, Eastern US)",
      "-4":  "AST (UTC-4, Atlantic)",
      "-3":  "BRT (UTC-3, Brazil)",
      "-2":  "UTC-2",
      "-1":  "UTC-1 (Azores)",
      "0":   "UTC / GMT (UK/Ireland)",
      "1":   "CET (UTC+1, Central Europe)",
      "2":   "EET (UTC+2, Eastern Europe)",
      "3":   "MSK (UTC+3, Moscow/Gulf)",
      "4":   "GST (UTC+4, Dubai)",
      "5":   "PKT (UTC+5, Pakistan)",
      "6":   "BST (UTC+6, Bangladesh)",
      "7":   "ICT (UTC+7, Thailand)",
      "8":   "CST (UTC+8, China/Singapore)",
      "9":   "JST (UTC+9, Japan/Korea)",
      "10":  "AEST (UTC+10, Australia East)",
      "11":  "AEDT (UTC+11, Lord Howe)",
      "12":  "NZST (UTC+12, New Zealand)",
    };
    // Special case IST (UTC+5.5)
    const inferredTimezone = peakHour >= 3 && peakHour <= 5
      ? "IST (UTC+5:30, India)"
      : timezoneMap[String(Math.round(hoursAhead))] || `UTC${hoursAhead >= 0 ? "+" : ""}${hoursAhead}`;

    // Confidence based on sample size and bucket concentration
    const topBucketSum = hourBuckets.slice().sort((a, b) => b - a).slice(0, 6).reduce((s, v) => s + v, 0);
    const concentration = totalCommits > 0 ? topBucketSum / totalCommits : 0;
    const confidence: "HIGH" | "MEDIUM" | "LOW" =
      totalCommits >= 20 && concentration >= 0.7 ? "HIGH"
      : totalCommits >= 8  && concentration >= 0.5 ? "MEDIUM"
      : "LOW";

    console.log(`[GITHUB-TZ] @${username}: peak=${peakHour}h UTC, inferred=${inferredTimezone}, confidence=${confidence}`);
    return {
      peakHourUtc: peakHour,
      peakWindowUtc,
      inferredTimezone,
      confidence,
      commitHourBuckets: hourBuckets,
      totalCommitsAnalyzed: totalCommits,
    };
  } catch (err) {
    console.error(`[GITHUB-TZ] Failed for ${username}:`, err);
    return null;
  }
}


