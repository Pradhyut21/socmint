/**
 * LinkedIn Multi-Engine Scraper Pipeline
 * Uses Bing, DuckDuckGo, Yahoo + Wayback Machine to extract LinkedIn profiles
 * NO LinkedIn authentication needed!
 * NO Google API needed!
 */

export interface LinkedInProfile {
  name?: string;
  headline?: string;
  location?: string;
  about?: string;
  photoUrl?: string;
  currentCompany?: string;
  experiences?: Array<{
    title?: string;
    company?: string;
    duration?: string;
  }>;
  educations?: Array<{
    school?: string;
    degree?: string;
  }>;
  profileUrl: string;
  sources: string[];
  confidence: number;
  verification: 'VERIFIED' | 'UNVERIFIED';
  mergeMatrix?: Record<string, string[]>;
}

export interface LinkedInSearchResults {
  query: string;
  profiles: LinkedInProfile[];
  totalFound: number;
  sources: string[];
  searchType: 'exact' | 'related';
}

interface SearchResult {
  title?: string;
  snippet?: string;
  url?: string;
  name?: string;
  headline?: string;
  location?: string;
  company?: string;
  username?: string; // LinkedIn username extracted from URL
}

/**
 * 1. Query Bing for LinkedIn profile
 * Searches for both exact username AND related profiles with similar names
 */
async function queryBing(username: string): Promise<SearchResult | null> {
  try {
    // Search for the name on LinkedIn (not just exact username)
    // This finds related profiles with similar names
    const query = encodeURIComponent(`site:linkedin.com/in "${username}"`);
    const url = `https://www.bing.com/search?q=${query}`;
    
    console.log('[BING] Searching for related profiles:', username);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`[BING] Error: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Find result blocks (b_algo class) - use [\s\S] instead of . with /s flag for compatibility
    const resultMatch = html.match(/<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/);
    if (!resultMatch) {
      console.log('[BING] No results found');
      return null;
    }
    
    const result = resultMatch[1];
    
    // Extract title from <h2><a>
    const titleMatch = result.match(/<h2><a[^>]*>([^<]+)<\/a><\/h2>/);
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*LinkedIn.*$/i, '').trim() : undefined;
    
    // Extract snippet/caption
    const captionMatch = result.match(/<div class="b_caption"[^>]*><p>([\s\S]*?)<\/p>/);
    const snippet = captionMatch ? captionMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
    
    // Extract URL - look for linkedin.com/in/ pattern
    const urlMatch = result.match(/<a href="(https:\/\/[^"]*linkedin\.com\/in\/[^"\/]+)/);
    const profileUrl = urlMatch ? urlMatch[1] : undefined;
    
    // Extract username from URL
    let extractedUsername = username;
    if (profileUrl) {
      const usernameMatch = profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
      if (usernameMatch) {
        extractedUsername = usernameMatch[1];
      }
    }
    
    // Parse name and headline from title (format: "Name - Headline")
    const titleParts = title?.split(' - ') || [];
    const name = titleParts[0]?.trim();
    const headline = titleParts.slice(1).join(' - ').trim();
    
    // Parse location and company from snippet
    let location, company;
    if (snippet) {
      const locationMatch = snippet.match(/location[:\s]+([^•|]+)/i);
      location = locationMatch ? locationMatch[1].trim() : undefined;
      
      const companyMatch = snippet.match(/works?\s+at\s+([^•|]+)/i);
      company = companyMatch ? companyMatch[1].trim() : undefined;
    }
    
    console.log('[BING] Found:', name);
    
    return {
      title,
      snippet,
      url: profileUrl,
      name,
      headline,
      location,
      company,
      username: extractedUsername
    };
  } catch (error) {
    console.error('[BING] Error:', error);
    return null;
  }
}

/**
 * 2. Query DuckDuckGo for LinkedIn profile
 * Searches for related profiles with similar names
 */
async function queryDDG(username: string): Promise<SearchResult | null> {
  try {
    const query = encodeURIComponent(`site:linkedin.com/in "${username}"`);
    const url = `https://html.duckduckgo.com/html/?q=${query}`;
    
    console.log('[DDG] Searching for related profiles:', username);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: `q=${query}&b=`
    });
    
    if (!response.ok) {
      console.log(`[DDG] Error: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Find result blocks - use [\s\S] instead of . with /s flag
    const resultMatch = html.match(/<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="clear">/);
    if (!resultMatch) {
      console.log('[DDG] No results found');
      return null;
    }
    
    const result = resultMatch[1];
    
    // Extract title
    const titleMatch = result.match(/<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/);
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*LinkedIn.*$/i, '').trim() : undefined;
    
    // Extract snippet
    const snippetMatch = result.match(/<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/);
    const snippet = snippetMatch ? snippetMatch[1].trim() : undefined;
    
    // Extract URL
    const urlMatch = result.match(/<a[^>]*class="result__url"[^>]*href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/);
    const profileUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : undefined;
    
    // Parse name and headline
    const titleParts = title?.split(' - ') || [];
    const name = titleParts[0]?.trim();
    const headline = titleParts.slice(1).join(' - ').trim();
    
    console.log('[DDG] Found:', name);
    
    return {
      title,
      snippet,
      url: profileUrl,
      name,
      headline
    };
  } catch (error) {
    console.error('[DDG] Error:', error);
    return null;
  }
}

/**
 * 3. Query Yahoo for LinkedIn profile
 * Searches for related profiles with similar names
 */
async function queryYahoo(username: string): Promise<SearchResult | null> {
  try {
    const query = encodeURIComponent(`site:linkedin.com/in "${username}"`);
    const url = `https://search.yahoo.com/search?p=${query}`;
    
    console.log('[YAHOO] Searching for related profiles:', username);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`[YAHOO] Error: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Find result blocks (algo class) - use [\s\S] instead of . with /s flag
    const resultMatch = html.match(/<div[^>]*class="[^"]*algo[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!resultMatch) {
      console.log('[YAHOO] No results found');
      return null;
    }
    
    const result = resultMatch[1];
    
    // Extract title
    const titleMatch = result.match(/<h3[^>]*><a[^>]*>([^<]+)<\/a><\/h3>/);
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*LinkedIn.*$/i, '').trim() : undefined;
    
    // Extract snippet
    const snippetMatch = result.match(/<p[^>]*class="[^"]*compText[^"]*"[^>]*>([^<]+)<\/p>/);
    const snippet = snippetMatch ? snippetMatch[1].trim() : undefined;
    
    // Extract URL
    const urlMatch = result.match(/<a[^>]*href="(https:\/\/[^"]*linkedin\.com\/in\/[^"]+)"/);
    const profileUrl = urlMatch ? urlMatch[1] : undefined;
    
    // Parse name and headline
    const titleParts = title?.split(' - ') || [];
    const name = titleParts[0]?.trim();
    const headline = titleParts.slice(1).join(' - ').trim();
    
    console.log('[YAHOO] Found:', name);
    
    return {
      title,
      snippet,
      url: profileUrl,
      name,
      headline
    };
  } catch (error) {
    console.error('[YAHOO] Error:', error);
    return null;
  }
}

/**
 * 4. Query Wayback Machine CDX for archived LinkedIn profile
 */
async function queryWaybackCDX(username: string): Promise<string | null> {
  try {
    const profileUrl = `https://www.linkedin.com/in/${username}/`;
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(profileUrl)}&output=json&limit=3&filter=statuscode:200&filter=mimetype:text/html`;
    
    console.log('[WAYBACK] Searching CDX:', username);
    
    const response = await fetch(cdxUrl);
    
    if (!response.ok) {
      console.log(`[WAYBACK] CDX Error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length < 2) {
      console.log('[WAYBACK] No snapshots found');
      return null;
    }
    
    // Skip header row, get most recent snapshot
    const snapshots = data.slice(1);
    
    for (const snapshot of snapshots.reverse()) {
      const [urlkey, timestamp, original, mimetype, statuscode] = snapshot;
      
      if (statuscode === '200' && mimetype === 'text/html') {
        // Build raw snapshot URL
        const snapshotUrl = `https://web.archive.org/web/${timestamp}id_/${original}`;
        console.log('[WAYBACK] Found snapshot:', timestamp);
        return snapshotUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[WAYBACK] Error:', error);
    return null;
  }
}

/**
 * 5. Parse archived HTML for structured data
 */
async function parseArchivedHtml(snapshotUrl: string): Promise<Partial<LinkedInProfile> | null> {
  try {
    console.log('[WAYBACK] Fetching archived HTML...');
    
    const response = await fetch(snapshotUrl);
    
    if (!response.ok) {
      console.log(`[WAYBACK] Fetch error: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    const result: Partial<LinkedInProfile> = {};
    
    // Try JSON-LD Schema parsing - use [\s\S] instead of . with /gs flags
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        
        if (jsonData['@type'] === 'Person') {
          result.name = jsonData.name;
          result.headline = jsonData.jobTitle;
          result.photoUrl = jsonData.image;
          result.about = jsonData.description;
          
          // Extract location
          if (jsonData.address) {
            const parts = [];
            if (jsonData.address.addressLocality) parts.push(jsonData.address.addressLocality);
            if (jsonData.address.addressRegion) parts.push(jsonData.address.addressRegion);
            result.location = parts.join(', ');
          }
          
          // Extract experience
          if (jsonData.worksFor && Array.isArray(jsonData.worksFor)) {
            result.experiences = jsonData.worksFor.map((work: any) => ({
              company: work.name,
              title: work.jobTitle || work.description
            }));
          }
          
          // Extract education
          if (jsonData.alumniOf && Array.isArray(jsonData.alumniOf)) {
            result.educations = jsonData.alumniOf.map((edu: any) => ({
              school: edu.name
            }));
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    // Fallback to OpenGraph meta tags if JSON-LD failed
    if (!result.name) {
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
      if (ogTitle) {
        const parts = ogTitle[1].split(' - ');
        result.name = parts[0].trim();
        result.headline = parts.slice(1).join(' - ').replace(/\| LinkedIn$/i, '').trim();
      }
    }
    
    if (!result.about) {
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (ogDesc) {
        result.about = ogDesc[1].trim();
      }
    }
    
    if (!result.photoUrl) {
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogImage) {
        result.photoUrl = ogImage[1];
      }
    }
    
    console.log('[WAYBACK] Parsed:', result.name || 'Unknown');
    
    return result;
  } catch (error) {
    console.error('[WAYBACK] Parse error:', error);
    return null;
  }
}

/**
 * 6. Data Fusion & Multi-Source Verification
 */
function mergeResults(
  bing: SearchResult | null,
  ddg: SearchResult | null,
  yahoo: SearchResult | null,
  wayback: Partial<LinkedInProfile> | null,
  username: string
): LinkedInProfile {
  const sources: string[] = [];
  const mergeMatrix: Record<string, string[]> = {};
  
  // Collect all values for each field
  const nameValues: Array<{value: string, source: string}> = [];
  const headlineValues: Array<{value: string, source: string}> = [];
  const locationValues: Array<{value: string, source: string}> = [];
  const companyValues: Array<{value: string, source: string}> = [];
  
  if (bing) {
    sources.push('Bing');
    if (bing.name) nameValues.push({value: bing.name, source: 'Bing'});
    if (bing.headline) headlineValues.push({value: bing.headline, source: 'Bing'});
    if (bing.location) locationValues.push({value: bing.location, source: 'Bing'});
    if (bing.company) companyValues.push({value: bing.company, source: 'Bing'});
  }
  
  if (ddg) {
    sources.push('DuckDuckGo');
    if (ddg.name) nameValues.push({value: ddg.name, source: 'DuckDuckGo'});
    if (ddg.headline) headlineValues.push({value: ddg.headline, source: 'DuckDuckGo'});
  }
  
  if (yahoo) {
    sources.push('Yahoo');
    if (yahoo.name) nameValues.push({value: yahoo.name, source: 'Yahoo'});
    if (yahoo.headline) headlineValues.push({value: yahoo.headline, source: 'Yahoo'});
  }
  
  if (wayback) {
    sources.push('Wayback');
    if (wayback.name) nameValues.push({value: wayback.name, source: 'Wayback'});
    if (wayback.headline) headlineValues.push({value: wayback.headline, source: 'Wayback'});
    if (wayback.location) locationValues.push({value: wayback.location, source: 'Wayback'});
  }
  
  // Pick most common value (or first if tie)
  const pickBest = (values: Array<{value: string, source: string}>) => {
    if (values.length === 0) return {value: undefined, sources: []};
    
    // Count occurrences
    const counts = new Map<string, {count: number, sources: string[]}>();
    values.forEach(v => {
      const existing = counts.get(v.value);
      if (existing) {
        existing.count++;
        existing.sources.push(v.source);
      } else {
        counts.set(v.value, {count: 1, sources: [v.source]});
      }
    });
    
    // Pick most common
    let best = {value: '', count: 0, sources: [] as string[]};
    counts.forEach((data, value) => {
      if (data.count > best.count) {
        best = {value, count: data.count, sources: data.sources};
      }
    });
    
    return {value: best.value, sources: best.sources};
  };
  
  const name = pickBest(nameValues);
  const headline = pickBest(headlineValues);
  const location = pickBest(locationValues);
  const company = pickBest(companyValues);
  
  // Build merge matrix
  if (name.value) mergeMatrix['name'] = name.sources;
  if (headline.value) mergeMatrix['headline'] = headline.sources;
  if (location.value) mergeMatrix['location'] = location.sources;
  if (company.value) mergeMatrix['company'] = company.sources;
  
  // Calculate confidence (more sources = higher confidence)
  let confidence = 30; // Base
  if (sources.length >= 2) confidence += 30;
  if (sources.length >= 3) confidence += 20;
  if (sources.includes('Wayback')) confidence += 20;
  
  // Verification status (2+ sources = VERIFIED)
  const verification = sources.length >= 2 ? 'VERIFIED' : 'UNVERIFIED';
  
  // Boost confidence if verified
  if (verification === 'VERIFIED') {
    confidence = Math.min(confidence + 10, 98);
  }
  
  return {
    name: name.value,
    headline: headline.value,
    location: location.value,
    currentCompany: company.value,
    about: wayback?.about,
    photoUrl: wayback?.photoUrl,
    experiences: wayback?.experiences,
    educations: wayback?.educations,
    profileUrl: `https://www.linkedin.com/in/${username}/`,
    sources,
    confidence,
    verification,
    mergeMatrix
  };
}

/**
 * Main entry point: Fetch LinkedIn profile from multiple sources
 */
export async function fetchProfile(username: string): Promise<LinkedInProfile | null> {
  console.log(`\n[LINKEDIN MULTI-ENGINE] Fetching profile: ${username}`);
  console.log('='.repeat(60));
  
  // Run all queries in parallel
  const [bing, ddg, yahoo, waybackUrl] = await Promise.all([
    queryBing(username),
    queryDDG(username),
    queryYahoo(username),
    queryWaybackCDX(username)
  ]);
  
  // Parse Wayback archive if found
  let wayback: Partial<LinkedInProfile> | null = null;
  if (waybackUrl) {
    wayback = await parseArchivedHtml(waybackUrl);
  }
  
  // Check if we found anything
  if (!bing && !ddg && !yahoo && !wayback) {
    console.log('[LINKEDIN MULTI-ENGINE] No data found from any source');
    return null;
  }
  
  // Merge all results
  const profile = mergeResults(bing, ddg, yahoo, wayback, username);
  
  console.log(`\n[LINKEDIN MULTI-ENGINE] ✅ Profile retrieved`);
  console.log(`  Name: ${profile.name || 'N/A'}`);
  console.log(`  Sources: ${profile.sources.join(', ')}`);
  console.log(`  Confidence: ${profile.confidence}%`);
  console.log(`  Verification: ${profile.verification}`);
  console.log('='.repeat(60) + '\n');
  
  return profile;
}

/**
 * NEW: Search for related LinkedIn profiles (not just exact username)
 * Returns multiple profiles that match the search query
 */
export async function searchRelatedProfiles(query: string): Promise<LinkedInSearchResults> {
  console.log(`\n[LINKEDIN RELATED SEARCH] Searching for: "${query}"`);
  console.log('='.repeat(60));
  
  const profiles: LinkedInProfile[] = [];
  const sources: string[] = [];
  
  // Search Bing for related profiles
  try {
    const bingQuery = encodeURIComponent(`site:linkedin.com/in "${query}"`);
    const bingUrl = `https://www.bing.com/search?q=${bingQuery}`;
    
    const response = await fetch(bingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Extract all LinkedIn profile URLs from search results
      const urlMatches = html.matchAll(/https:\/\/(?:www\.)?linkedin\.com\/in\/([^\/\?"<>\s]+)/g);
      const uniqueUrls = new Set<string>();
      
      for (const match of urlMatches) {
        const profileUsername = match[1];
        const profileUrl = `https://www.linkedin.com/in/${profileUsername}`;
        
        // Avoid duplicates
        if (!uniqueUrls.has(profileUrl) && uniqueUrls.size < 10) {
          uniqueUrls.add(profileUrl);
          
          // Try to extract name from nearby HTML
          const urlIndex = match.index || 0;
          const context = html.substring(Math.max(0, urlIndex - 200), urlIndex + 200);
          const titleMatch = context.match(/<h2[^>]*>([^<]+)<\/h2>/i) || 
                           context.match(/<a[^>]*>([^<]+)<\/a>/i);
          
          const name = titleMatch ? titleMatch[1].replace(/\s*-\s*LinkedIn.*$/i, '').trim() : profileUsername;
          
          profiles.push({
            name,
            headline: 'LinkedIn profile',
            profileUrl,
            sources: ['Bing'],
            confidence: 60,
            verification: 'UNVERIFIED'
          });
        }
      }
      
      if (profiles.length > 0) {
        sources.push('Bing');
        console.log(`[BING] Found ${profiles.length} related profiles`);
      } else {
        console.log('[BING] No related profiles found');
      }
    }
  } catch (error) {
    console.error('[BING] Search error:', error);
  }
  
  // Search Google (if API configured)
  // This would require Google Custom Search API implementation
  
  console.log(`\n[LINKEDIN RELATED SEARCH] ✅ Found ${profiles.length} profiles`);
  console.log('='.repeat(60) + '\n');
  
  return {
    query,
    profiles,
    totalFound: profiles.length,
    sources,
    searchType: 'related'
  };
}
