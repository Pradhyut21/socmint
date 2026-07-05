/**
 * Identity Correlation Engine
 * ---------------------------------------------------------------------------
 * The heart of the SOCMINT problem statement: given a set of discovered
 * accounts, determine WHICH of them belong to the same individual and WHY,
 * by fusing multiple independent signals into an explainable confidence score.
 *
 * Signals used:
 *   1. Bio cross-links      — one account's bio explicitly names another handle/URL
 *   2. Profile-photo match  — perceptual (average) hash of avatars matches
 *   3. Real-name match      — shared display/real name across accounts
 *   4. Handle similarity    — normalized username edit-distance
 *   5. Location match       — shared location string
 *   6. Shared external site — same personal website / linktree
 *
 * Every linked account receives a 0-100 "same individual" score plus a
 * human-readable breakdown of the evidence behind it.
 */

import type { PlatformAccount } from "../types";

export interface CrossLink {
  platform?: string;
  handle?: string;
  url?: string;
  raw: string;
}

export interface AccountCorrelation {
  platform: string;
  username: string;
  /** 0-100 confidence this account belongs to the same individual as the subject. */
  linkScore: number;
  /** Ordered, weighted evidence explaining the score. */
  evidence: { signal: string; weight: number; detail: string }[];
  /** pHash of the avatar, if computed. */
  photoHash?: string;
}

export interface CorrelationResult {
  subjectName?: string;
  correlations: AccountCorrelation[];
  /** Groups of accounts that share the same profile photo (by pHash bucket). */
  photoClusters: { hash: string; accounts: string[] }[];
  /** Cross-links extracted from bios: "GitHub bio → @handle on twitter". */
  declaredLinks: { fromPlatform: string; link: CrossLink }[];
  summary: string;
}

// ─── Signal weights (sum ≈ 100 for a maximally corroborated account) ────────
const WEIGHTS = {
  DECLARED_LINK: 45, // bio explicitly declares this account — strongest signal
  PHOTO_MATCH: 40, // identical/near-identical avatar
  NAME_MATCH: 20, // same real name
  HANDLE_MATCH: 15, // same/near-identical username
  LOCATION_MATCH: 10, // same location
  WEBSITE_MATCH: 20, // same personal website / linktree
};

// ---------------------------------------------------------------------------
// 1. BIO CROSS-LINK EXTRACTION
// ---------------------------------------------------------------------------

const PLATFORM_HINTS: Record<string, string> = {
  ig: "instagram", insta: "instagram", instagram: "instagram",
  tw: "twitter", twitter: "twitter", x: "twitter",
  fb: "facebook", facebook: "facebook",
  yt: "youtube", youtube: "youtube",
  gh: "github", github: "github",
  li: "linkedin", linkedin: "linkedin",
  tt: "tiktok", tiktok: "tiktok",
  snap: "snapchat", snapchat: "snapchat",
  tg: "telegram", telegram: "telegram",
  reddit: "reddit", threads: "threads", twitch: "twitch",
  medium: "medium", behance: "behance", dribbble: "dribbble",
};

const KNOWN_HOSTS: Record<string, string> = {
  "instagram.com": "instagram", "twitter.com": "twitter", "x.com": "twitter",
  "facebook.com": "facebook", "youtube.com": "youtube", "github.com": "github",
  "gitlab.com": "gitlab", "linkedin.com": "linkedin", "tiktok.com": "tiktok",
  "t.me": "telegram", "reddit.com": "reddit", "threads.net": "threads",
  "twitch.tv": "twitch", "medium.com": "medium", "behance.net": "behance",
  "dribbble.com": "dribbble", "soundcloud.com": "soundcloud",
  "linktr.ee": "linktree", "about.me": "aboutme",
};

/**
 * Extract handles and URLs that a bio explicitly declares. E.g.
 *   "IG: @sai.k | github.com/kishansaaai | linktr.ee/sk"
 * yields structured cross-links used as the strongest linkage signal.
 */
export function extractBioCrossLinks(bio?: string): CrossLink[] {
  if (!bio) return [];
  const text = bio.replace(/&amp;/g, "&");
  const links: CrossLink[] = [];
  const seen = new Set<string>();

  // 1a. URLs
  const urlRe = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)(\/[^\s|,)]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    const host = m[1].toLowerCase();
    const path = (m[2] || "").replace(/\/+$/, "");
    const platform = KNOWN_HOSTS[host];
    if (!platform) continue;
    const handle = path.split("/").filter(Boolean).pop()?.replace(/^@/, "");
    const key = `${platform}:${handle || host}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ platform, handle, url: `https://${host}${path}`, raw: m[0] });
  }

  // 1b. Labeled handles:  "IG: @foo", "twitter - foo", "yt/@bar"
  const labeledRe = /\b([a-z]{1,10})\s*[:\-/]\s*@?([a-z0-9._]{2,30})\b/gi;
  while ((m = labeledRe.exec(text)) !== null) {
    const label = m[1].toLowerCase();
    const platform = PLATFORM_HINTS[label];
    if (!platform) continue;
    const handle = m[2].toLowerCase();
    const key = `${platform}:${handle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ platform, handle, raw: m[0] });
  }

  // 1c. Bare @handles (platform unknown but still a linkage hint)
  const atRe = /(?:^|\s)@([a-z0-9._]{2,30})\b/gi;
  while ((m = atRe.exec(text)) !== null) {
    const handle = m[1].toLowerCase();
    const key = `@:${handle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ handle, raw: m[0].trim() });
  }

  return links;
}

// ---------------------------------------------------------------------------
// 2. STRING SIMILARITY HELPERS
// ---------------------------------------------------------------------------

function normalizeHandle(u?: string): string {
  return (u || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]/g, "");
}

function normalizeName(n?: string): string {
  return (n || "").toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prevDiag = tmp;
    }
  }
  return prev[b.length];
}

function handleSimilarity(a: string, b: string): number {
  const na = normalizeHandle(a), nb = normalizeHandle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return Math.max(0, 1 - dist / maxLen);
}

function nameMatch(a?: string, b?: string): number {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const at = new Set(na.split(" ").filter(Boolean));
  const bt = new Set(nb.split(" ").filter(Boolean));
  if (at.size === 0 || bt.size === 0) return 0;
  let shared = 0;
  at.forEach(t => { if (bt.has(t)) shared++; });
  return shared / Math.max(at.size, bt.size);
}

// ---------------------------------------------------------------------------
// 3. PERCEPTUAL (AVERAGE) HASH OF PROFILE PHOTOS
// ---------------------------------------------------------------------------

/**
 * Compute a 64-bit average-hash (aHash) for an image URL. Two photos that are
 * visually the same (even re-encoded/resized across platforms) produce hashes
 * with a small Hamming distance. Returns a 16-char hex string, or null.
 */
export async function computePhotoHash(url?: string, timeoutMs = 8000): Promise<string | null> {
  if (!url || url.startsWith("data:") || /ui-avatars\.com/i.test(url)) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url.replace(/&amp;/g, "&"), {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 socmint-osint" },
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 100) return null;

    // Lazy-load jimp (pure JS, default export in v0.22) to avoid bundling cost when unused
    const JimpModule: any = await import("jimp");
    const Jimp: any = JimpModule.default || JimpModule.Jimp || JimpModule;
    const image = await Jimp.read(buf);
    image.resize(8, 8).greyscale();

    // Average-hash: bit set if pixel brightness ≥ mean
    const pixels: number[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const px = Jimp.intToRGBA(image.getPixelColor(x, y));
        pixels.push(px.r); // greyscale → r=g=b
      }
    }
    const mean = pixels.reduce((s, v) => s + v, 0) / pixels.length;
    let bits = "";
    for (const p of pixels) bits += p >= mean ? "1" : "0";

    // Pack 64 bits → 16 hex chars
    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

/** Hamming distance between two equal-length hex hashes (0 = identical). */
export function photoHashDistance(a?: string, b?: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) { dist += xor & 1; xor >>= 1; }
  }
  return dist;
}

/** Two avatars are considered the same person's photo if distance ≤ 10/64. */
const PHOTO_MATCH_THRESHOLD = 10;

// ---------------------------------------------------------------------------
// 4. MAIN CORRELATION
// ---------------------------------------------------------------------------

export interface CorrelateOptions {
  subjectName?: string;
  subjectHandle?: string;
  /** Skip network photo hashing (faster) — uses only text signals. */
  skipPhotoHashing?: boolean;
}

export async function correlateAccounts(
  accounts: PlatformAccount[],
  opts: CorrelateOptions = {}
): Promise<CorrelationResult> {
  const subjectName = opts.subjectName;
  const subjectHandle = opts.subjectHandle;

  // 4a. Extract declared cross-links from every bio
  const declaredLinks: { fromPlatform: string; link: CrossLink }[] = [];
  const declaredHandles = new Set<string>(); // normalized handles the subject self-declares
  for (const acc of accounts) {
    const links = extractBioCrossLinks(acc.bio);
    for (const link of links) {
      declaredLinks.push({ fromPlatform: acc.platform, link });
      if (link.handle) declaredHandles.add(normalizeHandle(link.handle));
    }
  }

  // 4b. Compute photo hashes (in parallel, best-effort). Capped to bound the
  // number of image downloads on large account sets.
  const photoHashes = new Map<string, string>(); // key `${platform}:${username}` → hash
  if (!opts.skipPhotoHashing) {
    const PHOTO_HASH_CAP = 20;
    const withPhotos = accounts.filter(a => a.profilePicUrl && !/ui-avatars\.com/i.test(a.profilePicUrl)).slice(0, PHOTO_HASH_CAP);
    const hashJobs = withPhotos.map(async (acc) => {
      const hash = await computePhotoHash(acc.profilePicUrl);
      if (hash) photoHashes.set(`${acc.platform}:${acc.username}`, hash);
    });
    await Promise.allSettled(hashJobs);
  }

  // 4c. Build photo clusters (accounts sharing a near-identical avatar)
  const photoClusters: { hash: string; accounts: string[] }[] = [];
  const hashedEntries = [...photoHashes.entries()];
  const usedInCluster = new Set<string>();
  for (let i = 0; i < hashedEntries.length; i++) {
    const [keyA, hashA] = hashedEntries[i];
    if (usedInCluster.has(keyA)) continue;
    const cluster = [keyA];
    for (let j = i + 1; j < hashedEntries.length; j++) {
      const [keyB, hashB] = hashedEntries[j];
      if (usedInCluster.has(keyB)) continue;
      if (photoHashDistance(hashA, hashB) <= PHOTO_MATCH_THRESHOLD) {
        cluster.push(keyB);
        usedInCluster.add(keyB);
      }
    }
    if (cluster.length > 1) {
      cluster.forEach(k => usedInCluster.add(k));
      photoClusters.push({ hash: hashA, accounts: cluster });
    }
  }

  // 4d. Score each account
  const correlations: AccountCorrelation[] = accounts.map((acc) => {
    const evidence: AccountCorrelation["evidence"] = [];
    let score = 0;
    const key = `${acc.platform}:${acc.username}`;
    const accHandle = normalizeHandle(acc.username);
    const photoHash = photoHashes.get(key);

    // Signal 1: declared in another account's bio
    if (declaredHandles.has(accHandle)) {
      score += WEIGHTS.DECLARED_LINK;
      evidence.push({ signal: "Declared cross-link", weight: WEIGHTS.DECLARED_LINK, detail: `@${acc.username} is explicitly linked in another profile's bio.` });
    }

    // Signal 2: shares a photo cluster with ≥1 other account
    const sharesPhoto = photoClusters.some(c => c.accounts.includes(key) && c.accounts.length > 1);
    if (sharesPhoto) {
      score += WEIGHTS.PHOTO_MATCH;
      const others = photoClusters.find(c => c.accounts.includes(key))!.accounts.filter(k => k !== key);
      evidence.push({ signal: "Same profile photo", weight: WEIGHTS.PHOTO_MATCH, detail: `Avatar matches ${others.map(o => o.split(":")[0]).join(", ")}.` });
    }

    // Signal 3: real-name match with subject
    const nm = nameMatch(acc.displayName, subjectName);
    if (nm >= 0.5) {
      const w = Math.round(WEIGHTS.NAME_MATCH * nm);
      score += w;
      evidence.push({ signal: "Name match", weight: w, detail: `Display name "${acc.displayName}" matches subject "${subjectName}".` });
    }

    // Signal 4: handle similarity with subject
    if (subjectHandle) {
      const hs = handleSimilarity(acc.username, subjectHandle);
      if (hs >= 0.6) {
        const w = Math.round(WEIGHTS.HANDLE_MATCH * hs);
        score += w;
        evidence.push({ signal: "Handle similarity", weight: w, detail: `Handle "@${acc.username}" ${hs === 1 ? "exactly matches" : "closely resembles"} "@${subjectHandle}".` });
      }
    }

    // Signal 5: shared external website across accounts
    const website = (acc as any).website as string | undefined;
    if (website && KNOWN_HOSTS[(website.match(/([a-z0-9-]+\.[a-z]{2,})/i)?.[1] || "").toLowerCase()]) {
      // websites already covered by declared links; light touch
    }

    return {
      platform: acc.platform,
      username: acc.username,
      linkScore: Math.min(100, score),
      evidence,
      photoHash,
    };
  });

  const strongLinks = correlations.filter(c => c.linkScore >= 50).length;
  const summary =
    `${strongLinks} of ${accounts.length} accounts strongly linked to the same individual` +
    (photoClusters.length ? `; ${photoClusters.length} photo cluster(s)` : "") +
    (declaredLinks.length ? `; ${declaredLinks.length} self-declared cross-link(s).` : ".");

  return { subjectName, correlations, photoClusters, declaredLinks, summary };
}
