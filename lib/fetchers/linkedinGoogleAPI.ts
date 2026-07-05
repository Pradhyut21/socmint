/**
 * LinkedIn Profile Discovery via Google Custom Search API
 * Uses Google's official API - no rate limiting issues!
 * Requires: GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID
 */

export interface LinkedInSearchResult {
  exists: boolean;
  url?: string;
  name?: string;
  headline?: string;
  description?: string;
  location?: string;
  source: string;
}

/**
 * Search for LinkedIn profile using Google Custom Search API
 * Free tier: 100 queries/day
 */
export async function searchLinkedInViaGoogleAPI(
  username: string
): Promise<LinkedInSearchResult | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    console.log('[LINKEDIN_GOOGLE_API] API credentials not configured');
    return null;
  }
  
  try {
    // Build API URL
    const query = `site:linkedin.com/in/${username}`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
    
    console.log(`[LINKEDIN_GOOGLE_API] Searching for: ${username}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`[LINKEDIN_GOOGLE_API] API returned status ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if we got results
    if (!data.items || data.items.length === 0) {
      console.log(`[LINKEDIN_GOOGLE_API] No profile found for ${username}`);
      return {
        exists: false,
        source: 'google-custom-search-api'
      };
    }
    
    // Get first result
    const firstResult = data.items[0];
    const metatags = firstResult.pagemap?.metatags?.[0] || {};
    
    // Extract data from metatags (rich profile data from LinkedIn's OpenGraph tags)
    const firstName = metatags['profile:first_name'];
    const lastName = metatags['profile:last_name'];
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : undefined;
    
    // Extract from og:title as fallback (format: "Name - Headline | LinkedIn")
    const rawTitle = metatags['og:title'] || firstResult.title || '';
    const cleanedTitle = rawTitle.replace(/\| LinkedIn/gi, '').trim();
    const titleParts = cleanedTitle.split(' - ');
    
    const nameFromTitle = titleParts[0]?.trim();
    const headlineFromTitle = titleParts.slice(1).join(' - ').trim();
    
    // Get description
    const description = metatags['og:description'] || firstResult.snippet;
    
    // Get location
    const location = metatags['locale'] || undefined;
    
    // Clean URL
    const profileUrl = firstResult.formattedUrl || firstResult.link;
    
    const result = {
      exists: true,
      url: profileUrl,
      name: fullName || nameFromTitle || username,
      headline: headlineFromTitle,
      description: description,
      location: location,
      source: 'google-custom-search-api'
    };
    
    console.log(`[LINKEDIN_GOOGLE_API] ✅ Found profile: ${result.name}`);
    
    return result;
    
  } catch (error) {
    console.error('[LINKEDIN_GOOGLE_API] Error:', error);
    return null;
  }
}

/**
 * Search for LinkedIn profile by name (useful when you don't have username)
 */
export async function searchLinkedInByName(
  fullName: string,
  additionalContext?: string
): Promise<LinkedInSearchResult | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    return null;
  }
  
  try {
    let query = `"${fullName}" site:linkedin.com/in/`;
    if (additionalContext) {
      query += ` "${additionalContext}"`;
    }
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
    
    console.log(`[LINKEDIN_GOOGLE_API] Searching by name: ${fullName}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        exists: false,
        source: 'google-custom-search-api-by-name'
      };
    }
    
    const firstResult = data.items[0];
    const metatags = firstResult.pagemap?.metatags?.[0] || {};
    
    return {
      exists: true,
      url: firstResult.formattedUrl || firstResult.link,
      name: fullName,
      headline: metatags['og:title']?.split(' - ').slice(1).join(' - ').replace(/\| LinkedIn/gi, '').trim(),
      description: metatags['og:description'] || firstResult.snippet,
      source: 'google-custom-search-api-by-name'
    };
    
  } catch (error) {
    console.error('[LINKEDIN_GOOGLE_API] Error searching by name:', error);
    return null;
  }
}

/**
 * Check if Google Custom Search API is configured
 */
export function isGoogleSearchConfigured(): boolean {
  return !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
}
