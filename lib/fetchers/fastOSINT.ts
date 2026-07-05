/**
 * Fast OSINT API Integration
 * Calls tool APIs directly via HTTP instead of CLI for speed
 * Based on actual API endpoints from popular OSINT tool repositories
 */

import type { PlatformAccount } from '../types';
import { searchLinkedInViaGoogleAPI, isGoogleSearchConfigured } from './linkedinGoogleAPI';
import { fetchProfile as fetchLinkedInProfile, searchRelatedProfiles } from './linkedinMultiEngine';
import { searchLinkedInViaGoogle } from './linkedinGoogleRelated';
import { searchLinkedInAuthenticated, isLinkedInAuthConfigured } from './linkedinAuthSearch';
import { calculateConfidenceScore, sortByConfidence, getConfidenceLabel } from '../utils/confidenceScoring';
import { generateUsernameVariations, matchesVariation, getVariationDescription } from '../utils/usernameVariations';

export interface FastOSINTResult {
  username?: string;
  email?: string;
  accounts_found: number;
  accounts: Array<{
    platform: string;
    username: string;
    url: string;
    exists: boolean;
    source: string;
    // Rich profile data
    displayName?: string;
    bio?: string;
    profilePicUrl?: string;
    followers?: number;
    verified?: boolean;
    location?: string;
    website?: string;
    // Confidence scoring
    confidence?: number;
    confidenceBreakdown?: {
      nameMatch: number;
      locationMatch: number;
      headlineMatch: number;
      usernameMatch: number;
      photoAvailable: number;
      dataCompleteness: number;
    };
    confidenceReasoning?: string[];
    confidenceLabel?: string;
    // Username variation match metadata
    _variationMatch?: {
      originalQuery: string;
      matchedVariation: string;
      variationType: string;
      variationConfidence: number;
    };
  }>;
  email_registrations?: string[];
  duration_ms: number;
}

/**
 * Fast username search using multiple API endpoints in parallel
 * Calls APIs directly instead of CLI tools for 5-10x speed improvement
 * 
 * NEW: Searches for username variations to find related accounts
 */
export async function fastUsernameSearch(
  username: string,
  timeout: number = 20000,
  searchVariations: boolean = true
): Promise<FastOSINTResult> {
  const startTime = Date.now();
  const accounts: FastOSINTResult['accounts'] = [];

  console.log(`[FAST-OSINT] Starting parallel API search for "${username}"`);
  
  // Generate username variations
  const variations = searchVariations ? generateUsernameVariations(username) : [];
  
  if (variations.length > 0) {
    console.log(`[FAST-OSINT] Generated ${variations.length} username variations:`);
    variations.slice(0, 5).forEach(v => {
      console.log(`  - ${v.username} (${v.confidence}% - ${getVariationDescription(v.type)})`);
    });
  }
  
  // Search for original username
  const primaryResults = await searchAllPlatforms(username, timeout);
  primaryResults.forEach(r => accounts.push(r));

  // LinkedIn is indexed by real NAME, not by username. Once the primary scan has
  // discovered the subject's real name (GitHub/Instagram/YouTube usually carry it),
  // run a targeted LinkedIn-by-name search to surface profiles the username-only
  // probe cannot find (e.g. handle "kishansaaai" → "Sai Kishan A" on LinkedIn).
  const nameSource = primaryResults.find(
    r => r.exists && r.displayName && r.displayName.trim() &&
         r.displayName.trim().toLowerCase() !== username.toLowerCase() &&
         /\s/.test(r.displayName.trim()) // looks like a real "First Last" name
  );
  const derivedRealName = nameSource?.displayName?.trim();
  const alreadyHasLinkedIn = accounts.some(a => a.platform === 'linkedin' && a.exists);

  // Only spend an extra Google query if we have a real name AND the primary
  // LinkedIn check didn't already resolve a profile (conserves the 100/day quota).
  if (derivedRealName && !alreadyHasLinkedIn) {
    try {
      console.log(`[FAST-OSINT] Running LinkedIn-by-name search for "${derivedRealName}"`);
      const liByName = await searchLinkedInViaGoogle(username, derivedRealName);
      for (const p of liByName.profiles) {
        const dup = accounts.find(a => a.platform === 'linkedin' && a.url === p.profileUrl);
        if (!dup) {
          accounts.push({
            platform: 'linkedin',
            username: p.username,
            url: p.profileUrl,
            exists: true,
            source: 'google-linkedin-by-name',
            displayName: p.name,
            bio: p.headline || p.snippet || 'LinkedIn profile',
            profilePicUrl: undefined,
            followers: 0,
            verified: false,
          } as any);
        }
      }
      console.log(`[FAST-OSINT] LinkedIn-by-name added ${liByName.profiles.length} candidate profile(s)`);
    } catch (e) {
      console.error('[FAST-OSINT] LinkedIn by-name search failed:', e);
    }
  }
  
  // Search for top variations (limit to top 3 to avoid too many requests)
  if (searchVariations && variations.length > 1) {
    console.log(`[FAST-OSINT] Searching top 3 variations...`);
    
    const topVariations = variations.slice(1, 4); // Skip first (exact match) as it was already searched
    
    for (const variation of topVariations) {
      console.log(`[FAST-OSINT] Trying variation: "${variation.username}"`);
      const varResults = await searchAllPlatforms(variation.username, timeout, false); // skip LinkedIn (quota)
      
      // Mark these as variation matches
      varResults.forEach(r => {
        // Check if we already have this account (avoid duplicates)
        const duplicate = accounts.find(a => 
          a.platform === r.platform && a.url === r.url
        );
        
        if (!duplicate) {
          accounts.push({
            ...r,
            _variationMatch: {
              originalQuery: username,
              matchedVariation: variation.username,
              variationType: variation.type,
              variationConfidence: variation.confidence
            }
          });
        }
      });
    }
  }
  
  // Calculate confidence scores for all accounts
  const accountsWithConfidence = accounts
    .filter(a => a.exists)
    .map(account => {
      // Calculate confidence score based on profile completeness and name matching
      const score = calculateConfidenceScore(username, {
        name: account.displayName || account.username,
        headline: account.bio,
        location: account.location,
        username: account.username,
        photoUrl: account.profilePicUrl,
        currentPositions: []
      });
      
      // Adjust confidence if this was found via variation
      let adjustedScore = score.overall;
      if ((account as any)._variationMatch) {
        const varMatch = (account as any)._variationMatch;
        // Reduce confidence slightly for variation matches
        adjustedScore = Math.round(score.overall * (varMatch.variationConfidence / 100));
        score.reasoning.push(`⚠️ Found via variation: "${varMatch.matchedVariation}" (${getVariationDescription(varMatch.variationType)})`);
      }
      
      const confidenceData = getConfidenceLabel(adjustedScore);
      
      return {
        ...account,
        confidence: adjustedScore,
        confidenceBreakdown: score.breakdown,
        confidenceReasoning: score.reasoning,
        confidenceLabel: `${confidenceData.emoji} ${confidenceData.label} (${adjustedScore}%)`
      };
    });
  
  // Sort by confidence score (descending)
  const sortedAccounts = sortByConfidence(accountsWithConfidence);

  const duration = Date.now() - startTime;
  console.log(`[FAST-OSINT] Found ${sortedAccounts.length} accounts in ${duration}ms`);
  
  if (sortedAccounts.length > 0) {
    console.log(`[FAST-OSINT] Top 3 matches by confidence:`);
    sortedAccounts.slice(0, 3).forEach((acc, i) => {
      console.log(`  ${i + 1}. ${acc.platform}: ${acc.displayName || acc.username} (${acc.confidence}%)`);
    });
  }

  return {
    username,
    accounts_found: sortedAccounts.length,
    accounts: sortedAccounts,
    duration_ms: duration
  };
}

/**
 * Search all platforms for a given username
 */
async function searchAllPlatforms(
  username: string,
  timeout: number,
  includeLinkedIn: boolean = true
): Promise<Array<FastOSINTResult['accounts'][number]>> {
  
  // LinkedIn uses the Google Custom Search API (100 queries/day free tier). Only
  // run it for the PRIMARY username, never for each variation, to avoid burning
  // the daily quota (which returns 429 errors once exhausted).
  const linkedInCheck = includeLinkedIn
    ? checkLinkedIn(username, timeout)
    : Promise.resolve(null);

  // Run all API calls in parallel
  const results = await Promise.allSettled([
    checkGitHub(username, timeout),
    linkedInCheck,
    checkInstagram(username, timeout),
    checkThreads(username, timeout),
    checkLeetCode(username, timeout),
    checkFreelancer(username, timeout),
    checkTwitter(username, timeout),
    checkReddit(username, timeout),
    checkYouTube(username, timeout),
    checkTumblr(username, timeout),
    checkMedium(username, timeout),
    checkPinterest(username, timeout),
    checkVimeo(username, timeout),
    checkSoundCloud(username, timeout),
    checkFlickr(username, timeout),
    checkDeviantArt(username, timeout),
    checkBehance(username, timeout),
    checkDribbble(username, timeout),
    checkPatreon(username, timeout),
    checkTwitch(username, timeout),
    checkSteam(username, timeout),
    checkSpotify(username, timeout),
    checkLastfm(username, timeout),
    checkAboutMe(username, timeout),
  ]);

  // Collect successful results
  const accounts: Array<FastOSINTResult['accounts'][number]> = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value && typeof result.value.exists === 'boolean') {
      accounts.push(result.value as FastOSINTResult['accounts'][number]);
    }
  });
  
  return accounts;
}

/**
 * Fast email search - check if email is registered on major platforms
 */
export async function fastEmailSearch(
  email: string,
  timeout: number = 15000
): Promise<FastOSINTResult> {
  const startTime = Date.now();
  const registrations: string[] = [];

  console.log(`[FAST-OSINT] Checking email "${email}" on major platforms`);

  const results = await Promise.allSettled([
    checkEmailGitHub(email, timeout),
    checkEmailGravatar(email, timeout),
    checkEmailSpotify(email, timeout),
  ]);

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      registrations.push(result.value);
    }
  });

  const duration = Date.now() - startTime;

  return {
    email,
    accounts_found: 0,
    accounts: [],
    email_registrations: registrations,
    duration_ms: duration
  };
}

// ==================== USERNAME CHECK FUNCTIONS ====================

async function checkGitHub(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Use GitHub token from environment if available for higher rate limits
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }
    
    const response = await fetch(`https://api.github.com/users/${username}`, {
      signal: controller.signal,
      headers
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return {
        platform: 'github',
        username,
        url: `https://github.com/${username}`,
        exists: true,
        source: 'github-api',
        displayName: data.name || username,
        bio: data.bio || 'GitHub profile',
        profilePicUrl: data.avatar_url,
        followers: data.followers || 0,
        location: data.location,
        website: data.blog || data.html_url,
      };
    }
    
    return {
      platform: 'github',
      username,
      url: `https://github.com/${username}`,
      exists: false,
      source: 'github-api'
    };
  } catch (error) {
    console.error('[GITHUB] Check failed:', error);
    return null;
  }
}

async function checkInstagram(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Use the internal web profile API with a mobile User-Agent — the desktop UA
    // gets bounced to a login checkpoint, but the Instagram Android app UA is
    // still served the JSON response without a session cookie.
    const apiResponse = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Instagram 219.0.0.12.117 Android (28/9; 411dpi; 1080x2241; Xiaomi; Mi A2; jasmine_sprout; qcom; en_US; 302733750)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-IG-App-ID': '936619743392459',
          'X-ASBD-ID': '129477',
          'X-IG-WWW-Claim': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.instagram.com/',
          'Origin': 'https://www.instagram.com',
        },
      }
    );

    clearTimeout(timeoutId);

    if (apiResponse.status === 404) {
      return { platform: 'instagram', username, url: `https://www.instagram.com/${username}`, exists: false, source: 'instagram-api' };
    }

    if (apiResponse.ok) {
      const data = await apiResponse.json().catch(() => null);
      const user = data?.data?.user;
      if (user) {
        return {
          platform: 'instagram',
          username: user.username || username,
          url: `https://www.instagram.com/${username}`,
          exists: true,
          source: 'instagram-api',
          displayName: user.full_name || username,
          bio: user.biography || 'Instagram profile',
          profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url || undefined,
          followers: user.edge_followed_by?.count ?? 0,
          verified: user.is_verified ?? false,
        };
      }
    }

    // API blocked (checkpoint / 401 / 403) — fall back to HTML og:image scrape.
    // Instagram increasingly serves a login wall here, so og:image may be absent;
    // we still try to preserve any data we can get.
    const htmlController = new AbortController();
    const htmlTimeout = setTimeout(() => htmlController.abort(), Math.min(timeout, 5000));

    const response = await fetch(`https://www.instagram.com/${username}/`, {
      signal: htmlController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    clearTimeout(htmlTimeout);

    if (response.ok) {
      const html = await response.text();

      // Check if profile exists by looking for error indicators
      if (html.includes('Page Not Found') ||
          html.includes("Sorry, this page isn't available") ||
          html.includes('"is_private":true,"is_verified":false,"profile_pic_url":""')) {
        return {
          platform: 'instagram',
          username,
          url: `https://www.instagram.com/${username}`,
          exists: false,
          source: 'instagram-scrape'
        };
      }

      // Extract data from meta tags
      let displayName = username;
      let bio = 'Instagram profile';
      let profilePicUrl: string | undefined;
      let followers = 0;
      let verified = false;

      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (titleMatch) {
        displayName = titleMatch[1].replace(/ \(@[^)]+\).*/, '');
      }

      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (descMatch) {
        const desc = descMatch[1];
        const followersMatch = desc.match(/([0-9,]+)\s+Followers/);
        if (followersMatch) followers = parseInt(followersMatch[1].replace(/,/g, ''));
        const bioMatch = desc.match(/- (.+)$/);
        if (bioMatch) bio = bioMatch[1];
      }

      // og:image may be absent on a login wall — also try inline JSON
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/) ||
                         html.match(/"profile_pic_url_hd":"(https:[^"]+)"/) ||
                         html.match(/"profile_pic_url":"(https:[^"]+)"/);
      // og:image uses HTML-entity-escaped "&amp;" while inline JSON uses "\u0026" —
      // both must be decoded or the signed CDN query-string params get corrupted.
      if (imageMatch) profilePicUrl = imageMatch[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');

      if (html.includes('"is_verified":true') || html.includes('verified-badge')) verified = true;

      const uLower = username.toLowerCase();
      const titleHasHandle = !!titleMatch && titleMatch[1].toLowerCase().includes(`@${uLower}`);
      const hasFollowersText = !!descMatch && /followers/i.test(descMatch[1]);
      const hasRealPic = !!profilePicUrl;
      const exists = titleHasHandle || hasFollowersText || hasRealPic;

      if (!exists) {
        return { platform: 'instagram', username, url: `https://www.instagram.com/${username}`, exists: false, source: 'instagram-scrape' };
      }

      return {
        platform: 'instagram',
        username,
        url: `https://www.instagram.com/${username}`,
        exists: true,
        source: 'instagram-scrape',
        displayName,
        bio,
        profilePicUrl,
        followers,
        verified
      };
    }
    
    return {
      platform: 'instagram',
      username,
      url: `https://www.instagram.com/${username}`,
      exists: false,
      source: 'instagram-scrape'
    };
  } catch (error) {
    console.error('[INSTAGRAM] Scrape failed:', error);
    return null;
  }
}

/**
 * Validate a profile on a "soft-404" platform — sites that return HTTP 200 even
 * for non-existent users (the not-found state is rendered client-side).
 *
 * A bare 200 is NOT enough. We require a POSITIVE signal that the page actually
 * belongs to this user (username appears in <title>/og:title/og:url or an @handle
 * or /path reference) AND the absence of any generic "not found" marker. This
 * eliminates the false positives that plague simple `response.ok` checks.
 */
async function validateSoftProfile(
  platform: string,
  url: string,
  username: string,
  timeout: number,
  extraNotFoundMarkers: string[] = []
): Promise<{ platform: string; username: string; url: string; exists: boolean; source: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    const result = { platform, username, url, exists: false, source: `${platform}-web` };

    if (!response.ok) return result;

    const html = await response.text();
    const lower = html.toLowerCase();
    const u = username.toLowerCase();

    const genericNotFound = [
      'page not found', "isn't available", 'is not available', 'could not be found',
      "couldn't find", "doesn't exist", 'does not exist', 'no longer available',
      'nothing here', 'not found', 'sorry, this page', "user not found", 'no user',
      "page you're looking for", 'error 404'
    ];
    const hasNotFound = [...genericNotFound, ...extraNotFoundMarkers.map(m => m.toLowerCase())]
      .some(m => lower.includes(m));

    // Positive signals that the page belongs to this specific user
    const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').toLowerCase();
    const ogUrl = (html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').toLowerCase();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').toLowerCase();
    const mentionsUser =
      ogTitle.includes(u) || ogUrl.includes(u) || title.includes(u) ||
      lower.includes(`@${u}`) || lower.includes(`/${u}"`) || lower.includes(`/${u}/`);

    result.exists = !hasNotFound && mentionsUser;
    return result;
  } catch (error) {
    return null;
  }
}

async function checkThreads(username: string, timeout: number) {
  // The Threads web page is a JS-only shell with no server-side username, so it
  // cannot be verified from HTML. Threads accounts share Instagram's handle
  // namespace (you need an Instagram account to be on Threads), so we verify via
  // the Instagram profile: if the Instagram handle resolves to a real profile,
  // the Threads handle is valid.
  try {
    const ig = await checkInstagram(username, timeout);
    const exists = !!(ig && ig.exists);
    return {
      platform: 'threads',
      username,
      url: `https://www.threads.net/@${username}`,
      exists,
      source: 'threads-via-instagram',
      displayName: (ig as any)?.displayName,
      bio: exists ? 'Threads profile (Instagram-backed)' : undefined,
      profilePicUrl: (ig as any)?.profilePicUrl,
    };
  } catch (error) {
    return null;
  }
}

async function checkLeetCode(username: string, timeout: number) {
  // LeetCode blocks HTML scraping (403) but exposes a public GraphQL API.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const body = JSON.stringify({
      query: `query getUser($u: String!){ matchedUser(username: $u){ username profile{ realName userAvatar ranking aboutMe countryName } } }`,
      variables: { u: username }
    });

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Referer': 'https://leetcode.com'
      },
      body
    });

    clearTimeout(timeoutId);

    const notFound = { platform: 'leetcode', username, url: `https://leetcode.com/u/${username}`, exists: false, source: 'leetcode-graphql' };
    if (!response.ok) return notFound;

    const data = await response.json();
    const mu = data?.data?.matchedUser;
    if (!mu || !mu.username) return notFound;

    return {
      platform: 'leetcode',
      username,
      url: `https://leetcode.com/u/${username}`,
      exists: true,
      source: 'leetcode-graphql',
      displayName: mu.profile?.realName || username,
      bio: mu.profile?.aboutMe || 'LeetCode profile',
      profilePicUrl: mu.profile?.userAvatar || undefined,
      location: mu.profile?.countryName || undefined,
    };
  } catch (error) {
    return null;
  }
}

async function checkFreelancer(username: string, timeout: number) {
  // Freelancer exposes a clean public JSON API for username lookups.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(
      `https://www.freelancer.com/api/users/0.1/users?usernames%5B%5D=${encodeURIComponent(username)}`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }
    );

    clearTimeout(timeoutId);

    const notFound = { platform: 'freelancer', username, url: `https://www.freelancer.com/u/${username}`, exists: false, source: 'freelancer-api' };
    if (!response.ok) return notFound;

    const data = await response.json();
    const users = data?.result?.users || {};
    const keys = Object.keys(users);
    if (keys.length === 0) return notFound;

    const user = users[keys[0]];
    // Confirm the returned user actually matches the requested handle
    if (!user || (user.username || '').toLowerCase() !== username.toLowerCase()) return notFound;

    const city = user.location?.city;
    const country = user.location?.country?.name;
    const location = city || country ? [city, country].filter(Boolean).join(', ') : undefined;

    return {
      platform: 'freelancer',
      username,
      url: `https://www.freelancer.com/u/${username}`,
      exists: true,
      source: 'freelancer-api',
      displayName: user.public_name || user.display_name || username,
      bio: user.tagline || user.profile_description || 'Freelancer profile',
      location,
    };
  } catch (error) {
    return null;
  }
}

async function checkTwitter(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://twitter.com/${username}`, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    clearTimeout(timeoutId);
    
    // Twitter returns 200 even for non-existent users - must check body
    if (response.ok) {
      const text = await response.text();
      
      // Check for error indicators in response body
      const errorPatterns = [
        'This account doesn\'t exist',
        'Account suspended',
        'User not found',
        'Something went wrong',
        'Try searching for another'
      ];
      
      const hasError = errorPatterns.some(pattern => text.includes(pattern));
      
      // Also check if response is suspiciously small (error pages are usually small)
      const isTooSmall = text.length < 5000;
      
      if (hasError || isTooSmall) {
        return {
          platform: 'twitter',
          username,
          url: `https://twitter.com/${username}`,
          exists: false,
          source: 'twitter-scrape'
        };
      }
      
      // Extract profile data from meta tags
      let displayName = username;
      let bio = 'Twitter/X profile';
      let profilePicUrl: string | undefined;
      let followers = 0;
      let verified = false;
      
      // Extract from og:title
      const titleMatch = text.match(/<meta property="og:title" content="([^"]+)"/);
      if (titleMatch) {
        displayName = titleMatch[1].replace(/ \(@[^)]+\).*/, '');
      }
      
      // Extract from og:description (bio)
      const descMatch = text.match(/<meta property="og:description" content="([^"]+)"/);
      if (descMatch) {
        bio = descMatch[1];
      }
      
      // Extract profile picture
      const imageMatch = text.match(/<meta property="og:image" content="([^"]+)"/);
      if (imageMatch) {
        profilePicUrl = imageMatch[1];
      }
      
      // Check for verified badge
      if (text.includes('verified-badge') || text.includes('"verified":true')) {
        verified = true;
      }
      
      return {
        platform: 'twitter',
        username,
        url: `https://twitter.com/${username}`,
        exists: true,
        source: 'twitter-scrape',
        displayName,
        bio,
        profilePicUrl,
        followers,
        verified
      };
    }
    
    return {
      platform: 'twitter',
      username,
      url: `https://twitter.com/${username}`,
      exists: false,
      source: 'twitter-scrape'
    };
  } catch (error) {
    console.error('[TWITTER] Scrape failed:', error);
    return null;
  }
}

async function checkReddit(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      
      // Reddit API returns 200 with error in JSON for non-existent users
      if (data.error === 404 || data.error || !data.data || data.kind !== 't2') {
        return {
          platform: 'reddit',
          username,
          url: `https://www.reddit.com/user/${username}`,
          exists: false,
          source: 'reddit-api'
        };
      }
      
      const user = data.data;
      return {
        platform: 'reddit',
        username,
        url: `https://www.reddit.com/user/${username}`,
        exists: true,
        source: 'reddit-api',
        displayName: user.name || username,
        bio: user.subreddit?.public_description || 'Reddit user',
        profilePicUrl: user.icon_img?.replace(/&amp;/g, '&'),
        followers: user.subreddit?.subscribers || 0,
        verified: user.verified || false,
      };
    }
    
    return {
      platform: 'reddit',
      username,
      url: `https://www.reddit.com/user/${username}`,
      exists: false,
      source: 'reddit-api'
    };
  } catch (error) {
    return null;
  }
}


// Helper function to parse follower counts like "1.2K", "3.4M"
function parseFollowerCount(str: string): number {
  const match = str.match(/^([0-9.]+)([KMB]?)$/i);
  if (!match) return 0;
  
  const num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'K': return Math.round(num * 1000);
    case 'M': return Math.round(num * 1000000);
    case 'B': return Math.round(num * 1000000000);
    default: return Math.round(num);
  }
}

async function checkYouTube(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://www.youtube.com/@${username}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check if channel doesn't exist
      if (html.includes('"status":"ERROR"') || 
          html.includes('This page isn\'t available') ||
          html.length < 10000) {
        return {
          platform: 'youtube',
          username,
          url: `https://www.youtube.com/@${username}`,
          exists: false,
          source: 'youtube-scrape'
        };
      }
      
      // Extract channel data
      let displayName = username;
      let bio = 'YouTube channel';
      let profilePicUrl: string | undefined;
      let followers = 0; // YouTube calls them subscribers
      
      // Extract from meta tags
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (titleMatch) {
        displayName = titleMatch[1];
      }
      
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (descMatch) {
        bio = descMatch[1];
      }
      
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (imageMatch) {
        profilePicUrl = imageMatch[1];
      }
      
      // Extract subscriber count from page
      const subsMatch = html.match(/subscriberCountText"[^}]*"simpleText":"([^"]+)"/);
      if (subsMatch) {
        followers = parseFollowerCount(subsMatch[1].replace(' subscribers', ''));
      }
      
      return {
        platform: 'youtube',
        username,
        url: `https://www.youtube.com/@${username}`,
        exists: true,
        source: 'youtube-scrape',
        displayName,
        bio,
        profilePicUrl,
        followers
      };
    }
    
    return {
      platform: 'youtube',
      username,
      url: `https://www.youtube.com/@${username}`,
      exists: false,
      source: 'youtube-scrape'
    };
  } catch (error) {
    console.error('[YOUTUBE] Scrape failed:', error);
    return null;
  }
}

async function checkTumblr(username: string, timeout: number) {
  return validateSoftProfile(
    'tumblr',
    `https://${username}.tumblr.com/`,
    username,
    timeout,
    ['there\'s nothing here', 'not found']
  );
}

async function checkMedium(username: string, timeout: number) {
  return validateSoftProfile(
    'medium',
    `https://medium.com/@${username}`,
    username,
    timeout,
    ['out of nowhere', 'page not found']
  );
}

async function checkPinterest(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://www.pinterest.com/${username}/`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      
      // Pinterest returns 200 but shows error page for non-existent users
      const errorPatterns = [
        '"status_code":404',
        '"error_message"',
        'Sorry! We couldn\'t find that page',
        'Page not found',
        'This page is currently unavailable',
        '<title>Pinterest</title>', // Generic Pinterest homepage, not user profile
        'class="error"',
        'data-test-id="error-page"'
      ];
      
      const hasError = errorPatterns.some(pattern => html.includes(pattern));
      
      // POSITIVE-SIGNAL GATE: require data that belongs to THIS specific user.
      // The old `html.length > 50000` fallback matched Pinterest's generic pages,
      // causing every handle to "exist". Match the username in the profile JSON
      // or the canonical og:url instead.
      const uLower = username.toLowerCase();
      const htmlLower = html.toLowerCase();
      const ogUrl = (html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').toLowerCase();
      const hasUserData =
        htmlLower.includes(`"username":"${uLower}"`) ||
        htmlLower.includes(`"username": "${uLower}"`) ||
        ogUrl.includes(`/${uLower}/`) ||
        ogUrl.endsWith(`/${uLower}`);
      
      const exists = !hasError && hasUserData;
      
      console.log(`[PINTEREST] ${username}: status=${response.status}, size=${html.length}, hasError=${hasError}, hasUserData=${hasUserData}, exists=${exists}`);
      
      return {
        platform: 'pinterest',
        username,
        url: `https://www.pinterest.com/${username}`,
        exists,
        source: 'pinterest-web'
      };
    }
    
    return {
      platform: 'pinterest',
      username,
      url: `https://www.pinterest.com/${username}`,
      exists: false,
      source: 'pinterest-web'
    };
  } catch (error) {
    return null;
  }
}

async function checkVimeo(username: string, timeout: number) {
  return validateSoftProfile(
    'vimeo',
    `https://vimeo.com/${username}`,
    username,
    timeout
  );
}

async function checkSoundCloud(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://soundcloud.com/${username}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      
      // Extract profile data from HTML
      const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      
      return {
        platform: 'soundcloud',
        username,
        url: `https://soundcloud.com/${username}`,
        exists: true,
        source: 'soundcloud-web',
        displayName: nameMatch ? nameMatch[1] : username,
        bio: descMatch ? descMatch[1] : 'SoundCloud artist profile',
        profilePicUrl: imageMatch ? imageMatch[1] : undefined,
      };
    }
    
    return {
      platform: 'soundcloud',
      username,
      url: `https://soundcloud.com/${username}`,
      exists: false,
      source: 'soundcloud-web'
    };
  } catch (error) {
    return null;
  }
}

async function checkFlickr(username: string, timeout: number) {
  return validateSoftProfile(
    'flickr',
    `https://www.flickr.com/people/${username}`,
    username,
    timeout
  );
}

async function checkDeviantArt(username: string, timeout: number) {
  return validateSoftProfile(
    'deviantart',
    `https://www.deviantart.com/${username}`,
    username,
    timeout
  );
}

async function checkBehance(username: string, timeout: number) {
  return validateSoftProfile(
    'behance',
    `https://www.behance.net/${username}`,
    username,
    timeout
  );
}

async function checkDribbble(username: string, timeout: number) {
  return validateSoftProfile(
    'dribbble',
    `https://dribbble.com/${username}`,
    username,
    timeout
  );
}

async function checkPatreon(username: string, timeout: number) {
  return validateSoftProfile(
    'patreon',
    `https://www.patreon.com/${username}`,
    username,
    timeout
  );
}

async function checkTwitch(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://www.twitch.tv/${username}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    clearTimeout(timeoutId);
    
    // Twitch returns 200 for non-existent users - check body for errors
    if (response.ok) {
      const text = await response.text();
      
      const errorPatterns = [
        "Sorry. Unless you've got a time machine",
        "does not exist",
        "The page could not be found",
        "404 - Page Not Found",
        '"displayName":null',
        '"description":null',
        'content-unavailable-notice'
      ];
      
      const hasError = errorPatterns.some(pattern => text.includes(pattern));
      
      // Additional check: real channels have certain JSON data structures
      const hasChannelData = text.includes('"channelLogin"') || 
                            text.includes('"displayName":"') ||
                            text.includes('"broadcaster_name"');
      
      return {
        platform: 'twitch',
        username,
        url: `https://www.twitch.tv/${username}`,
        exists: !hasError && hasChannelData,
        source: 'twitch-web'
      };
    }
    
    return {
      platform: 'twitch',
      username,
      url: `https://www.twitch.tv/${username}`,
      exists: false,
      source: 'twitch-web'
    };
  } catch (error) {
    return null;
  }
}

async function checkSteam(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://steamcommunity.com/id/${username}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    clearTimeout(timeoutId);
    
    // Steam returns 200 even for non-existent profiles - check body
    if (response.ok) {
      const text = await response.text();
      
      const errorPatterns = [
        "The specified profile could not be found",
        "No match",
        "This user has not yet set up their Steam Community profile"
      ];
      
      const hasError = errorPatterns.some(pattern => text.includes(pattern));
      
      return {
        platform: 'steam',
        username,
        url: `https://steamcommunity.com/id/${username}`,
        exists: !hasError,
        source: 'steam-web'
      };
    }
    
    return {
      platform: 'steam',
      username,
      url: `https://steamcommunity.com/id/${username}`,
      exists: false,
      source: 'steam-web'
    };
  } catch (error) {
    return null;
  }
}

async function checkSpotify(username: string, timeout: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Try to get user profile via web scraping approach
    const response = await fetch(`https://open.spotify.com/user/${username}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      
      // Extract data from HTML meta tags
      const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      
      return {
        platform: 'spotify',
        username,
        url: `https://open.spotify.com/user/${username}`,
        exists: true,
        source: 'spotify-web',
        displayName: nameMatch ? nameMatch[1] : username,
        profilePicUrl: imageMatch ? imageMatch[1] : undefined,
        bio: 'Spotify user profile',
      };
    }
    
    return {
      platform: 'spotify',
      username,
      url: `https://open.spotify.com/user/${username}`,
      exists: false,
      source: 'spotify-web'
    };
  } catch (error) {
    return null;
  }
}

async function checkLastfm(username: string, timeout: number) {
  return validateSoftProfile(
    'lastfm',
    `https://www.last.fm/user/${username}`,
    username,
    timeout
  );
}

async function checkAboutMe(username: string, timeout: number) {
  return validateSoftProfile(
    'aboutme',
    `https://about.me/${username}`,
    username,
    timeout
  );
}

async function checkLinkedIn(username: string, timeout: number) {
  try {
    console.log(`[LINKEDIN] Starting profile search for: ${username}`);
    
    // METHOD 1: Try LinkedIn Authenticated Search first (most reliable)
    if (isLinkedInAuthConfigured()) {
      console.log('[LINKEDIN] Using authenticated session...');
      const authResults = await searchLinkedInAuthenticated(username, 10);
      
      if (authResults && authResults.profiles.length > 0) {
        console.log(`[LINKEDIN] ✅ Authenticated API found ${authResults.profiles.length} profiles`);
        
        const bestMatch = authResults.profiles[0]; // Already sorted by confidence
        const confidenceData = getConfidenceLabel(bestMatch.confidence || 0);
        
        return {
          platform: 'linkedin',
          username: bestMatch.publicIdentifier,
          url: bestMatch.profileUrl,
          exists: true,
          source: 'linkedin-authenticated-api',
          displayName: bestMatch.name,
          bio: bestMatch.headline || 'LinkedIn profile',
          profilePicUrl: bestMatch.photoUrl,
          followers: 0,
          verified: false,
          location: bestMatch.location,
          confidence: bestMatch.confidence,
          confidenceBreakdown: bestMatch.confidenceBreakdown,
          confidenceReasoning: bestMatch.confidenceReasoning,
          confidenceLabel: `${confidenceData.emoji} ${confidenceData.label} (${bestMatch.confidence}%)`,
          _linkedInData: {
            searchType: 'authenticated',
            totalMatches: authResults.totalFound,
            relatedProfiles: authResults.profiles.slice(0, 10).map(p => ({
              name: p.name,
              url: p.profileUrl,
              headline: p.headline,
              username: p.publicIdentifier,
              location: p.location,
              photoUrl: p.photoUrl,
              connectionDegree: p.connectionDegree,
              currentPositions: p.currentPositions,
              confidence: p.confidence,
              confidenceReasoning: p.confidenceReasoning
            })),
            connectionDegree: bestMatch.connectionDegree,
            currentPositions: bestMatch.currentPositions
          }
        };
      }
      
      console.log('[LINKEDIN] Authenticated search found no results, trying fallback methods...');
    }
    
    // METHOD 2: Try Google Custom Search API
    const googleResults = await searchLinkedInViaGoogle(username);
    
    if (googleResults && googleResults.profiles.length > 0) {
      console.log(`[LINKEDIN] ✅ Google found ${googleResults.profiles.length} related profiles`);
      
      const bestMatch = googleResults.profiles[0];
      
      return {
        platform: 'linkedin',
        username: bestMatch.username,
        url: bestMatch.profileUrl,
        exists: true,
        source: 'google-custom-search',
        displayName: bestMatch.name,
        bio: bestMatch.headline || bestMatch.snippet || 'LinkedIn profile',
        profilePicUrl: undefined,
        followers: 0,
        verified: false,
        location: undefined,
        _linkedInData: {
          searchType: 'related',
          totalMatches: googleResults.totalFound,
          relatedProfiles: googleResults.profiles.slice(0, 10).map(p => ({
            name: p.name,
            url: p.profileUrl,
            headline: p.headline,
            username: p.username
          }))
        }
      };
    }
    
    // METHOD 3: Fallback to multi-engine search
    const searchResults = await searchRelatedProfiles(username);
    
    if (!searchResults || searchResults.profiles.length === 0) {
      console.log(`[LINKEDIN] No profiles found for: ${username}`);
      return null;
    }
    
    console.log(`[LINKEDIN] ✅ Multi-engine found ${searchResults.profiles.length} related profiles`);
    console.log(`[LINKEDIN] Sources: ${searchResults.sources.join(', ')}`);
    
    const bestMatch = searchResults.profiles[0];
    
    return {
      platform: 'linkedin',
      username: bestMatch.name || username,
      url: bestMatch.profileUrl,
      exists: true,
      source: `related-search:${searchResults.sources.join('+')}`,
      displayName: bestMatch.name || username,
      bio: bestMatch.headline || bestMatch.about || 'LinkedIn profile',
      profilePicUrl: bestMatch.photoUrl,
      followers: 0,
      verified: bestMatch.verification === 'VERIFIED',
      location: bestMatch.location,
      _linkedInData: {
        searchType: 'related',
        totalMatches: searchResults.profiles.length,
        relatedProfiles: searchResults.profiles.slice(0, 5).map(p => ({
          name: p.name,
          url: p.profileUrl,
          headline: p.headline
        })),
        currentCompany: bestMatch.currentCompany,
        experiences: bestMatch.experiences,
        educations: bestMatch.educations,
        confidence: bestMatch.confidence,
        verification: bestMatch.verification,
        mergeMatrix: bestMatch.mergeMatrix
      }
    };
  } catch (error) {
    console.error('[LINKEDIN] Search error:', error);
    return null;
  }
}

// ==================== EMAIL CHECK FUNCTIONS ====================

export interface EmailIdentity {
  email: string;
  /** Usernames discovered as linked to this email (e.g. from GitHub commits). */
  usernames: string[];
  /** Best real name discovered for the email owner. */
  realName?: string;
  /** Accounts provably linked to the email, ready to show as primary results. */
  linkedAccounts: PlatformAccount[];
  /** Human-readable notes about what was found. */
  sources: string[];
}

/**
 * Resolve an email to a GitHub identity via the commit-search API.
 * GitHub exposes the author email on public commits, so `author-email:<email>`
 * reliably reveals the account's login + real name even when the profile hides
 * its email. This is the key email→username pivot (mirrors fingerprint.to).
 */
async function resolveEmailToGitHub(
  email: string,
  timeout: number
): Promise<{ username: string; realName?: string; profileUrl: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.cloak-preview+json',
      'User-Agent': 'socmint-osint'
    };
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;

    const response = await fetch(
      `https://api.github.com/search/commits?q=author-email:${encodeURIComponent(email)}&per_page=10`,
      { signal: controller.signal, headers }
    );

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) return null;

    // Pick the most frequent author login among the commits
    const loginCounts = new Map<string, number>();
    const nameByLogin = new Map<string, string>();
    for (const item of items) {
      const login = item?.author?.login;
      const name = item?.commit?.author?.name;
      if (login) {
        loginCounts.set(login, (loginCounts.get(login) || 0) + 1);
        if (name && !nameByLogin.has(login)) nameByLogin.set(login, name);
      }
    }
    if (loginCounts.size === 0) return null;

    const [topLogin] = [...loginCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      username: topLogin,
      realName: nameByLogin.get(topLogin),
      profileUrl: `https://github.com/${topLogin}`
    };
  } catch (error) {
    return null;
  }
}

async function checkEmailGitHub(email: string, timeout: number) {
  const gh = await resolveEmailToGitHub(email, timeout);
  return gh ? 'github' : null;
}

/**
 * Discover accounts LINKED to an email (not username variations).
 * Combines: GitHub commit-email pivot (username + real name), Gravatar profile.
 * Returns the discovered usernames + real name so the caller can pivot into a
 * full username investigation, plus any directly-confirmed linked accounts.
 */
export async function resolveEmailIdentity(
  email: string,
  timeout: number = 10000
): Promise<EmailIdentity> {
  const result: EmailIdentity = { email, usernames: [], realName: undefined, linkedAccounts: [], sources: [] };
  const capturedAt = new Date().toISOString();

  const [ghRes, gravRes] = await Promise.allSettled([
    resolveEmailToGitHub(email, timeout),
    (async () => {
      const crypto = await import('crypto');
      const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout);
      try {
        const r = await fetch(`https://www.gravatar.com/${hash}.json`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'socmint-osint' }
        });
        clearTimeout(t);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        clearTimeout(t);
        return null;
      }
    })()
  ]);

  // GitHub commit-email pivot — the strongest email→username signal
  if (ghRes.status === 'fulfilled' && ghRes.value) {
    const gh = ghRes.value;
    result.usernames.push(gh.username);
    if (gh.realName) result.realName = gh.realName;
    result.sources.push(`GitHub commit-email → @${gh.username}`);
    result.linkedAccounts.push({
      platform: 'github' as any,
      username: gh.username,
      profileUrl: gh.profileUrl,
      displayName: gh.realName || gh.username,
      bio: `Linked to ${email} via public commit metadata`,
      followers: 0,
      confidence: 'CONFIRMED',
      confidenceScore: 95,
      reason: `Email ${email} appears as commit author on GitHub for @${gh.username}`,
      capturedAt,
      deepfakeFlag: false,
      creationDate: capturedAt.slice(0, 10),
    });
  }

  // Gravatar profile — often carries the real name + linked social accounts
  if (gravRes.status === 'fulfilled' && gravRes.value) {
    const entry = gravRes.value?.entry?.[0];
    if (entry) {
      result.sources.push('Gravatar profile');
      if (!result.realName && entry.displayName) result.realName = entry.displayName;
      if (entry.preferredUsername && !result.usernames.includes(entry.preferredUsername)) {
        result.usernames.push(entry.preferredUsername);
      }
      // Gravatar exposes verified linked accounts
      if (Array.isArray(entry.accounts)) {
        for (const acc of entry.accounts) {
          if (!acc?.url || !acc?.shortname) continue;
          result.linkedAccounts.push({
            platform: (acc.shortname as string).toLowerCase() as any,
            username: acc.username || acc.display || acc.shortname,
            profileUrl: acc.url,
            displayName: entry.displayName || acc.display || acc.username,
            bio: `Verified on Gravatar profile for ${email}`,
            followers: 0,
            confidence: 'CONFIRMED',
            confidenceScore: 90,
            reason: `Linked account listed on Gravatar profile for ${email}`,
            capturedAt,
            deepfakeFlag: false,
            creationDate: capturedAt.slice(0, 10),
          });
        }
      }
    }
  }

  return result;
}

async function checkEmailGravatar(email: string, timeout: number) {
  try {
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`https://www.gravatar.com/${hash}.json`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return response.ok ? 'gravatar' : null;
  } catch (error) {
    return null;
  }
}

async function checkEmailSpotify(email: string, timeout: number) {
  // Spotify doesn't expose public email check
  return null;
}

/**
 * Convert fast OSINT results to PlatformAccount format
 */
/** Decode HTML entities (numeric, hex, and common named) that leak into scraped
 *  display names / bios, e.g. "SAI KISHAN A (&#064;user) &#x2022; ..." → "SAI KISHAN A (@user) • ..." */
export function decodeHtmlEntities(s?: string): string {
  if (!s) return s || "";
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; } })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Clean a scraped social display name: decode entities and drop boilerplate
 *  suffixes like " (@handle) • Instagram photos and videos". */
function cleanDisplayName(name?: string): string | undefined {
  if (!name) return name;
  let n = decodeHtmlEntities(name);
  n = n.replace(/\s*\(@[^)]*\)\s*[•·].*/i, "").trim();
  n = n.replace(/\s*[•·]\s*(Instagram|Threads|Twitter|X)\b.*/i, "").trim();
  return n || undefined;
}

export function convertToAccounts(result: FastOSINTResult, capturedAt: string): PlatformAccount[] {
  return result.accounts
    .filter(acc => acc.exists)
    .map(acc => {
      // Prefer the real 0-100 score already calculated in fastUsernameSearch().
      // Fall back to a categorical mapping only if that scoring step didn't run.
      let realScore = typeof acc.confidence === "number" ? acc.confidence : undefined;

      // Confidence FLOOR for accounts verified via official APIs on an EXACT
      // username match (not a variation). These provably exist with the exact
      // handle searched, so name-text scoring shouldn't demote them to "hidden".
      const reliableApiSources = [
        'github-api', 'leetcode-graphql', 'freelancer-api',
        'youtube-scrape', 'instagram-scrape', 'threads-via-instagram'
      ];
      const isReliable = reliableApiSources.includes((acc as any).source);
      const isExactMatch = !(acc as any)._variationMatch;
      if (isReliable && isExactMatch) {
        realScore = Math.max(realScore ?? 0, 85);
      }

      const confidenceTag: "CONFIRMED" | "PROBABLE" | "POSSIBLE" =
        realScore === undefined ? "CONFIRMED"
        : realScore >= 70 ? "CONFIRMED"
        : realScore >= 40 ? "PROBABLE"
        : "POSSIBLE";

      return {
        platform: acc.platform as any,
        username: acc.username,
        profileUrl: acc.url,
        displayName: cleanDisplayName(acc.displayName) || acc.username,
        bio: decodeHtmlEntities(acc.bio) || `Discovered via fast API probe (${acc.source})`,
        profilePicUrl: acc.profilePicUrl,
        followers: acc.followers || 0,
        confidence: confidenceTag,
        confidenceScore: realScore,
        confidenceReasoning: acc.confidenceReasoning,
        reason: `Direct API check with rich data - ${result.duration_ms}ms scan`,
        capturedAt,
        deepfakeFlag: false,
        creationDate: new Date().toISOString().slice(0, 10),
      };
    });
}
