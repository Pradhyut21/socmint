import { PlatformAccount, Post, LegalRecord, SuspectProfile, LinkedinIntelligence } from "../types";

export function isDemoUser(username: string): boolean {
  return false;
}

export function getDemoProbeResult(
  lowercaseUrl: string
): { ok: boolean; status: number; title?: string; description?: string } | null {
  return null;
}

export function getDemoGithubData(
  username: string
): { account: Partial<PlatformAccount> & { githubIntel: any }; posts: Post[] } | null {
  return null;
}

export function getDemoExtraAccounts(
  username: string,
  capturedAt: string
): PlatformAccount[] {
  return [];
}

export function getDemoUpiFootprint(username: string): any | undefined {
  return undefined;
}

export function getDemoLegalRecords(
  username: string,
  realName: string,
  capturedAt: string
): LegalRecord[] {
  return [];
}

export function getDemoEducationAndExperience(username: string): {
  resumeUrl?: string;
  education?: { institution: string; degree: string; period: string }[];
  experience?: { role: string; company: string; period: string; details: string }[];
} {
  return {};
}

export function getDemoLinkedinData(username: string): LinkedinIntelligence | null {
  return null;
}

export function getDemoNewSuspectProfile(
  photoUrl: string,
  capturedAt: string
): Omit<SuspectProfile, "faceScan" | "network" | "caseReference"> {
  const realName = "Rajesh Kumar";
  const username = "rk_crypto_dev";
  const phoneNumber = "+91 99887 76655";
  const emailAddress = "rk_crypto@proton.me";

  const accounts: PlatformAccount[] = [
    {
      id: "github-rk_crypto_dev",
      platform: "github",
      tier: 1,
      username: "rk_crypto_dev",
      profileUrl: "https://github.com/rk_crypto_dev",
      displayName: "Rajesh Kumar",
      bio: "Blockchain architect and open source builder. Active in Bengaluru Web3 developer groups.",
      profilePicUrl: photoUrl,
      deepfakeFlag: false,
      followers: 45,
      creationDate: "2024-03-10",
      confidence: "CONFIRMED",
      reason: "Matched during automated forensic face indexing sweep.",
      capturedAt,
    },
    {
      id: "twitter-rk_crypto_dev",
      platform: "twitter",
      tier: 2,
      username: "rk_crypto_dev",
      profileUrl: "https://twitter.com/rk_crypto_dev",
      displayName: "Rajesh Kumar",
      bio: "Web3 architect, smart contract security auditor.",
      profilePicUrl: photoUrl,
      deepfakeFlag: false,
      followers: 128,
      creationDate: "2024-03-10",
      confidence: "CONFIRMED",
      reason: "Matched during automated forensic face indexing sweep.",
      capturedAt,
    }
  ];

  return {
    username: `@${username}`,
    realName,
    phoneNumber,
    emailAddress,
    photoUrl,
    riskLevel: "LOW",
    riskScore: 12,
    riskSubscores: {
      language: 0,
      behavioral: 0,
      network: 12,
      legal: 0
    },
    riskSignals: [
      "2 public profiles discovered under identical username.",
      "EXIF metadata contains valid Bengaluru geotag signature."
    ],
    accounts,
    posts: [],
    legalRecords: [],
    aliasResults: [],
    newsArticles: [],
    shadowAccounts: [],
    cryptoTrace: undefined,
    capturedAt,
    locations: [],
  };
}
