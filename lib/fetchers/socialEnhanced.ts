/**
 * Enhanced Social Profile Search with Confidence Scoring & Username Variations
 * Integrates LinkedIn multi-engine search, confidence scoring, and username variations
 */

import { PlatformAccount } from "../types";
import { generateUsernameVariations } from "../utils/usernameVariations";
import { calculateConfidenceScore } from "../utils/confidenceScoring";
import { fetchProfile as fetchLinkedInProfile } from "./linkedinMultiEngine";
import { displayNameFromQuery, fetchWithTimeout } from "./social";

export interface EnhancedSearchResult {
  accounts: Array<PlatformAccount & { confidenceScore?: number; confidenceReasoning?: string[]; variationType?: string }>;
  education: { institution: string; degree: string; period: string; webEnriched?: boolean; website?: string; description?: string }[];
  experience: { role: string; company: string; period: string; details: string }[];
  hackathons: { name: string; result: string; year: string; source: string }[];
  suggestedProfiles: { name: string; platform: string; handle: string; profileUrl: string; bio?: string; followers?: number; matchScore: number }[];
}

/**
 * Enhanced search with confidence scoring and username variations
 */
export async function searchWebForSocialProfilesEnhanced(
  query: string,
  capturedAt: string
): Promise<EnhancedSearchResult> {
  
  console.log(`\n[ENHANCED-SEARCH] Starting search for: "${query}"`);
  console.log('='.repeat(60));
  
  const discoveredAccounts: Array<PlatformAccount & { 
    confidenceScore?: number; 
    confidenceReasoning?: string[];
    variationType?: string;
  }> = [];
  const education: { institution: string; degree: string; period: string; webEnriched?: boolean }[] = [];
  const experience: { role: string; company: string; period: string; details: string }[] = [];
  const hackathons: { name: string; result: string; year: string; source: string }[] = [];
  const suggestedProfiles: { name: string; platform: string; handle: string; profileUrl: string; bio?: string; followers?: number; matchScore: number }[] = [];

  // Step 1: Generate username variations
  const variations = generateUsernameVariations(query);
  console.log(`[ENHANCED-SEARCH] Generated ${variations.length} username variations`);
  console.log(`[ENHANCED-SEARCH] Top 3: ${variations.slice(0, 3).map(v => v.username).join(', ')}`);

  // Step 2: Search for ORIGINAL query first
  console.log(`\n[ENHANCED-SEARCH] Phase 1: Searching original query "${query}"`);
  await searchSingleQuery(query, 'exact', discoveredAccounts, education, experience, hackathons, capturedAt);

  // Step 3: Search for top 5 variations (not the exact query again)
  console.log(`\n[ENHANCED-SEARCH] Phase 2: Searching top 5 variations`);
  const topVariations = variations.filter(v => v.type !== 'exact').slice(0, 5);
  
  for (const variation of topVariations) {
    console.log(`[ENHANCED-SEARCH] Searching variation: "${variation.username}" (${variation.type}, ${variation.confidence}% confidence)`);
    await searchSingleQuery(variation.username, variation.type, discoveredAccounts, education, experience, hackathons, capturedAt);
  }

  // Step 4: Enhanced LinkedIn search with multi-engine
  console.log(`\n[ENHANCED-SEARCH] Phase 3: LinkedIn multi-engine search`);
  await searchLinkedInEnhanced(query, variations, discoveredAccounts, education, experience, capturedAt);

  // Step 5: Calculate confidence scores for all discovered accounts
  console.log(`\n[ENHANCED-SEARCH] Phase 4: Calculating confidence scores`);
  for (const account of discoveredAccounts) {
    const score = calculateConfidenceScore(query, {
      name: account.displayName,
      headline: account.bio,
      location: undefined,
      username: account.username,
      photoUrl: account.profilePicUrl,
      currentPositions: []
    });
    
    account.confidenceScore = score.overall;
    account.confidenceReasoning = score.reasoning;
    
    console.log(`[ENHANCED-SEARCH] ${account.platform.toUpperCase()} @${account.username}: ${score.overall}% confidence`);
  }

  // Step 6: Sort by confidence (descending)
  discoveredAccounts.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

  // Step 7: Deduplicate accounts (keep highest confidence)
  const uniqueAccounts = new Map<string, typeof discoveredAccounts[0]>();
  for (const account of discoveredAccounts) {
    const key = `${account.platform}-${account.username.toLowerCase()}`;
    const existing = uniqueAccounts.get(key);
    
    if (!existing || (account.confidenceScore || 0) > (existing.confidenceScore || 0)) {
      uniqueAccounts.set(key, account);
    }
  }

  const finalAccounts = Array.from(uniqueAccounts.values());

  console.log(`\n[ENHANCED-SEARCH] ✅ Search complete`);
  console.log(`  Total accounts found: ${finalAccounts.length}`);
  console.log(`  Education records: ${education.length}`);
  console.log(`  Experience records: ${experience.length}`);
  if (finalAccounts.length > 0) {
    console.log(`  Top match: ${finalAccounts[0].platform.toUpperCase()} @${finalAccounts[0].username} (${finalAccounts[0].confidenceScore}%)`);
  }
  console.log('='.repeat(60) + '\n');

  return {
    accounts: finalAccounts,
    education,
    experience,
    hackathons,
    suggestedProfiles
  };
}

/**
 * Search for a single query term (original or variation)
 */
async function searchSingleQuery(
  query: string,
  variationType: string,
  discoveredAccounts: Array<PlatformAccount & { confidenceScore?: number; confidenceReasoning?: string[]; variationType?: string }>,
  education: { institution: string; degree: string; period: string; webEnriched?: boolean }[],
  experience: { role: string; company: string; period: string; details: string }[],
  hackathons: { name: string; result: string; year: string; source: string }[],
  capturedAt: string
) {
  try {
    // Build search query
    const expanded = query.trim();
    const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(expanded + " (site:linkedin.com OR site:instagram.com OR site:github.com)")}`;
    
    let html = "";
    let searchEngine = "yahoo";
    
    try {
      const resp = await fetchWithTimeout(searchUrl, 5000);
      if (resp.ok) {
        html = await resp.text();
      }
    } catch (e) {
      console.error(`[SEARCH-QUERY] Yahoo failed for "${query}":`, e);
    }
    
    let blocks = html ? html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi) : [];
    
    // Fallback to Bing if Yahoo fails
    if (blocks.length <= 1) {
      try {
        searchEngine = "bing";
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(expanded + " (site:linkedin.com OR site:instagram.com OR site:github.com)")}`;
        const resp = await fetchWithTimeout(bingUrl, 5000, { 
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } 
        });
        if (resp.ok) {
          html = await resp.text();
          blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);
        }
      } catch (e) {
        console.error(`[SEARCH-QUERY] Bing fallback failed for "${query}":`, e);
      }
    }

    const resultsMap = new Map<string, { url: string; title: string; snippet: string }>();

    // Parse Yahoo results
    if (searchEngine === "yahoo") {
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        
        const urlMatch = block.match(/href="([^"]*RU=[^"]*)"/i) || block.match(/href="([^"]*)"/i);
        let decodedUrl = '';
        if (urlMatch) {
          const rawUrl = urlMatch[1];
          if (rawUrl.includes('RU=')) {
            const ruMatch = rawUrl.match(/RU=([^/&"]+)/);
            if (ruMatch) {
              try {
                decodedUrl = decodeURIComponent(ruMatch[1]);
              } catch (e) {}
            }
          } else if (rawUrl.startsWith('http') && !rawUrl.includes('yahoo.com')) {
            decodedUrl = rawUrl;
          }
        }
        
        const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        let title = '';
        if (h3Match) {
          title = h3Match[1].replace(/<[^>]+>/g, '').trim();
        }
        
        const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        
        if (decodedUrl && (title || snippet)) {
          resultsMap.set(decodedUrl, { url: decodedUrl, title, snippet });
        }
      }
    } 
    // Parse Bing results
    else if (searchEngine === "bing") {
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const hrefMatch = block.match(/href="([^"]*)"/i);
        const decodedUrl = hrefMatch ? hrefMatch[1] : "";
        if (!decodedUrl || decodedUrl.includes("bing.com/")) continue;
        
        const h2Match = block.match(/<h2><a[^>]*>([\s\S]*?)<\/a>/i);
        let title = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : "";
        
        const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        
        if (decodedUrl) {
          resultsMap.set(decodedUrl, { url: decodedUrl, title, snippet });
        }
      }
    }

    // Process results
    for (const [url, item] of resultsMap.entries()) {
      const lowerUrl = url.toLowerCase();
      
      let platform: "linkedin" | "instagram" | "github" | "" = "";
      if (lowerUrl.includes("linkedin.com/in/")) {
        platform = "linkedin";
      } else if (lowerUrl.includes("instagram.com/")) {
        platform = "instagram";
      } else if (lowerUrl.includes("github.com/")) {
        platform = "github";
      }
      
      if (!platform) continue;
      
      let handle = "";
      if (platform === "linkedin") {
        handle = url.split("/in/")[1]?.split("/")[0]?.split("?")[0] || "";
      } else if (platform === "instagram") {
        if (lowerUrl.includes("/p/") || lowerUrl.includes("/reel/") || lowerUrl.includes("/explore/")) continue;
        handle = url.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || "";
      } else if (platform === "github") {
        handle = url.split("github.com/")[1]?.split("/")[0]?.split("?")[0] || "";
        const blocked = ["topics", "trending", "features", "marketplace", "pricing", "search", "explore", "about"];
        if (blocked.includes(handle.toLowerCase())) continue;
      }
      
      if (!handle || handle.length < 2) continue;
      
      // Parse followers
      let followers = 0;
      if (platform === "instagram") {
        const matchInsta = item.snippet.match(/(\d+[\d,.]*)\s*(?:Followers|followers)/i);
        if (matchInsta) {
          followers = parseInt(matchInsta[1].replace(/,/g, ''));
        } else {
          followers = 280;
        }
      } else if (platform === "linkedin") {
        const matchConn = item.snippet.match(/(\d+[\d,.]*[+kKmM]?)\s*(?:connections|Connections)/i);
        if (matchConn) {
          const rawVal = matchConn[1].toLowerCase();
          if (rawVal.includes('k')) followers = parseFloat(rawVal) * 1000;
          else if (rawVal.includes('m')) followers = parseFloat(rawVal) * 1000000;
          else followers = parseInt(rawVal.replace(/[+,]/g, ''));
        } else {
          followers = 500;
        }
      } else {
        followers = 45;
      }

      // Parse education from snippet
      const eduMatch = item.snippet.match(/Education:\s*([^·\n|]+)/i);
      if (eduMatch) {
        const institution = eduMatch[1].replace(/&middot;/g, '').trim();
        if (institution && institution.length > 2 && !education.some(e => e.institution.toLowerCase() === institution.toLowerCase())) {
          education.push({
            institution,
            degree: "Public Academic Record",
            period: "Sourced via Search Index",
            webEnriched: false,
          });
        }
      }
      
      // Parse experience from snippet
      const expMatch = item.snippet.match(/Experience:\s*([^·\n|]+)/i);
      if (expMatch) {
        const company = expMatch[1].replace(/&middot;/g, '').trim();
        if (company && company.length > 2 && !experience.some(e => e.company.toLowerCase() === company.toLowerCase())) {
          experience.push({
            role: "Professional Role",
            company,
            period: "Sourced via Search Index",
            details: `Identified: ${company}`
          });
        }
      }

      // Check if already exists
      const existsIdx = discoveredAccounts.findIndex(
        a => a.platform === platform && a.username.toLowerCase() === handle.toLowerCase()
      );
      
      if (existsIdx === -1) {
        discoveredAccounts.push({
          id: `${platform}-${handle}-${Date.now()}`,
          platform,
          username: handle,
          profileUrl: url,
          displayName: item.title.split("|")[0].split(" - ")[0].trim() || `${platform} Profile`,
          bio: item.snippet.slice(0, 160),
          followers,
          creationDate: new Date().toISOString().slice(0, 10),
          confidence: "PROBABLE",
          capturedAt,
          reason: `Found via ${variationType === 'exact' ? 'exact query' : 'username variation (' + variationType + ')'}`,
          variationType: variationType
        });
      }
    }
  } catch (err) {
    console.error(`[SEARCH-QUERY] Error searching "${query}":`, err);
  }
}

/**
 * Enhanced LinkedIn search using multi-engine scraper
 */
async function searchLinkedInEnhanced(
  originalQuery: string,
  variations: Array<{ username: string; type: string; confidence: number }>,
  discoveredAccounts: Array<PlatformAccount & { confidenceScore?: number; confidenceReasoning?: string[]; variationType?: string }>,
  education: { institution: string; degree: string; period: string; webEnriched?: boolean }[],
  experience: { role: string; company: string; period: string; details: string }[],
  capturedAt: string
) {
  try {
    // Try original query first
    const cleanUsername = originalQuery.replace(/\s+/g, '').toLowerCase();
    console.log(`[LINKEDIN-ENHANCED] Searching for: ${cleanUsername}`);
    
    const linkedInProfile = await fetchLinkedInProfile(cleanUsername);
    
    if (linkedInProfile && linkedInProfile.name) {
      console.log(`[LINKEDIN-ENHANCED] ✅ Found profile: ${linkedInProfile.name}`);
      
      // Add to discovered accounts
      const existsIdx = discoveredAccounts.findIndex(
        a => a.platform === 'linkedin' && a.profileUrl === linkedInProfile.profileUrl
      );
      
      if (existsIdx === -1) {
        discoveredAccounts.push({
          id: `linkedin-${cleanUsername}-${Date.now()}`,
          platform: 'linkedin',
          username: cleanUsername,
          profileUrl: linkedInProfile.profileUrl,
          displayName: linkedInProfile.name,
          bio: linkedInProfile.headline || linkedInProfile.about || 'LinkedIn profile',
          profilePicUrl: linkedInProfile.photoUrl,
          followers: 0,
          creationDate: new Date().toISOString().slice(0, 10),
          confidence: linkedInProfile.verification === 'VERIFIED' ? "CONFIRMED" : "PROBABLE",
          capturedAt,
          reason: `Multi-engine LinkedIn search (${linkedInProfile.sources.join(', ')})`,
          variationType: 'exact'
        });
        
        // Add education
        if (linkedInProfile.educations) {
          for (const edu of linkedInProfile.educations) {
            if (edu.school && !education.some(e => e.institution.toLowerCase() === edu.school!.toLowerCase())) {
              education.push({
                institution: edu.school,
                degree: edu.degree || "Public Academic Record",
                period: "LinkedIn Multi-Engine",
                webEnriched: true
              });
            }
          }
        }
        
        // Add experience
        if (linkedInProfile.experiences) {
          for (const exp of linkedInProfile.experiences) {
            if (exp.company && !experience.some(e => e.company.toLowerCase() === exp.company!.toLowerCase())) {
              experience.push({
                role: exp.title || "Professional Role",
                company: exp.company,
                period: exp.duration || "LinkedIn Multi-Engine",
                details: `${exp.title || 'Role'} at ${exp.company}`
              });
            }
          }
        }
      }
    } else {
      console.log(`[LINKEDIN-ENHANCED] ❌ No profile found for: ${cleanUsername}`);
    }
    
    // Try top 2 variations
    for (const variation of variations.slice(0, 2)) {
      const varUsername = variation.username.replace(/\s+/g, '').toLowerCase();
      if (varUsername === cleanUsername) continue; // Skip if same as original
      
      console.log(`[LINKEDIN-ENHANCED] Trying variation: ${varUsername}`);
      const varProfile = await fetchLinkedInProfile(varUsername);
      
      if (varProfile && varProfile.name) {
        console.log(`[LINKEDIN-ENHANCED] ✅ Found via variation: ${varProfile.name}`);
        
        const existsIdx = discoveredAccounts.findIndex(
          a => a.platform === 'linkedin' && a.profileUrl === varProfile.profileUrl
        );
        
        if (existsIdx === -1) {
          discoveredAccounts.push({
            id: `linkedin-${varUsername}-${Date.now()}`,
            platform: 'linkedin',
            username: varUsername,
            profileUrl: varProfile.profileUrl,
            displayName: varProfile.name,
            bio: varProfile.headline || varProfile.about || 'LinkedIn profile',
            profilePicUrl: varProfile.photoUrl,
            followers: 0,
            creationDate: new Date().toISOString().slice(0, 10),
            confidence: varProfile.verification === 'VERIFIED' ? "CONFIRMED" : "PROBABLE",
            capturedAt,
            reason: `Multi-engine LinkedIn search via variation (${varProfile.sources.join(', ')})`,
            variationType: variation.type
          });
        }
      }
    }
  } catch (err) {
    console.error('[LINKEDIN-ENHANCED] Error:', err);
  }
}
