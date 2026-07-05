/**
 * Direct Sherlock API Integration
 * Uses Sherlock's JSON data file which contains 400+ platform APIs
 * Source: https://github.com/sherlock-project/sherlock/blob/master/sherlock/resources/data.json
 */

interface SherlockSite {
  errorType: string;
  errorMsg?: string | string[];
  errorUrl?: string;
  errorCode?: number | number[];
  url: string;
  urlMain: string;
  username_claimed?: string;
  username_unclaimed?: string;
  regexCheck?: string;
  request_method?: string;
  request_payload?: any;
  headers?: Record<string, string>;
}

/**
 * Check username across platforms using Sherlock's proven API endpoints
 */
/**
 * Check a single Sherlock site for a username using Sherlock's error-detection
 * rules. Returns null on network error, otherwise an existence result.
 */
async function checkSherlockSite(
  site: SherlockSite,
  platform: string,
  username: string,
  timeout: number
): Promise<{ platform: string; url: string; exists: boolean; response_time: number } | null> {
  const profileUrl = site.url.replace('{}', username);

  // Sherlock's regexCheck: if the username can't match the site's allowed
  // pattern, the account cannot exist. Skip to avoid false positives.
  if (site.regexCheck) {
    try {
      if (!new RegExp(site.regexCheck).test(username)) {
        return { platform, url: profileUrl, exists: false, response_time: 0 };
      }
    } catch {
      // Invalid regex in data — ignore and continue
    }
  }

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // For response_url sites, Sherlock disables redirects: an existing
    // account returns 2xx, a missing one 3xx-redirects to an error page.
    const followRedirect = site.errorType !== 'response_url';

    const checkResponse = await fetch(profileUrl, {
      method: site.request_method || 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(site.headers || {})
      },
      redirect: followRedirect ? 'follow' : 'manual'
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const status = checkResponse.status;
    const is2xx = status >= 200 && status < 300;

    let exists = false;

    if (site.errorType === 'status_code') {
      const errorCodes = Array.isArray(site.errorCode)
        ? site.errorCode
        : site.errorCode != null
        ? [site.errorCode]
        : [];
      exists = is2xx && !errorCodes.includes(status);
    } else if (site.errorType === 'message') {
      if (!is2xx) {
        exists = false;
      } else {
        const text = await checkResponse.text();
        const errorMsgs = Array.isArray(site.errorMsg)
          ? site.errorMsg
          : site.errorMsg
          ? [site.errorMsg]
          : [];
        exists = errorMsgs.length === 0 ? is2xx : !errorMsgs.some((msg) => text.includes(msg));
      }
    } else if (site.errorType === 'response_url') {
      exists = is2xx;
    } else {
      exists = is2xx;
    }

    return { platform, url: profileUrl, exists, response_time: responseTime };
  } catch (error) {
    return null;
  }
}

export async function checkUsernameWithSherlockData(
  username: string,
  timeout: number = 10000
): Promise<Array<{ platform: string; url: string; exists: boolean; response_time: number }>> {
  
  // Try multiple CDN sources for Sherlock's data.json
  const dataUrls = [
    'https://cdn.jsdelivr.net/gh/sherlock-project/sherlock@master/sherlock_project/resources/data.json',
    'https://raw.githubusercontent.com/sherlock-project/sherlock/master/sherlock_project/resources/data.json',
    'https://cdn.statically.io/gh/sherlock-project/sherlock/master/sherlock_project/resources/data.json'
  ];
  
  let sitesData: Record<string, SherlockSite> | null = null;
  
  try {
    console.log('[SHERLOCK-API] Fetching platform list from Sherlock repository...');
    
    // Try each URL until one works
    for (const dataUrl of dataUrls) {
      try {
        const response = await fetch(dataUrl, {
          signal: AbortSignal.timeout(10000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          sitesData = await response.json();
          console.log(`[SHERLOCK-API] Successfully fetched data from ${dataUrl}`);
          break;
        } else {
          console.warn(`[SHERLOCK-API] Failed to fetch from ${dataUrl}: ${response.status}`);
        }
      } catch (err) {
        console.warn(`[SHERLOCK-API] Error fetching from ${dataUrl}:`, err);
      }
    }
    
    if (!sitesData) {
      console.error('[SHERLOCK-API] Failed to fetch Sherlock data from all sources');
      return [];
    }
    const platforms = Object.keys(sitesData);
    
    console.log(`[SHERLOCK-API] Found ${platforms.length} platforms in Sherlock database`);
    
    // Check platforms in parallel (limit to 50 at a time to avoid overwhelming)
    const results: Array<{ platform: string; url: string; exists: boolean; response_time: number }> = [];
    const priorityPlatforms = [
      'GitHub', 'Instagram', 'Twitter', 'Reddit', 'Facebook', 'LinkedIn', 
      'YouTube', 'TikTok', 'Snapchat', 'Pinterest', 'Tumblr', 'Medium',
      'Twitch', 'Steam', 'Spotify', 'SoundCloud', 'DeviantArt', 'Behance',
      'Dribbble', 'Patreon', 'Flickr', 'Vimeo', 'Threads'
    ];
    
    // Check priority platforms first
    const platformsToCheck = [
      ...priorityPlatforms.filter(p => sitesData && sitesData[p]),
      ...platforms.filter(p => !priorityPlatforms.includes(p))
    ].slice(0, 100); // Check top 100 platforms
    
    const checks = platformsToCheck.map((platform) => {
      const site = sitesData && sitesData[platform];
      if (!site) return Promise.resolve(null);
      return checkSherlockSite(site, platform, username, timeout);
    });
    
    const settled = await Promise.allSettled(checks);
    
    settled.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });

    // ── FALSE-POSITIVE FILTER (control-username validation) ──────────────────
    // Many sites are single-page apps or soft-404s: they return HTTP 200 for
    // ANY username (the "not found" state is rendered client-side, so our
    // server-side check can't see it). To catch these, re-check every candidate
    // site with a random username that cannot possibly exist. If the site also
    // reports that random handle as "existing", the site is unreliable and we
    // discard its result.
    const candidates = results.filter(r => r.exists);
    if (candidates.length > 0) {
      const controlUsername = `zqxk${Date.now().toString(36)}wvnp7`; // random, ~15 chars, unlikely to exist
      console.log(`[SHERLOCK-API] Validating ${candidates.length} candidates against control "${controlUsername}"...`);

      const controlChecks = candidates.map((cand) => {
        const site = sitesData && sitesData[cand.platform];
        if (!site) return Promise.resolve(null);
        return checkSherlockSite(site, cand.platform, controlUsername, timeout);
      });
      const controlSettled = await Promise.allSettled(controlChecks);

      const unreliable = new Set<string>();
      controlSettled.forEach((res) => {
        if (res.status === 'fulfilled' && res.value && res.value.exists) {
          // Control handle "exists" too → site is a soft-404 / false-positive source
          unreliable.add(res.value.platform);
        }
      });

      if (unreliable.size > 0) {
        console.log(`[SHERLOCK-API] Filtered ${unreliable.size} false-positive sites: ${Array.from(unreliable).join(', ')}`);
      }

      // Demote unreliable sites to not-found
      for (const r of results) {
        if (r.exists && unreliable.has(r.platform)) {
          r.exists = false;
        }
      }
    }
    
    const found = results.filter(r => r.exists).length;
    console.log(`[SHERLOCK-API] Checked ${results.length} platforms, found ${found} verified accounts (after false-positive filter)`);
    
    return results;
    
  } catch (error) {
    console.error('[SHERLOCK-API] Error:', error);
    return [];
  }
}

/**
 * Get only platforms where username exists
 */
export async function findUsernamePlatforms(
  username: string,
  timeout: number = 10000
): Promise<Array<{ platform: string; url: string }>> {
  const results = await checkUsernameWithSherlockData(username, timeout);
  return results
    .filter(r => r.exists)
    .map(r => ({ platform: r.platform, url: r.url }));
}
