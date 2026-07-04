import { NextRequest } from "next/server";
import {
  cleanQuery,
  fetchGithubActivity,
  fetchRedditActivity,
  fetchGitLabActivity,
  fetchHackerNewsActivity,
  fetchDevToActivity,
  fetchWithTimeout,
  extractMeta,
  fetchLeetCodeDetails,
  fetchDuolingoDetails,
  fetchTwitchDetails,
  fetchChessDetails,
  fetchGithubDetails,
  fetchYoutubeDetails,
  fetchTwitterDetails,
  fetchSoundCloudDetails,
  fetchPastebinDetails,
  fetchDribbbleDetails,
  fetchThreadsDetails,
  type ProbeResult,
  type LinkedinMeta,
  type InstagramMeta,
} from "../../../lib/fetchers/social";
import type { PlatformAccount, Post } from "../../../lib/types";
import { UNRELIABLE_PLATFORMS } from "../../../lib/unreliablePlatforms";

export const runtime = "nodejs";

interface LocalProbe {
  platform: string;
  label: string;
  url: (username: string) => string;
  normalize?: (username: string) => string;
}

const LOCAL_PROBES: LocalProbe[] = [
  { platform: "twitter",   label: "X / Twitter", url: (u) => `https://x.com/${u}` },
  { platform: "instagram", label: "Instagram",  url: (u) => `https://www.instagram.com/${u}` },
  { platform: "facebook",  label: "Facebook",   url: (u) => `https://www.facebook.com/${u}` },
  { platform: "telegram",  label: "Telegram",   url: (u) => `https://t.me/${u}` },
  { platform: "linkedin",  label: "LinkedIn",   normalize: (u) => u.replace(/^in\//, "").replace(/[\s_.]+/g, "-").toLowerCase(), url: (u) => `https://www.linkedin.com/in/${u}` },
  { platform: "tiktok",    label: "TikTok",     url: (u) => `https://www.tiktok.com/@${u}` },
  { platform: "snapchat",  label: "Snapchat",   url: (u) => `https://www.snapchat.com/add/${u}` },
  { platform: "pinterest", label: "Pinterest",  url: (u) => `https://www.pinterest.com/${u}` },
  { platform: "soundcloud",label: "SoundCloud", url: (u) => `https://soundcloud.com/${u}` },
  { platform: "medium",    label: "Medium",     url: (u) => `https://medium.com/@${u}` },
  { platform: "quora",     label: "Quora",      url: (u) => `https://www.quora.com/profile/${u}` },
  { platform: "steam",     label: "Steam",      url: (u) => `https://steamcommunity.com/id/${u}` },
  { platform: "pastebin",  label: "Pastebin",   url: (u) => `https://pastebin.com/u/${u}` },
  { platform: "youtube",   label: "YouTube",    url: (u) => `https://www.youtube.com/@${u}` },
  { platform: "tumblr",    label: "Tumblr",     url: (u) => `https://${u}.tumblr.com` },
  { platform: "stackoverflow", label: "Stack Overflow", url: (u) => `https://stackoverflow.com/users/story/${u}` },
  { platform: "twitch",    label: "Twitch",     url: (u) => `https://www.twitch.tv/${u}` },
  { platform: "keybase",   label: "Keybase",    url: (u) => `https://keybase.io/${u}` },
  { platform: "codepen",   label: "CodePen",    url: (u) => `https://codepen.io/${u}` },
  { platform: "behance",   label: "Behance",    url: (u) => `https://www.behance.net/${u}` },
  { platform: "dribbble",  label: "Dribbble",   url: (u) => `https://dribbble.com/${u}` },
  { platform: "duolingo",  label: "Duolingo",   url: (u) => `https://www.duolingo.com/profile/${u}` },
  { platform: "freelancer",label: "Freelancer.com", url: (u) => `https://www.freelancer.com/u/${u}` },
  { platform: "leetcode",  label: "LeetCode",   url: (u) => `https://leetcode.com/u/${u}` },
  { platform: "threads",   label: "Threads",    url: (u) => `https://www.threads.net/@${u}` },
  { platform: "chess",     label: "Chess",      url: (u) => `https://www.chess.com/member/${u}` },
  { platform: "picsart",   label: "Picsart",    url: (u) => `https://picsart.com/u/${u}` },
  { platform: "kaggle",    label: "Kaggle",     url: (u) => `https://www.kaggle.com/${u}` },
  { platform: "academia",  label: "Academia",   url: (u) => `https://independent.academia.edu/${u}` },
  { platform: "appledevelopers", label: "AppleDevelopers", url: (u) => `https://developer.apple.com/forums/profile/${u}` },
  { platform: "smule",     label: "Smule",      url: (u) => `https://www.smule.com/${u}` },
  { platform: "quizlet",   label: "Quizlet",    url: (u) => `https://quizlet.com/user/${u}` },
];

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

interface ProbeStatusResult {
  status: "FOUND" | "NOT_FOUND" | "ERROR";
  reason?: string;
  data?: any;
}

async function probePublicProfileDirect(url: string, platform: string, clean: string): Promise<ProbeStatusResult> {
  const lowercaseUrl = url.toLowerCase();
  const platKey = platform.toLowerCase();

  // ── Intercept Unreliable Platforms ──────────────────────────────────
  const unreliable = UNRELIABLE_PLATFORMS.find(p => p.id === platKey);
  if (unreliable) {
    return { status: "ERROR", reason: unreliable.reason };
  }

  // ── LeetCode Upgraded Detail-Fetch Check ────────────────────────────
  if (platKey === "leetcode") {
    try {
      const details = await fetchLeetCodeDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "leetcode",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active LeetCode profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Duolingo Upgraded Detail-Fetch Check ────────────────────────────
  if (platKey === "duolingo") {
    try {
      const details = await fetchDuolingoDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "duolingo",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active Duolingo profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Twitch Upgraded Detail-Fetch Check ──────────────────────────────
  if (platKey === "twitch") {
    try {
      const details = await fetchTwitchDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "twitch",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active Twitch profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Chess.com Upgraded Detail-Fetch Check ───────────────────────────
  if (platKey === "chess") {
    try {
      const details = await fetchChessDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "chess",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active Chess.com profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── GitHub Upgraded Detail-Fetch Check ──────────────────────────────
  if (platKey === "github") {
    try {
      const details = await fetchGithubDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "github",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active GitHub profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: details.followers || 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      const failStatus = details.status || 404;
      if (failStatus === 403 || failStatus === 429) {
        return { status: "ERROR", reason: "GitHub API Rate Limit Exceeded." };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── YouTube Upgraded Detail-Fetch Check ─────────────────────────────
  if (platKey === "youtube") {
    try {
      const details = await fetchYoutubeDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "youtube",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active YouTube profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── X / Twitter Upgraded Detail-Fetch Check ─────────────────────────
  if (platKey === "twitter" || platKey === "x") {
    try {
      const details = await fetchTwitterDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "twitter",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active X / Twitter profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── SoundCloud Upgraded Detail-Fetch Check ──────────────────────────
  if (platKey === "soundcloud") {
    try {
      const details = await fetchSoundCloudDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "soundcloud",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active SoundCloud profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Pastebin Upgraded Detail-Fetch Check ────────────────────────────
  if (platKey === "pastebin") {
    try {
      const details = await fetchPastebinDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "pastebin",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active Pastebin profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Dribbble Upgraded Detail-Fetch Check ────────────────────────────
  if (platKey === "dribbble") {
    try {
      const details = await fetchDribbbleDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "dribbble",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active Dribbble profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: 0,
            confidence: "PROBABLE",
            postCount: 0
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Threads Upgraded Detail-Fetch Check ─────────────────────────
  if (platKey === "threads") {
    try {
      const details = await fetchThreadsDetails(clean);
      if (details.ok) {
        return {
          status: "FOUND",
          data: {
            platform: "threads",
            username: clean,
            displayName: details.displayName || clean,
            bio: details.bio || "Active Threads profile confirmed.",
            profileUrl: url,
            profilePicUrl: details.profilePicUrl || null,
            followers: details.followers ?? 0,
            confidence: "PROBABLE",
            postCount: 0,
          }
        };
      }
      return { status: "NOT_FOUND" };
    } catch (err: any) {
      return { status: "ERROR", reason: err?.message || "Connection timeout" };
    }
  }

  // ── Reddit: use JSON API ──────────────────────────────────────────
  if (lowercaseUrl.includes("reddit.com/user/")) {
    const redditUser = lowercaseUrl.split("reddit.com/user/")[1]?.split("/")[0]?.split("?")[0] || "";
    if (redditUser) {
      try {
        const jsonResp = await fetchWithTimeout(`https://www.reddit.com/user/${redditUser}/about.json`, 4500);
        if (jsonResp.status === 404 || jsonResp.status === 410) {
          return { status: "NOT_FOUND" };
        }
        if (jsonResp.status === 403 || jsonResp.status === 429) {
          return { status: "ERROR", reason: "Blocked (403)" };
        }
        if (jsonResp.ok) {
          const data = await jsonResp.json();
          if (data?.data?.name) {
            return {
              status: "FOUND",
              data: {
                platform: "reddit",
                username: data.data.name,
                displayName: data.data.name,
                bio: data.data.subreddit?.public_description || "Active Reddit account found.",
                profileUrl: `https://www.reddit.com/user/${data.data.name}`,
                profilePicUrl: null,
                followers: 0,
                confidence: "PROBABLE",
                postCount: 0,
              }
            };
          }
        }
        return { status: "ERROR", reason: "Blocked by rate-limit" };
      } catch (err: any) {
        return { status: "ERROR", reason: err?.message || "Connection timeout" };
      }
    }
  }

  // ── Instagram: use internal web API ──────────────────────────────────
  if (lowercaseUrl.includes("instagram.com/") && !lowercaseUrl.includes("/p/") && !lowercaseUrl.includes("/reel/")) {
    const igUser = lowercaseUrl.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || "";
    if (igUser && igUser.length > 0 && !igUser.startsWith("explore") && !igUser.startsWith("accounts")) {
      try {
        const igApiResp = await fetchWithTimeout(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${igUser}`,
          4500,
          {
            headers: {
              "x-ig-app-id": "936619743392459",
              "x-requested-with": "XMLHttpRequest",
              Referer: "https://www.instagram.com/",
              Accept: "application/json",
            },
          }
        );
        if (igApiResp.status === 404 || igApiResp.status === 410) {
          return { status: "NOT_FOUND" };
        }
        if (igApiResp.status === 403 || igApiResp.status === 429) {
          return { status: "ERROR", reason: "Rate limited (429)" };
        }
        if (igApiResp.ok) {
          const body = await igApiResp.json();
          const user = body?.data?.user;
          if (user) {
            return {
              status: "FOUND",
              data: {
                platform: "instagram",
                username: user.username,
                displayName: user.full_name || null,
                bio: user.biography || null,
                profileUrl: url,
                profilePicUrl: user.profile_pic_url || null,
                followers: user.edge_followed_by?.count || 0,
                confidence: "PROBABLE",
                postCount: 0,
              }
            };
          }
        }
        return { status: "ERROR", reason: "Blocked by IG checkpoint" };
      } catch (err: any) {
        return { status: "ERROR", reason: err?.message || "Connection timeout" };
      }
    }
  }

  // ── General direct fetch probe ─────────────────────────────────────
  try {
    const response = await fetchWithTimeout(url, 4500);
    
    // Explicit NOT FOUND statuses
    if (response.status === 404 || response.status === 410) {
      return { status: "NOT_FOUND" };
    }

    // Rate limits / blocks / custom rate-limiting codes (like LinkedIn status 999)
    if (response.status === 403) {
      return { status: "ERROR", reason: "Blocked (403)" };
    }
    if (response.status === 429) {
      return { status: "ERROR", reason: "Rate limited (429)" };
    }
    if (response.status === 999) {
      return { status: "ERROR", reason: "LinkedIn block (999)" };
    }

    if (!response.ok) {
      return { status: "ERROR", reason: `HTTP status ${response.status}` };
    }

    const html = await response.text();
    const title = extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i);
    const description =
      extractMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      extractMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

    const lowerTitle = title?.toLowerCase() || "";

    // Login redirects or auth walls
    if (lowerTitle.includes("login") || lowerTitle.includes("sign in") || lowerTitle.includes("log in") || lowerTitle.includes("sign up") || lowerTitle.includes("register") || lowerTitle.includes("authorize") || lowerTitle.includes("checking your browser")) {
      return { status: "ERROR", reason: "Login wall / Auth required" };
    }

    // Check for not found keyword matches in title and description ONLY (never scan the raw html string)
    const hasNotFoundKeyword = /not found|page doesn't exist|this account doesn't exist|no such user|no such member/i.test(`${title} ${description}`);
    if (hasNotFoundKeyword) {
      return { status: "NOT_FOUND" };
    }

    const ogImage = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || extractMeta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return {
      status: "FOUND",
      data: {
        platform,
        username: clean,
        displayName: title || null,
        bio: description || null,
        profileUrl: url,
        profilePicUrl: ogImage || null,
        followers: 0,
        confidence: "PROBABLE",
        postCount: 0,
      }
    };
  } catch (err: any) {
    let reason = "Connection timeout";
    if (err?.message && err.message.toLowerCase().includes("fetch failed")) {
      reason = "ISP DNS block / Fetch failed";
    }
    return { status: "ERROR", reason };
  }
}

async function pool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function GET(request: NextRequest) {
  const rawUsername = request.nextUrl.searchParams.get("username")?.trim() ?? "";
  if (!rawUsername) {
    return new Response("Missing username parameter", { status: 400 });
  }

  const usernames = rawUsername
    .split(",")
    .map((u) => cleanQuery(u))
    .filter(Boolean);

  if (usernames.length === 0) {
    return new Response("No valid usernames provided", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: object) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(payload)));
        } catch {
          // client disconnected
        }
      };

      enqueue({ type: "ping", usernames });

      let completedProbes = 0;
      const totalProbes = 5 + LOCAL_PROBES.length; // 37

      const safetyTimeout = setTimeout(() => {
        enqueue({ type: "done" });
        try {
          controller.close();
        } catch (e) {}
      }, 28000);

      const markProbeCompleted = () => {
        completedProbes++;
        if (completedProbes >= totalProbes) {
          clearTimeout(safetyTimeout);
          enqueue({ type: "done" });
          try {
            controller.close();
          } catch (e) {}
        }
      };

      // ── GitHub (rich API) ───────────────────────────────────────────
      Promise.all(usernames.map(u => fetchGithubActivity(u, false, process.env.GITHUB_TOKEN).catch((err) => {
        return { account: undefined, posts: [], errorStatus: err?.status || 403 };
      })))
        .then(async (results) => {
          const foundResult = results.find(gh => gh.account);
          if (foundResult && foundResult.account) {
            const index = results.indexOf(foundResult);
            const resolvedUser = foundResult.resolvedUsername ?? usernames[index];
            enqueue({
              type: "result",
              platform: "github",
              status: "FOUND",
              data: {
                platform: "github",
                username: resolvedUser,
                displayName: foundResult.account.displayName ?? null,
                bio: foundResult.account.bio ?? null,
                profileUrl: `https://github.com/${resolvedUser}`,
                profilePicUrl: foundResult.account.profilePicUrl ?? null,
                followers: foundResult.account.followers ?? 0,
                confidence: "CONFIRMED",
                postCount: foundResult.posts.length,
              },
            });
          } else {
            let finalStatus: "FOUND" | "NOT_FOUND" | "ERROR" = "NOT_FOUND";
            let foundData: any = null;
            let errReason = "API rate-limit / Blocked";

            for (const u of usernames) {
              const res = await probePublicProfileDirect(`https://github.com/${u}`, "github", u);
              if (res.status === "FOUND") {
                finalStatus = "FOUND";
                foundData = res.data;
                break;
              } else if (res.status === "ERROR") {
                finalStatus = "ERROR";
                errReason = res.reason || "Probe error";
              }
            }

            if (finalStatus === "FOUND") {
              enqueue({
                type: "result",
                platform: "github",
                status: "FOUND",
                data: foundData,
              });
            } else {
              enqueue({ type: "result", platform: "github", status: finalStatus, reason: errReason });
            }
          }
          markProbeCompleted();
        }).catch(() => {
          enqueue({ type: "result", platform: "github", status: "ERROR", reason: "API Error" });
          markProbeCompleted();
        });

      // ── GitLab (rich API) ───────────────────────────────────────────
      Promise.all(usernames.map(u => fetchGitLabActivity(u).catch((err) => {
        return { account: undefined, posts: [], errorStatus: err?.status || 403 };
      })))
        .then(async (results) => {
          const foundResult = results.find(gl => gl.account);
          if (foundResult && foundResult.account) {
            const index = results.indexOf(foundResult);
            const resolvedUser = usernames[index];
            enqueue({
              type: "result",
              platform: "gitlab",
              status: "FOUND",
              data: {
                platform: "gitlab",
                username: resolvedUser,
                displayName: foundResult.account.displayName ?? null,
                bio: foundResult.account.bio ?? null,
                profileUrl: `https://gitlab.com/${resolvedUser}`,
                profilePicUrl: foundResult.account.profilePicUrl ?? null,
                followers: foundResult.account.followers ?? 0,
                confidence: "CONFIRMED",
                postCount: foundResult.posts.length,
              },
            });
          } else {
            let finalStatus: "FOUND" | "NOT_FOUND" | "ERROR" = "NOT_FOUND";
            let foundData: any = null;
            let errReason = "API rate-limit / Blocked";

            for (const u of usernames) {
              const res = await probePublicProfileDirect(`https://gitlab.com/${u}`, "gitlab", u);
              if (res.status === "FOUND") {
                finalStatus = "FOUND";
                foundData = res.data;
                break;
              } else if (res.status === "ERROR") {
                finalStatus = "ERROR";
                errReason = res.reason || "Probe error";
              }
            }

            if (finalStatus === "FOUND") {
              enqueue({
                type: "result",
                platform: "gitlab",
                status: "FOUND",
                data: foundData,
              });
            } else {
              enqueue({ type: "result", platform: "gitlab", status: finalStatus, reason: errReason });
            }
          }
          markProbeCompleted();
        }).catch(() => {
          enqueue({ type: "result", platform: "gitlab", status: "ERROR", reason: "API Error" });
          markProbeCompleted();
        });

      // ── Reddit (rich API) ───────────────────────────────────────────
      Promise.all(usernames.map(u => fetchRedditActivity(u).catch(() => [] as Post[])))
        .then(async (results) => {
          const foundIndex = results.findIndex(posts => posts.length > 0);
          if (foundIndex !== -1) {
            const resolvedUser = usernames[foundIndex];
            const posts = results[foundIndex];
            enqueue({
              type: "result",
              platform: "reddit",
              status: "FOUND",
              data: {
                platform: "reddit",
                username: resolvedUser,
                displayName: resolvedUser,
                bio: `${posts.length} public post(s) found on Reddit.`,
                profileUrl: `https://www.reddit.com/user/${resolvedUser}`,
                profilePicUrl: null,
                followers: 0,
                confidence: "PROBABLE",
                postCount: posts.length,
              },
            });
          } else {
            let finalStatus: "FOUND" | "NOT_FOUND" | "ERROR" = "NOT_FOUND";
            let foundData: any = null;
            let errReason = "API rate-limit / Blocked";

            for (const u of usernames) {
              const res = await probePublicProfileDirect(`https://www.reddit.com/user/${u}`, "reddit", u);
              if (res.status === "FOUND") {
                finalStatus = "FOUND";
                foundData = res.data;
                break;
              } else if (res.status === "ERROR") {
                finalStatus = "ERROR";
                errReason = res.reason || "Probe error";
              }
            }

            if (finalStatus === "FOUND") {
              enqueue({
                type: "result",
                platform: "reddit",
                status: "FOUND",
                data: foundData,
              });
            } else {
              enqueue({ type: "result", platform: "reddit", status: finalStatus, reason: errReason });
            }
          }
          markProbeCompleted();
        }).catch(() => {
          enqueue({ type: "result", platform: "reddit", status: "ERROR", reason: "API Error" });
          markProbeCompleted();
        });

      // ── HackerNews (rich API) ──────────────────────────────────────
      Promise.all(usernames.map(u => fetchHackerNewsActivity(u).catch(() => ({ account: undefined, posts: [] as Post[] }))))
        .then(async (results) => {
          const foundResult = results.find(hn => hn.account);
          if (foundResult && foundResult.account) {
            const index = results.indexOf(foundResult);
            const resolvedUser = usernames[index];
            enqueue({
              type: "result",
              platform: "hackernews",
              status: "FOUND",
              data: {
                platform: "hackernews",
                username: resolvedUser,
                displayName: foundResult.account.displayName ?? null,
                bio: foundResult.account.bio ?? null,
                profileUrl: `https://news.ycombinator.com/user?id=${resolvedUser}`,
                profilePicUrl: null,
                followers: foundResult.account.followers ?? 0,
                confidence: "CONFIRMED",
                postCount: foundResult.posts.length,
              },
            });
          } else {
            let finalStatus: "FOUND" | "NOT_FOUND" | "ERROR" = "NOT_FOUND";
            let foundData: any = null;
            let errReason = "API rate-limit / Blocked";

            for (const u of usernames) {
              const res = await probePublicProfileDirect(`https://news.ycombinator.com/user?id=${u}`, "hackernews", u);
              if (res.status === "FOUND") {
                finalStatus = "FOUND";
                foundData = res.data;
                break;
              } else if (res.status === "ERROR") {
                finalStatus = "ERROR";
                errReason = res.reason || "Probe error";
              }
            }

            if (finalStatus === "FOUND") {
              enqueue({
                type: "result",
                platform: "hackernews",
                status: "FOUND",
                data: foundData,
              });
            } else {
              enqueue({ type: "result", platform: "hackernews", status: finalStatus, reason: errReason });
            }
          }
          markProbeCompleted();
        }).catch(() => {
          enqueue({ type: "result", platform: "hackernews", status: "ERROR", reason: "API Error" });
          markProbeCompleted();
        });

      // ── Dev.to (rich API) ──────────────────────────────────────────
      Promise.all(usernames.map(u => fetchDevToActivity(u).catch(() => ({ account: undefined, posts: [] as Post[] }))))
        .then(async (results) => {
          const foundResult = results.find(dt => dt.account);
          if (foundResult && foundResult.account) {
            const index = results.indexOf(foundResult);
            const resolvedUser = usernames[index];
            enqueue({
              type: "result",
              platform: "devto",
              status: "FOUND",
              data: {
                platform: "devto",
                username: resolvedUser,
                displayName: foundResult.account.displayName ?? null,
                bio: foundResult.account.bio ?? null,
                profileUrl: `https://dev.to/${resolvedUser}`,
                profilePicUrl: foundResult.account.profilePicUrl ?? null,
                followers: foundResult.account.followers ?? 0,
                confidence: "CONFIRMED",
                postCount: foundResult.posts.length,
              },
            });
          } else {
            let finalStatus: "FOUND" | "NOT_FOUND" | "ERROR" = "NOT_FOUND";
            let foundData: any = null;
            let errReason = "API rate-limit / Blocked";

            for (const u of usernames) {
              const res = await probePublicProfileDirect(`https://dev.to/${u}`, "devto", u);
              if (res.status === "FOUND") {
                finalStatus = "FOUND";
                foundData = res.data;
                break;
              } else if (res.status === "ERROR") {
                finalStatus = "ERROR";
                errReason = res.reason || "Probe error";
              }
            }

            if (finalStatus === "FOUND") {
              enqueue({
                type: "result",
                platform: "devto",
                status: "FOUND",
                data: foundData,
              });
            } else {
              enqueue({ type: "result", platform: "devto", status: finalStatus, reason: errReason });
            }
          }
          markProbeCompleted();
        }).catch(() => {
          enqueue({ type: "result", platform: "devto", status: "ERROR", reason: "API Error" });
          markProbeCompleted();
        });

      // ── Remaining platforms via HTTP probe ──────────────────────────
      const probeWorker = async (probe: LocalProbe) => {
        const probePromises = usernames.map(async (u) => {
          const normalized = probe.normalize ? probe.normalize(u) : u;
          const profileUrl = probe.url(normalized);
          try {
            const result = await probePublicProfileDirect(profileUrl, probe.platform, u);
            return { username: u, profileUrl, result };
          } catch (err: any) {
            return { username: u, profileUrl, result: { status: "ERROR" as const, reason: err?.message || "Probe error", data: undefined } };
          }
        });

        const results = await Promise.all(probePromises);
        const foundResult = results.find(r => r.result.status === "FOUND");
        if (foundResult) {
          enqueue({
            type: "result",
            platform: probe.platform,
            status: "FOUND",
            data: foundResult.result.data,
          });
        } else {
          const hasError = results.some(r => r.result.status === "ERROR");
          const errorItem = results.find(r => r.result.status === "ERROR");
          enqueue({
            type: "result",
            platform: probe.platform,
            status: hasError ? "ERROR" : "NOT_FOUND",
            reason: hasError ? (errorItem?.result.reason || "Blocked / Challenge") : undefined
          });
        }
        markProbeCompleted();
      };

      // Run probes with concurrency of 8 to prevent network bottleneck and timeouts
      pool(LOCAL_PROBES, 16, probeWorker);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
