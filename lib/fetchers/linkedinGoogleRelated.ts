/**
 * LinkedIn Related Profile Search via Google Custom Search API
 * Searches for LinkedIn profiles with similar names
 */

export interface LinkedInRelatedProfile {
  name: string;
  headline?: string;
  profileUrl: string;
  snippet?: string;
  username: string;
}

export interface GoogleLinkedInSearchResults {
  query: string;
  profiles: LinkedInRelatedProfile[];
  totalFound: number;
  source: 'Google Custom Search API' | 'SerpApi';
}

/** Normalized shape both Google CSE and SerpApi results get mapped into. */
interface SearchResultItem {
  title?: string;
  link?: string;
  snippet?: string;
}

/** Collect all configured Google Custom Search API keys (primary + fallbacks). */
function getGoogleApiKeys(): string[] {
  return [
    process.env.GOOGLE_SEARCH_API_KEY,
    process.env.GOOGLE_SEARCH_API_KEY_2,
    process.env.GOOGLE_SEARCH_API_KEY_3,
  ].filter((k): k is string => !!k && k.trim().length > 0);
}

/**
 * Run a single Google Custom Search query, rotating through available API keys
 * when one hits its daily quota (HTTP 429). This keeps LinkedIn discovery alive
 * after the primary key is exhausted, provided a fallback key is configured.
 */
async function runGoogleQuery(
  apiKeys: string[],
  searchEngineId: string,
  searchQuery: string
): Promise<SearchResultItem[]> {
  for (let i = 0; i < apiKeys.length; i++) {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKeys[i]}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`;
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.warn(`[GOOGLE LINKEDIN] Key #${i + 1} quota exhausted (429); trying next key…`);
        continue; // rotate to the next key
      }
      if (!response.ok) {
        const error = await response.text();
        console.error(`[GOOGLE LINKEDIN] API Error for "${searchQuery}":`, error.slice(0, 200));
        continue; // try next key rather than giving up outright (e.g. a dead/misconfigured key)
      }
      const data = await response.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      console.error(`[GOOGLE LINKEDIN] Query failed "${searchQuery}":`, err);
      continue;
    }
  }
  console.warn(`[GOOGLE LINKEDIN] All ${apiKeys.length} Google API key(s) exhausted/failed for "${searchQuery}".`);
  return [];
}

/**
 * Run the same query through SerpApi (a paid Google-results proxy with a free
 * tier of ~100 searches/month). Used only as a last-resort fallback once every
 * configured Google Custom Search key has been exhausted or is unusable.
 * Requires SERPAPI_KEY in .env.local — get one at https://serpapi.com/manage-api-key
 */
async function runSerpApiQuery(searchQuery: string): Promise<SearchResultItem[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const url = `https://serpapi.com/search?engine=google&api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&num=10`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      console.error(`[SERPAPI LINKEDIN] API error for "${searchQuery}":`, error.slice(0, 200));
      return [];
    }
    const data = await response.json();
    if (data.error) {
      console.error(`[SERPAPI LINKEDIN] Error for "${searchQuery}":`, data.error);
      return [];
    }
    const items = Array.isArray(data.organic_results) ? data.organic_results : [];
    // Normalize SerpApi's field names (link/snippet already match; keep as-is)
    return items.map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }));
  } catch (err) {
    console.error(`[SERPAPI LINKEDIN] Query failed "${searchQuery}":`, err);
    return [];
  }
}

/**
 * Search for related LinkedIn profiles using Google Custom Search API.
 *
 * A username like "kishansaaai" rarely appears verbatim in LinkedIn page text,
 * so we run several complementary strategies and merge/dedupe the results:
 *   1. Real-name + context search (most reliable — narrows a common name down
 *      to the right person using a college/company/username hint)
 *   2. Real-name only search
 *   3. Direct slug match: profiles whose URL contains the exact handle
 *   4. Unquoted token search (broad name/handle match)
 *
 * @param query      The original search query (username or bare name).
 * @param realName   The subject's real name, if known — the strongest LinkedIn signal.
 * @param extraContext Optional disambiguating hint (college, company, username, city)
 *   appended to the name query. Common real names return many LinkedIn profiles;
 *   this narrows results to the actual subject, e.g. "Sai Kishan A" + "TRR Engineering
 *   College" instead of every "Sai Kishan" on LinkedIn.
 */
export async function searchLinkedInViaGoogle(
  query: string,
  realName?: string,
  extraContext?: string
): Promise<GoogleLinkedInSearchResults> {
  const apiKeys = getGoogleApiKeys();
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const hasSerpApi = !!process.env.SERPAPI_KEY;

  if ((apiKeys.length === 0 || !searchEngineId) && !hasSerpApi) {
    console.log('[GOOGLE LINKEDIN] No search backend configured (Google CSE or SerpApi)');
    return { query, profiles: [], totalFound: 0, source: 'Google Custom Search API' };
  }

  console.log(`[GOOGLE LINKEDIN] Searching for: "${query}"${realName ? ` (name: "${realName}")` : ''}${extraContext ? ` (context: "${extraContext}")` : ''}`);

  // Ordered strategies, tried SEQUENTIALLY with early-exit to conserve quota.
  // We stop as soon as one strategy returns results instead of always firing
  // every query.
  const strategies: string[] = [];
  // NOTE: intentionally NOT gated on `realName !== query` — for direct name
  // searches (type === "name") the caller passes the same value for both, and
  // the precise quoted-name (+context) strategy must still run first. For the
  // username-derived-name call site (fastOSINT.ts), realName naturally differs
  // from the username being searched, so this still adds it as an extra strategy.
  const hasRealName = !!(realName && realName.trim());
  if (hasRealName && extraContext && extraContext.trim()) {
    // Name + disambiguating context is the most precise signal — try it first.
    strategies.push(`site:linkedin.com/in "${realName!.trim()}" "${extraContext.trim()}"`);
  }
  if (hasRealName) {
    // Real name is the most reliable LinkedIn signal — try it before raw slug guesses.
    strategies.push(`site:linkedin.com/in "${realName!.trim()}"`);
  }
  strategies.push(`site:linkedin.com/in/${query}`); // exact slug in URL path
  strategies.push(`site:linkedin.com/in ${query}`); // broad token match

  try {
    let items: SearchResultItem[] = [];
    let source: GoogleLinkedInSearchResults['source'] = 'Google Custom Search API';

    // Tier 1: Google Custom Search (all configured keys)
    if (apiKeys.length > 0 && searchEngineId) {
      for (const q of strategies) {
        items = await runGoogleQuery(apiKeys, searchEngineId, q);
        if (items.length > 0) break; // early exit — saves quota
      }
    }

    // Tier 2: SerpApi fallback — only fires if Google found nothing (quota
    // exhausted, all keys dead, etc). Conserves the small monthly free tier.
    if (items.length === 0 && hasSerpApi) {
      console.log('[GOOGLE LINKEDIN] Google CSE exhausted/unavailable — falling back to SerpApi');
      for (const q of strategies) {
        items = await runSerpApiQuery(q);
        if (items.length > 0) { source = 'SerpApi'; break; }
      }
    }

    if (items.length === 0) {
      console.log('[GOOGLE LINKEDIN] No results found across all strategies/backends');
      return { query, profiles: [], totalFound: 0, source };
    }

    // Extract + dedupe profiles by username slug
    const byUsername = new Map<string, LinkedInRelatedProfile>();
    for (const item of items) {
      if (!item.link || !/linkedin\.com\/in\//i.test(item.link)) continue;
      const usernameMatch = item.link.match(/linkedin\.com\/in\/([^\/\?#]+)/i);
      const username = usernameMatch ? decodeURIComponent(usernameMatch[1]) : '';
      if (!username) continue;
      if (byUsername.has(username)) continue;

      const name = (item.title || '').replace(/\s*[-|]\s*LinkedIn.*$/i, '').trim();
      const snippet = item.snippet || '';

      byUsername.set(username, {
        name: name || username,
        headline: snippet,
        profileUrl: `https://www.linkedin.com/in/${username}`,
        snippet,
        username
      });
    }

    const profiles = Array.from(byUsername.values());
    console.log(`[GOOGLE LINKEDIN] Found ${profiles.length} unique profiles via ${source}`);

    return {
      query,
      profiles,
      totalFound: profiles.length,
      source
    };

  } catch (error) {
    console.error('[GOOGLE LINKEDIN] Error:', error);
    return { query, profiles: [], totalFound: 0, source: 'Google Custom Search API' };
  }
}
