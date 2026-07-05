/**
 * LinkedIn Authenticated Search API
 * Uses LinkedIn session cookies to search for profiles via LinkedIn's internal API
 * 
 * IMPORTANT: This uses your personal LinkedIn session
 * - Keep your li_at cookie secret
 * - LinkedIn may detect automated activity
 * - Use responsibly and within LinkedIn's ToS
 */

import { calculateConfidenceScore, sortByConfidence } from '../utils/confidenceScoring';

export interface LinkedInAuthProfile {
  name: string;
  headline?: string;
  location?: string;
  profileUrl: string;
  photoUrl?: string;
  publicIdentifier: string; // LinkedIn username
  entityUrn?: string;
  connectionDegree?: string;
  currentPositions?: Array<{
    title?: string;
    companyName?: string;
  }>;
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
}

export interface LinkedInAuthSearchResults {
  query: string;
  profiles: LinkedInAuthProfile[];
  totalFound: number;
  source: 'LinkedIn Authenticated API';
}

/**
 * Search LinkedIn profiles using authenticated session
 */
export async function searchLinkedInAuthenticated(
  query: string,
  limit: number = 10
): Promise<LinkedInAuthSearchResults> {
  
  const liAt = process.env.LINKEDIN_LI_AT;
  const jsessionId = process.env.LINKEDIN_JSESSIONID;
  
  if (!liAt) {
    console.log('[LINKEDIN AUTH] No session cookie configured');
    return {
      query,
      profiles: [],
      totalFound: 0,
      source: 'LinkedIn Authenticated API'
    };
  }
  
  console.log(`[LINKEDIN AUTH] Searching for: "${query}"`);
  
  try {
    // Use LinkedIn's typeahead API for people search
    const searchQuery = encodeURIComponent(query);
    const url = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(keywords:${searchQuery},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false)&queryId=voyagerSearchDashClusters.66adc6056cf4138949ca5dcb31bb1749`;
    
    // LinkedIn requires the csrf-token header to EXACTLY match the JSESSIONID
    // cookie value (including the "ajax:" prefix). Using a slice of li_at is wrong
    // and results in 403 CSRF errors.
    const csrfToken = (jsessionId || '').replace(/"/g, '');

    const response = await fetch(url, {
      method: 'GET',
      // Do NOT follow redirects: when LinkedIn rejects the session it 3xx-redirects
      // to a login/authwall, causing "redirect count exceeded" crashes. Treat any
      // redirect as an auth failure and fall back gracefully.
      redirect: 'manual',
      headers: {
        'Cookie': `li_at=${liAt}${csrfToken ? `; JSESSIONID="${csrfToken}"` : ''}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        'csrf-token': csrfToken,
        'x-restli-protocol-version': '2.0.0',
        'x-li-lang': 'en_US',
        'x-li-track': JSON.stringify({
          'clientVersion': '1.13.0',
          'mpVersion': '1.13.0',
          'osName': 'web',
          'timezoneOffset': 0,
          'timezone': 'UTC',
          'deviceFormFactor': 'DESKTOP',
          'mpName': 'voyager-web'
        })
      }
    });
    
    if (!response.ok) {
      console.error(`[LINKEDIN AUTH] API Error: ${response.status} ${response.statusText}`);
      
      // Try fallback: Simple people search API
      return await searchLinkedInFallback(query, liAt, jsessionId, limit);
    }
    
    const data = await response.json();
    
    // Parse GraphQL response
    const profiles = parseLinkedInGraphQLResponse(data);
    
    // Calculate confidence scores for each profile
    const profilesWithConfidence = profiles.map(profile => {
      const score = calculateConfidenceScore(query, {
        name: profile.name,
        headline: profile.headline,
        location: profile.location,
        username: profile.publicIdentifier,
        photoUrl: profile.photoUrl,
        currentPositions: profile.currentPositions
      });
      
      return {
        ...profile,
        confidence: score.overall,
        confidenceBreakdown: score.breakdown,
        confidenceReasoning: score.reasoning
      };
    });
    
    // Sort by confidence (descending)
    const sortedProfiles = sortByConfidence(profilesWithConfidence);
    
    console.log(`[LINKEDIN AUTH] ✅ Found ${sortedProfiles.length} profiles`);
    if (sortedProfiles.length > 0) {
      console.log(`[LINKEDIN AUTH] Top match: "${sortedProfiles[0].name}" (${sortedProfiles[0].confidence}% confidence)`);
    }
    
    return {
      query,
      profiles: sortedProfiles.slice(0, limit),
      totalFound: sortedProfiles.length,
      source: 'LinkedIn Authenticated API'
    };
    
  } catch (error) {
    console.error('[LINKEDIN AUTH] Error:', error);
    
    // Try fallback method
    return await searchLinkedInFallback(query, liAt, jsessionId, limit);
  }
}

/**
 * Fallback: Use LinkedIn's classic search endpoint
 */
async function searchLinkedInFallback(
  query: string,
  liAt: string,
  jsessionId: string | undefined,
  limit: number
): Promise<LinkedInAuthSearchResults> {
  
  console.log('[LINKEDIN AUTH] Trying fallback search method...');
  
  try {
    // Use the search sales navigator API or public search
    const searchQuery = encodeURIComponent(query);
    const url = `https://www.linkedin.com/voyager/api/search/blended?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-165&count=${limit}&filters=List((key:resultType,value:List(PEOPLE)))&keywords=${searchQuery}&origin=GLOBAL_SEARCH_HEADER&q=all&queryContext=List((spellCorrectionEnabled:true))&start=0`;
    
    const csrfToken = (jsessionId || '').replace(/"/g, '');

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // avoid login-redirect loops when the session is rejected
      headers: {
        'Cookie': `li_at=${liAt}${csrfToken ? `; JSESSIONID="${csrfToken}"` : ''}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        'csrf-token': csrfToken,
        'x-restli-protocol-version': '2.0.0',
        'x-li-lang': 'en_US'
      }
    });
    
    if (!response.ok) {
      console.error(`[LINKEDIN AUTH] Fallback failed: ${response.status}`);
      return {
        query,
        profiles: [],
        totalFound: 0,
        source: 'LinkedIn Authenticated API'
      };
    }
    
    const data = await response.json();
    const profiles = parseLinkedInSearchResponse(data);
    
    // Calculate confidence scores
    const profilesWithConfidence = profiles.map(profile => {
      const score = calculateConfidenceScore(query, {
        name: profile.name,
        headline: profile.headline,
        location: profile.location,
        username: profile.publicIdentifier,
        photoUrl: profile.photoUrl,
        currentPositions: profile.currentPositions
      });
      
      return {
        ...profile,
        confidence: score.overall,
        confidenceBreakdown: score.breakdown,
        confidenceReasoning: score.reasoning
      };
    });
    
    // Sort by confidence
    const sortedProfiles = sortByConfidence(profilesWithConfidence);
    
    console.log(`[LINKEDIN AUTH] ✅ Fallback found ${sortedProfiles.length} profiles`);
    if (sortedProfiles.length > 0) {
      console.log(`[LINKEDIN AUTH] Top match: "${sortedProfiles[0].name}" (${sortedProfiles[0].confidence}% confidence)`);
    }
    
    return {
      query,
      profiles: sortedProfiles,
      totalFound: sortedProfiles.length,
      source: 'LinkedIn Authenticated API'
    };
    
  } catch (error) {
    console.error('[LINKEDIN AUTH] Fallback error:', error);
    return {
      query,
      profiles: [],
      totalFound: 0,
      source: 'LinkedIn Authenticated API'
    };
  }
}

/**
 * Parse LinkedIn GraphQL search response
 */
function parseLinkedInGraphQLResponse(data: any): LinkedInAuthProfile[] {
  const profiles: LinkedInAuthProfile[] = [];
  
  try {
    // LinkedIn GraphQL responses have nested structures
    const elements = data?.data?.searchDashClustersByAll?.elements || [];
    
    for (const element of elements) {
      const items = element?.items || [];
      
      for (const item of items) {
        const entity = item?.item?.entityResult;
        if (!entity) continue;
        
        const profile = extractProfileFromEntity(entity);
        if (profile) {
          profiles.push(profile);
        }
      }
    }
  } catch (error) {
    console.error('[LINKEDIN AUTH] Parse error:', error);
  }
  
  return profiles;
}

/**
 * Parse LinkedIn classic search API response
 */
function parseLinkedInSearchResponse(data: any): LinkedInAuthProfile[] {
  const profiles: LinkedInAuthProfile[] = [];
  
  try {
    const included = data?.included || [];
    
    for (const item of included) {
      if (item?.entityUrn?.includes('fsd_profile')) {
        const profile = extractProfileFromIncluded(item);
        if (profile) {
          profiles.push(profile);
        }
      }
    }
  } catch (error) {
    console.error('[LINKEDIN AUTH] Parse error:', error);
  }
  
  return profiles;
}

/**
 * Extract profile data from entity
 */
function extractProfileFromEntity(entity: any): LinkedInAuthProfile | null {
  try {
    const name = entity?.title?.text || 'Unknown';
    const headline = entity?.primarySubtitle?.text || '';
    const location = entity?.secondarySubtitle?.text || '';
    const publicIdentifier = entity?.trackingUrn?.split(':').pop() || '';
    const profileUrl = `https://www.linkedin.com/in/${publicIdentifier}`;
    
    // Extract photo
    const image = entity?.image;
    const photoUrl = image?.attributes?.[0]?.detailData?.['com.linkedin.voyager.dash.deco.search.ProfilePictureDataObject']?.photoUrl ||
                    image?.attributes?.[0]?.miniProfile?.picture?.['com.linkedin.common.VectorImage']?.rootUrl;
    
    // Extract current positions
    const currentPositions: Array<{title?: string; companyName?: string}> = [];
    const insights = entity?.insights || [];
    for (const insight of insights) {
      const text = insight?.text?.text;
      if (text && (text.includes('works at') || text.includes('at '))) {
        currentPositions.push({ title: text });
      }
    }
    
    return {
      name,
      headline,
      location,
      profileUrl,
      photoUrl,
      publicIdentifier,
      entityUrn: entity?.entityUrn,
      connectionDegree: entity?.badges?.[0]?.text || '',
      currentPositions: currentPositions.length > 0 ? currentPositions : undefined
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extract profile data from included item
 */
function extractProfileFromIncluded(item: any): LinkedInAuthProfile | null {
  try {
    const name = `${item?.firstName || ''} ${item?.lastName || ''}`.trim() || 'Unknown';
    const headline = item?.headline || '';
    const location = item?.geoLocation || '';
    const publicIdentifier = item?.publicIdentifier || '';
    const profileUrl = `https://www.linkedin.com/in/${publicIdentifier}`;
    
    // Extract photo
    const photoUrl = item?.profilePicture?.displayImageUrn ||
                    item?.profilePictureDisplayImage?.rootUrl;
    
    return {
      name,
      headline,
      location,
      profileUrl,
      photoUrl,
      publicIdentifier,
      entityUrn: item?.entityUrn,
      connectionDegree: item?.distance?.value || ''
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if LinkedIn authentication is configured
 */
export function isLinkedInAuthConfigured(): boolean {
  return !!process.env.LINKEDIN_LI_AT;
}
