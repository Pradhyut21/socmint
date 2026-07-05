import { AliasResult, PlatformAccount, Post } from "../types";

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((item) => setB.has(item)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : (intersection / union) * 100;
}

function numbersIn(value: string) {
  return value.match(/\d+/g) || [];
}

function rootParts(value: string) {
  return value
    .toLowerCase()
    .replace(/^@/, "")
    .split(/[_\-.0-9]+/)
    .filter((part) => part.length >= 3);
}

function usernameScore(primary: string, handle: string) {
  const primaryClean = primary.replace(/^@/, "").toLowerCase();
  const handleClean = handle.replace(/^@/, "").toLowerCase();
  if (primaryClean === handleClean) return 100;

  const roots = rootParts(primaryClean);
  const handleRoots = rootParts(handleClean);
  const rootOverlap = jaccard(roots, handleRoots);
  const primaryNumbers = numbersIn(primaryClean);
  const handleNumbers = numbersIn(handleClean);
  const numberOverlap = primaryNumbers.length > 0 ? jaccard(primaryNumbers, handleNumbers) : 0;
  const substring = roots.some((root) => handleClean.includes(root)) || handleRoots.some((root) => primaryClean.includes(root)) ? 30 : 0;

  return Math.min(100, rootOverlap * 0.5 + numberOverlap * 0.3 + substring);
}

function writingStyleScore(primaryPosts: Post[], account: PlatformAccount, posts: Post[]) {
  const primaryText = primaryPosts.map((post) => post.content).join(" ");
  const accountText = [
    account.displayName,
    account.bio,
    ...posts.filter((post) => post.platform === account.platform).map((post) => post.content),
  ].join(" ");

  const overlap = jaccard(tokenize(primaryText), tokenize(accountText));
  const punctuationA = (primaryText.match(/[!?.,]/g) || []).length / Math.max(primaryText.length, 1);
  const punctuationB = (accountText.match(/[!?.,]/g) || []).length / Math.max(accountText.length, 1);
  const punctuationSimilarity = Math.max(0, 100 - Math.abs(punctuationA - punctuationB) * 1000);
  const capsA = (primaryText.match(/[A-Z]/g) || []).length / Math.max(primaryText.length, 1);
  const capsB = (accountText.match(/[A-Z]/g) || []).length / Math.max(accountText.length, 1);
  const capsSimilarity = Math.max(0, 100 - Math.abs(capsA - capsB) * 700);

  return Math.round(overlap * 0.55 + punctuationSimilarity * 0.25 + capsSimilarity * 0.2);
}

function timingScore(primaryDate: string | undefined, accountDate: string | undefined) {
  if (!primaryDate || !accountDate) return 20;
  const primary = new Date(primaryDate).getTime();
  const account = new Date(accountDate).getTime();
  if (!Number.isFinite(primary) || !Number.isFinite(account)) return 20;

  const dayGap = Math.abs(account - primary) / (1000 * 60 * 60 * 24);
  if (dayGap <= 7) return 100;
  if (dayGap <= 30) return 75;
  if (dayGap <= 180) return 45;
  return 20;
}

function level(confidence: number): AliasResult["confidenceLevel"] {
  if (confidence > 85) return "CONFIRMED";
  if (confidence >= 65) return "PROBABLE";
  return "POSSIBLE";
}

export function detectAliases(primaryUsername: string, accounts: PlatformAccount[], posts: Post[]): AliasResult[] {
  if (accounts.length === 0) return [];

  const primaryAccount =
    accounts.find((account) => account.username.toLowerCase() === primaryUsername.replace(/^@/, "").toLowerCase()) ||
    accounts.find((account) => account.confidence === "CONFIRMED") ||
    accounts[0];
  const primaryPosts = posts.filter((post) => post.platform === primaryAccount.platform);

  return accounts
    // An "alias" is a DIFFERENT handle that may belong to the same person
    // (e.g. a burner/evasion account). An account using the exact same
    // username as the primary query on another platform is just a
    // confirmed cross-platform presence, not an alias — excluding it here
    // prevents every same-named account from collapsing into duplicate
    // "alias:<handle>" network-graph nodes that all share one ID.
    .filter((account) => account.username.toLowerCase() !== primaryAccount.username.toLowerCase())
    .map((account) => {
      const writing = writingStyleScore(primaryPosts.length ? primaryPosts : posts, account, posts);
      const username = usernameScore(primaryAccount.username, account.username);
      const timing = timingScore(primaryAccount.creationDate, account.creationDate);
      const confidence = Math.round(writing * 0.4 + username * 0.3 + timing * 0.3);
      const aliasSignals: string[] = [];

      if (writing >= 60) aliasSignals.push(`Writing style matches primary account (${writing}%)`);
      if (username >= 60) aliasSignals.push(`Username pattern overlaps with primary handle (${username}%)`);
      if (timing >= 75) aliasSignals.push(`Account creation timing is close to primary account (${timing}%)`);
      if (account.confidence === "CONFIRMED") aliasSignals.push(`Platform response directly matched queried public handle`);
      if (aliasSignals.length === 0) aliasSignals.push("Weak public-link signals; manual verification recommended");

      const evasionPattern = timing >= 75 && account.id !== primaryAccount.id && username >= 40;
      const date1 = account.creationDate ? new Date(account.creationDate).getTime() : 0;
      const date2 = primaryAccount.creationDate ? new Date(primaryAccount.creationDate).getTime() : 0;
      const dayGap = Math.round(Math.abs(date1 - date2) / (1000 * 60 * 60 * 24));

      return {
        platform: account.platform,
        handle: account.username,
        profileUrl: account.profileUrl || account.url || "",
        isAlias: confidence >= 40,
        confidence,
        confidenceLevel: level(confidence),
        aliasSignals,
        evasionPattern,
        evasionReason: evasionPattern
          ? `Account creation is ${dayGap} day(s) from the primary account timeline; verify complaint/report dates before treating this as evasion.`
          : undefined,
        createdAt: account.creationDate,
      };
    })
    .filter((result) => result.isAlias);
}
