// @ts-nocheck
import { PlatformAccount, Post, AliasResult, ShadowAccountResult } from "../types";

// ── Levenshtein Distance ────────────────────────────────────────────
export function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));

  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[la][lb];
}

// ── Username Similarity Score (Levenshtein-based) ───────────────────
export function handleSimilarityScore(primary: string, candidate: string): number {
  const a = primary.replace(/^@/, "").toLowerCase();
  const b = candidate.replace(/^@/, "").toLowerCase();
  if (a === b) return 100;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;

  const dist = levenshtein(a, b);
  const normalizedScore = Math.max(0, (1 - dist / maxLen) * 100);

  // Bonus for shared root substring (≥ 4 chars)
  const rootLen = longestCommonSubstring(a, b);
  const rootBonus = rootLen >= 4 ? Math.min(20, rootLen * 3) : 0;

  return Math.min(100, Math.round(normalizedScore + rootBonus));
}

function longestCommonSubstring(a: string, b: string): number {
  let max = 0;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        max = Math.max(max, dp[i][j]);
      }
    }
  }
  return max;
}

// ── Bio Cross-Reference Scan ────────────────────────────────────────
// Check if any discovered account's bio/display name mentions the primary handle or vice versa
export function bioCrossReferenceScore(
  primaryHandle: string,
  primaryBio: string,
  candidateHandle: string,
  candidateBio: string
): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  const pHandle = primaryHandle.replace(/^@/, "").toLowerCase();
  const cHandle = candidateHandle.replace(/^@/, "").toLowerCase();
  const pBio = primaryBio.toLowerCase();
  const cBio = candidateBio.toLowerCase();

  // Direct mention: candidate bio mentions primary handle
  if (cBio.includes(pHandle) || cBio.includes(`@${pHandle}`)) {
    score += 50;
    signals.push(`Secondary account bio directly mentions primary handle @${pHandle}`);
  }

  // Reverse mention: primary bio mentions candidate handle
  if (pBio.includes(cHandle) || pBio.includes(`@${cHandle}`)) {
    score += 50;
    signals.push(`Primary account bio directly mentions secondary handle @${cHandle}`);
  }

  // Shared keywords (name fragments, unique words > 4 chars)
  const pWords = new Set(pBio.split(/[\s,._\-@#|•]+/).filter(w => w.length >= 4));
  const cWords = new Set(cBio.split(/[\s,._\-@#|•]+/).filter(w => w.length >= 4));
  const sharedWords = [...pWords].filter(w => cWords.has(w) && !["this", "that", "with", "from", "have", "been", "about", "just", "more"].includes(w));
  if (sharedWords.length >= 2) {
    score += Math.min(30, sharedWords.length * 10);
    signals.push(`Bio keyword overlap detected: "${sharedWords.slice(0, 3).join('", "')}"`);
  }

  return { score: Math.min(100, score), signals };
}

// ── Simulated Avatar Perceptual Hash ────────────────────────────────
// In production this would use pHash/dHash on actual images.
// For demo/hackathon, we simulate by comparing avatar URL patterns and dicebear seeds.
export function avatarHashScore(urlA?: string, urlB?: string): { score: number; signal?: string } {
  if (!urlA || !urlB) return { score: 0 };

  // Same URL = same image
  if (urlA === urlB) return { score: 100, signal: "Profile avatars are identical (same image URL)" };

  // Both are dicebear with similar seeds
  const seedA = urlA.match(/seed=([^&]+)/)?.[1]?.toLowerCase();
  const seedB = urlB.match(/seed=([^&]+)/)?.[1]?.toLowerCase();
  if (seedA && seedB) {
    const seedSimilarity = handleSimilarityScore(decodeURIComponent(seedA), decodeURIComponent(seedB));
    if (seedSimilarity >= 70) {
      return { score: seedSimilarity, signal: `Avatar seeds share ${seedSimilarity}% similarity (potential same person)` };
    }
  }

  // Same domain and similar path structure
  try {
    const domainA = new URL(urlA).hostname;
    const domainB = new URL(urlB).hostname;
    if (domainA === domainB && domainA !== "api.dicebear.com") {
      return { score: 30, signal: "Avatars hosted on same platform (manual visual comparison recommended)" };
    }
  } catch {
    // invalid URL
  }

  return { score: 0 };
}

// ── Handle Variant Generator ────────────────────────────────────────
// Given "pradhh.18", generate plausible alt handles like "pradhyyy", "pradh_18", "pradh18_", etc.
export function generateHandleVariants(username: string): string[] {
  const clean = username.replace(/^@/, "").toLowerCase();
  const variants = new Set<string>();

  // Extract root (alpha portion) and numeric portion
  const alphaRoot = clean.replace(/[^a-z]/g, "");
  const numericPart = clean.replace(/[^0-9]/g, "");

  // Short root for fuzzy matching
  const shortRoot = alphaRoot.length > 4 ? alphaRoot.slice(0, Math.ceil(alphaRoot.length * 0.7)) : alphaRoot;

  // Direct variations
  variants.add(clean.replace(/[._]/g, ""));       // remove separators
  variants.add(clean.replace(/[._]/g, "_"));       // unify separators
  variants.add(clean.replace(/[._]/g, "."));       // unify to dots
  variants.add(alphaRoot);                         // just the letters
  variants.add(`${alphaRoot}${numericPart}`);       // letters+numbers no sep
  variants.add(`${alphaRoot}_${numericPart}`);      // letters_numbers
  variants.add(`${alphaRoot}.${numericPart}`);      // letters.numbers

  // Letter doubling/tripling variations (pradhh → pradh, pradhyyy)
  const dedoubled = alphaRoot.replace(/(.)\1+/g, "$1");
  variants.add(dedoubled);
  variants.add(`${dedoubled}${numericPart}`);
  
  // Common suffix variations
  const suffixes = ["_", "__", "x", "xx", "xxx", "yyy", "real", "_real", ".real", "backup", "_backup", "alt", "_alt", "2", "_2", "01", "_01"];
  for (const suffix of suffixes) {
    variants.add(`${shortRoot}${suffix}`);
    variants.add(`${dedoubled}${suffix}`);
  }

  // Common prefix variations
  const prefixes = ["the", "real_", "its", "im_", "not_", "x_"];
  for (const prefix of prefixes) {
    variants.add(`${prefix}${shortRoot}`);
    variants.add(`${prefix}${dedoubled}`);
  }

  // Remove the original handle itself
  variants.delete(clean);

  return [...variants].filter(v => v.length >= 3 && v.length <= 30);
}



export function detectShadowAccounts(
  primaryHandle: string,
  primaryBio: string,
  primaryAvatarUrl: string | undefined,
  allAccounts: PlatformAccount[],
  posts: Post[]
): ShadowAccountResult[] {
  const results: ShadowAccountResult[] = [];
  const primaryClean = primaryHandle.replace(/^@/, "").toLowerCase();
  const variants = generateHandleVariants(primaryClean);

  // For each discovered account, run deep correlation against primary
  for (const account of allAccounts) {
    if (account.username.toLowerCase() === primaryClean) continue;

    const signals: string[] = [];

    // 1. Handle similarity (Levenshtein + LCS)
    const hScore = handleSimilarityScore(primaryClean, account.username);
    if (hScore >= 40) {
      signals.push(`Handle similarity: ${hScore}% (Levenshtein + substring matching)`);
    }

    // 2. Check if this handle matches any generated variant
    const isVariantMatch = variants.some(v => {
      const vScore = handleSimilarityScore(v, account.username);
      return vScore >= 75;
    });
    if (isVariantMatch) {
      signals.push(`Username matches a generated variant pattern of @${primaryClean}`);
    }

    // 3. Bio cross-reference
    const bioResult = bioCrossReferenceScore(primaryClean, primaryBio, account.username, account.bio);
    if (bioResult.score > 0) {
      signals.push(...bioResult.signals);
    }

    // 4. Avatar hash comparison
    const avatarResult = avatarHashScore(primaryAvatarUrl, account.profilePicUrl);
    if (avatarResult.score > 0 && avatarResult.signal) {
      signals.push(avatarResult.signal);
    }

    // 5. Writing style overlap from posts
    const primaryPosts = posts.filter(p => p.platform === allAccounts.find(a => a.username.toLowerCase() === primaryClean)?.platform);
    const accountPosts = posts.filter(p => p.platform === account.platform);
    const writingOverlap = computeWritingOverlap(primaryPosts, accountPosts);
    if (writingOverlap >= 40) {
      signals.push(`Writing style overlap: ${writingOverlap}% (vocabulary, punctuation, capitalization)`);
    }

    // 6. Temporal proximity (account creation)
    const primaryAccount = allAccounts.find(a => a.username.toLowerCase() === primaryClean);
    let temporalScore = 0;
    if (primaryAccount) {
      const dayGap = Math.abs(
        new Date(account.creationDate).getTime() - new Date(primaryAccount.creationDate).getTime()
      ) / (1000 * 60 * 60 * 24);
      if (dayGap <= 7) { temporalScore = 30; signals.push(`Account created within 7 days of primary (temporal evasion signal)`); }
      else if (dayGap <= 30) { temporalScore = 15; signals.push(`Account created within 30 days of primary`); }
    }

    // Compute overall confidence
    const overall = Math.min(100, Math.round(
      hScore * 0.25 +
      bioResult.score * 0.30 +
      avatarResult.score * 0.10 +
      writingOverlap * 0.15 +
      temporalScore +
      (isVariantMatch ? 10 : 0)
    ));

    if (overall >= 25 || signals.length >= 2) {
      results.push({
        handle: account.username,
        platform: account.platform,
        profileUrl: account.profileUrl,
        detectionMethod: signals.length > 0 ? signals[0] : "Aggregate heuristic correlation",
        handleSimilarity: hScore,
        bioCrossRef: bioResult.score,
        avatarMatch: avatarResult.score,
        overallConfidence: overall,
        confidenceLevel: overall >= 80 ? "CONFIRMED" : overall >= 55 ? "PROBABLE" : "POSSIBLE",
        signals,
        isPrivate: false, // We cannot confirm private status from public probing
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.overallConfidence - a.overallConfidence);
  return results;
}

function computeWritingOverlap(postsA: Post[], postsB: Post[]): number {
  if (postsA.length === 0 || postsB.length === 0) return 0;

  const textA = postsA.map(p => p.content).join(" ").toLowerCase();
  const textB = postsB.map(p => p.content).join(" ").toLowerCase();

  // Vocabulary overlap (Jaccard on words)
  const wordsA = new Set(textA.split(/\s+/).filter(w => w.length >= 3));
  const wordsB = new Set(textB.split(/\s+/).filter(w => w.length >= 3));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const vocabOverlap = union > 0 ? (intersection / union) * 100 : 0;

  // Punctuation density similarity
  const punctA = (textA.match(/[!?.,;:]/g) || []).length / Math.max(textA.length, 1);
  const punctB = (textB.match(/[!?.,;:]/g) || []).length / Math.max(textB.length, 1);
  const punctSimilarity = Math.max(0, 100 - Math.abs(punctA - punctB) * 1000);

  // Capitalization pattern similarity
  const capsA = (postsA.map(p => p.content).join(" ").match(/[A-Z]/g) || []).length / Math.max(textA.length, 1);
  const capsB = (postsB.map(p => p.content).join(" ").match(/[A-Z]/g) || []).length / Math.max(textB.length, 1);
  const capsSimilarity = Math.max(0, 100 - Math.abs(capsA - capsB) * 700);

  // Emoji usage similarity
  const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiA = (textA.match(emojiPattern) || []).length / Math.max(postsA.length, 1);
  const emojiB = (textB.match(emojiPattern) || []).length / Math.max(postsB.length, 1);
  const emojiSimilarity = Math.max(0, 100 - Math.abs(emojiA - emojiB) * 200);

  return Math.round(vocabOverlap * 0.4 + punctSimilarity * 0.25 + capsSimilarity * 0.2 + emojiSimilarity * 0.15);
}
