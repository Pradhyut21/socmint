import fs from "fs";
import path from "path";
import { PlatformAccount, Post, LegalRecord, SuspectProfile } from "../types";

// Target demo usernames
const TARGET_USERS = ["darkphoenix_07", "kishansaaai", "shadowtrader99", "sneha_fintech", "kulkarni_sneha", "pradhh.18"];

export function isDemoUser(username: string): boolean {
  const lower = username.toLowerCase().replace("@", "");
  return TARGET_USERS.includes(lower);
}

export function loadDownloadedJson(username: string): any {
  const cleanUser = username.toLowerCase().replace("@", "");
  const possibleDirs = [
    "C:\\Users\\saiki\\Downloads",
    "C:\\Users\\saiki\\OneDrive\\Documents\\Desktop\\Downloads",
    "C:\\Users\\saiki\\OneDrive\\Desktop\\Downloads"
  ];
  for (const baseDir of possibleDirs) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      const files = fs.readdirSync(baseDir);
      for (const file of files) {
        const lowerFile = file.toLowerCase();
        if (lowerFile.endsWith(".json") && lowerFile.includes(cleanUser)) {
          const content = fs.readFileSync(path.join(baseDir, file), "utf-8");
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.error("Error reading directory/file:", e);
    }
  }
  return null;
}

export function getDemoProbeResult(
  lowercaseUrl: string
): { ok: boolean; status: number; displayName?: string; bio?: string; profilePicUrl?: string; followers?: number; following?: number; posts?: number; isPrivate?: boolean; creationDate?: string; lastActive?: string; extras?: any } | null {
  // 1. Parse platform name (e.g. instagram.com, threads.net, etc.)
  let platformKey = "";
  if (lowercaseUrl.includes("instagram.com")) platformKey = "instagram";
  else if (lowercaseUrl.includes("threads.net")) platformKey = "threads";
  else if (lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com")) platformKey = "twitter";
  else if (lowercaseUrl.includes("pinterest.com")) platformKey = "pinterest";
  else if (lowercaseUrl.includes("developer.apple.com")) platformKey = "appledevelopers";
  else if (lowercaseUrl.includes("chess.com")) platformKey = "chess";

  // 2. Extract username from the URL
  let queryUsername = "";
  try {
    const urlObj = new URL(lowercaseUrl);
    const pathname = urlObj.pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      queryUsername = parts[parts.length - 1].replace("@", "").toLowerCase();
      queryUsername = queryUsername.split("?")[0].split("#")[0];
    }
  } catch {}

  if (!queryUsername) return null;

  // 3. Scan downloads directory to find a matching JSON file
  const possibleDirs = [
    "C:\\Users\\saiki\\Downloads",
    "C:\\Users\\saiki\\OneDrive\\Documents\\Desktop\\Downloads",
    "C:\\Users\\saiki\\OneDrive\\Desktop\\Downloads"
  ];

  let matchedJson: any = null;
  let matchedTargetUser = "";

  for (const baseDir of possibleDirs) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      const files = fs.readdirSync(baseDir);
      for (const file of files) {
        if (!file.toLowerCase().endsWith(".json")) continue;
        const filePath = path.join(baseDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(content);

        // Check if queryUsername matches the main query (exact match only)
        const mainQuery = String(json.data?.query || json.query || "").toLowerCase().replace("@", "");
        if (mainQuery === queryUsername) {
          matchedJson = json;
          matchedTargetUser = mainQuery;
          break;
        }

        // Check discovered_usernames list (exact match only)
        const discovered = json.data?.discovered_usernames || json.discovered_usernames || [];
        const isDiscovered = discovered.some((d: any) => {
          const u = String(d.username || "").toLowerCase().replace("@", "");
          return u === queryUsername;
        });

        if (isDiscovered) {
          matchedJson = json;
          matchedTargetUser = mainQuery;
          break;
        }

        // Check results list for matching usernames
        const results = json.data?.results || [];
        const isResult = results.some((r: any) => {
          const u = String(r.username || "").toLowerCase().replace("@", "");
          return u === queryUsername;
        });

        if (isResult) {
          matchedJson = json;
          matchedTargetUser = mainQuery;
          break;
        }
      }
      if (matchedJson) break;
    } catch (e) {
      console.error("Error reading downloads dir:", e);
    }
  }

  // 4. Handle hardcoded alias mappings for kishansaaai
  if (!matchedJson) {
    const isKishanAlias = queryUsername.includes("sai.kishan.a.007") || 
                         queryUsername.includes("saikishana1") || 
                         queryUsername.includes("sai_kishan_a") ||
                         queryUsername.includes("kishansaaai");
    if (isKishanAlias) {
      matchedJson = loadDownloadedJson("kishansaaai");
      matchedTargetUser = "kishansaaai";
    }
  }

  // 5. Handle user custom test accounts
  if (!matchedJson) {
    const isPradhyutAlias = queryUsername.includes("pradhh.18") || 
                           queryUsername.includes("pradhyut21") || 
                           queryUsername.includes("pradhyut");
    if (isPradhyutAlias) {
      matchedTargetUser = "pradhh.18";
    }
  }

  // If we found a matching user or custom test account
  if (matchedJson || matchedTargetUser) {
    // If it is Instagram or Threads, return a valid profile
    if (platformKey === "instagram" || platformKey === "threads") {
      const isInsta = platformKey === "instagram";
      const results = matchedJson?.data?.results || [];
      const record = results.find((r: any) => {
        const plat = String(r.platform || "").toLowerCase();
        const u = String(r.username || "").toLowerCase().replace("@", "");
        return (plat === "instagram" || plat === "threads") && u === queryUsername;
      });

      if (record) {
        return {
          ok: true,
          status: 200,
          displayName: record.displayName,
          bio: record.bio || record.description,
          profilePicUrl: record.pfpUrl,
          followers: record.followers,
          following: record.following,
          posts: record.posts,
          isPrivate: record.isPrivate,
          creationDate: record.createdAt,
          lastActive: record.lastActive,
          extras: record.extras || {}
        };
      }

      // No real Instagram/Threads record found in JSON — return null so platform is skipped cleanly.
      return null;
    }

    // For other platforms, check if we have a record in the JSON file
    if (matchedJson) {
      const results = matchedJson.data?.results || [];
      const record = results.find((r: any) => {
        if (!r.profileUrl && !r.platformUrl) return false;
        const urlToCheck = String(r.profileUrl || r.platformUrl || "").toLowerCase();
        try {
          const hostname = new URL(lowercaseUrl).hostname.replace("www.", "");
          if (urlToCheck.startsWith("http")) {
            const u1 = new URL(urlToCheck).hostname.replace("www.", "");
            return u1 === hostname;
          }
          return urlToCheck.includes(hostname);
        } catch {
          return false;
        }
      });

      if (record) {
        return {
          ok: true,
          status: 200,
          displayName: record.displayName,
          bio: record.bio || record.description,
          profilePicUrl: record.pfpUrl,
          followers: record.followers,
          following: record.following,
          posts: record.posts,
          isPrivate: record.isPrivate,
          creationDate: record.createdAt,
          lastActive: record.lastActive,
          extras: record.extras || {}
        };
      }
    }
  }

  return null;
}

export function getDemoGithubData(
  username: string
): { account: Partial<PlatformAccount>; posts: Post[] } | null {
  const json = loadDownloadedJson(username);
  if (!json) return null;

  const results = json.data?.results || [];
  const gh = results.find((r: any) => r.platform.toLowerCase() === "github");
  if (!gh) return null;

  return {
    account: {
      displayName: gh.displayName || gh.username,
      bio: gh.bio || "Public GitHub profile found.",
      profilePicUrl: gh.pfpUrl,
      followers: gh.followers || 0,
      creationDate: gh.createdAt || new Date().toISOString().slice(0, 10),
      extras: gh.extras || {}
    },
    posts: []
  };
}

export function getDemoLegalRecords(
  username: string,
  realName: string,
  capturedAt: string
): LegalRecord[] {
  return [];
}

export function getDemoNewSuspectProfile(
  photoUrl: string,
  capturedAt: string
): Omit<SuspectProfile, "faceScan" | "network" | "caseReference"> {
  return {
    username: "unknown",
    realName: "Unknown Subject",
    phoneNumber: "Not provided",
    emailAddress: "Not provided",
    photoUrl,
    riskScore: 0,
    riskLevel: "LOW",
    riskSubscores: { language: 0, behavioral: 0, network: 0, legal: 0 },
    riskSignals: [],
    accounts: [],
    posts: [],
    legalRecords: [],
    aliasResults: [],
    locations: [],
    capturedAt
  };
}
