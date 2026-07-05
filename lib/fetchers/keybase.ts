/**
 * Keybase Connector
 * ---------------------------------------------------------------------------
 * Keybase is uniquely valuable for the SOCMINT problem statement because users
 * CRYPTOGRAPHICALLY PROVE ownership of their other accounts (Twitter, GitHub,
 * Reddit, HackerNews, personal domains). A Keybase match therefore yields
 * *verified* linkage between accounts — the strongest possible signal that
 * multiple handles belong to the same individual.
 *
 * Public API (no key required):
 *   https://keybase.io/_/api/1.0/user/lookup.json?usernames=<kbuser>
 *   https://keybase.io/_/api/1.0/user/lookup.json?github=<handle>
 *   https://keybase.io/_/api/1.0/user/lookup.json?twitter=<handle>
 */

export interface KeybaseLinkedAccount {
  platform: string;
  username: string;
  profileUrl: string;
  verified: true;
}

export interface KeybaseResult {
  found: boolean;
  keybaseUsername?: string;
  fullName?: string;
  location?: string;
  bio?: string;
  pictureUrl?: string;
  linkedAccounts: KeybaseLinkedAccount[];
  websites: string[];
  source: "Keybase (cryptographically verified)";
}

const EMPTY: KeybaseResult = {
  found: false,
  linkedAccounts: [],
  websites: [],
  source: "Keybase (cryptographically verified)",
};

function proofTypeToPlatform(proofType: string): string {
  const map: Record<string, string> = {
    twitter: "twitter",
    github: "github",
    reddit: "reddit",
    hackernews: "hackernews",
    mastodon: "mastodon",
    facebook: "facebook",
  };
  return map[proofType] || proofType;
}

async function lookup(paramKey: string, value: string, timeoutMs: number): Promise<KeybaseResult> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(
      `https://keybase.io/_/api/1.0/user/lookup.json?${paramKey}=${encodeURIComponent(value)}`,
      { signal: controller.signal, headers: { "User-Agent": "socmint-osint" } }
    );
    clearTimeout(t);
    if (!resp.ok) return EMPTY;

    const data = await resp.json();
    if (data?.status?.code !== 0) return EMPTY;

    const them = Array.isArray(data.them) ? data.them[0] : data.them;
    if (!them) return EMPTY;

    const linkedAccounts: KeybaseLinkedAccount[] = [];
    const websites: string[] = [];

    const proofs = them?.proofs_summary?.all || [];
    for (const proof of proofs) {
      const type = proof.proof_type as string;
      if (type === "dns" || type === "generic_web_site" || type === "https") {
        if (proof.service_url) websites.push(proof.service_url);
        continue;
      }
      const platform = proofTypeToPlatform(type);
      linkedAccounts.push({
        platform,
        username: proof.nametag,
        profileUrl: proof.service_url || proof.proof_url,
        verified: true,
      });
    }

    return {
      found: true,
      keybaseUsername: them?.basics?.username,
      fullName: them?.profile?.full_name,
      location: them?.profile?.location,
      bio: them?.profile?.bio,
      pictureUrl: them?.pictures?.primary?.url,
      linkedAccounts,
      websites,
      source: "Keybase (cryptographically verified)",
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Look up a subject on Keybase by trying their handle as a Keybase username,
 * then as a GitHub proof, then as a Twitter proof. Returns the first hit that
 * carries verified linked accounts.
 */
export async function fetchKeybaseIdentity(handle: string, timeoutMs = 8000): Promise<KeybaseResult> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean) return EMPTY;

  const attempts: Array<[string, string]> = [
    ["usernames", clean],
    ["github", clean],
    ["twitter", clean],
  ];

  for (const [key, val] of attempts) {
    const res = await lookup(key, val, timeoutMs);
    if (res.found && (res.linkedAccounts.length > 0 || res.keybaseUsername)) {
      return res;
    }
  }
  return EMPTY;
}
