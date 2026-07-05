import { LinkedinIntelligence, ForensicField } from "../types";
import { getDemoLinkedinData } from "../mock/demoData";
import { LinkedInPublicSearchProvider } from "./linkedinPublicSearch";
import { fetchWithTimeout } from "../utils";

// Helper to extract a substring using regex
function matchRegex(text: string, regex: RegExp, index = 1): string | null {
  const match = text.match(regex);
  return match && match[index] ? match[index].trim() : null;
}

export interface LinkedInProviderConfig {
  liAtCookie?: string;
  jSessionIdCookie?: string;
  userAgent?: string;
}

export class LinkedInProvider {
  private config: LinkedInProviderConfig;
  private defaultSource = "LinkedIn Intelligence Engine";

  constructor(config: LinkedInProviderConfig = {}) {
    this.config = {
      liAtCookie: config.liAtCookie || process.env.LINKEDIN_LI_AT,
      jSessionIdCookie: config.jSessionIdCookie || process.env.LINKEDIN_JSESSIONID,
      userAgent: config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }

  /**
   * Checks if an authenticated investigator session exists
   */
  public hasAuthenticatedSession(): boolean {
    return !!(this.config.liAtCookie && this.config.jSessionIdCookie);
  }

  /**
   * Helper to search for a LinkedIn profile by real name using Bing/Yahoo/DDG.
   */
  private async searchLinkedInByName(realName: string): Promise<string | null> {
    const cleanName = realName.trim();
    const parts = cleanName.split(/\s+/).filter(p => p.length > 0);

    let queryTerms = `"${cleanName}"`;
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      
      const alt1 = `${last} ${parts.slice(0, -1).join(" ")}`; // e.g. "Pradhyut K M"
      const alt2 = `${last} ${parts.slice(0, -1).join("")}`; // e.g. "Pradhyut KM"
      const alt3 = `${parts.slice(1).join(" ")} ${first}`; // e.g. "Pradhyut K"
      
      queryTerms = `("${cleanName}" OR "${alt1}" OR "${alt2}" OR "${alt3}")`;
    }

    const engines = [
      `https://www.bing.com/search?q=site:linkedin.com/in/+${encodeURIComponent(queryTerms)}`,
      `https://search.yahoo.com/search?p=site:linkedin.com/in/+${encodeURIComponent(queryTerms)}`,
      `https://html.duckduckgo.com/html/?q=site:linkedin.com/in/+${encodeURIComponent(queryTerms)}`
    ];

    for (const url of engines) {
      try {
        console.log(`[LINKEDIN-SEARCH] Searching name "${realName}" on: ${url}`);
        const resp = await fetchWithTimeout(url, 5000, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (resp.ok) {
          const html = await resp.text();
          const match = html.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
          if (match && match[1]) {
            let resolved = match[1].trim().toLowerCase();
            try {
              resolved = decodeURIComponent(resolved);
            } catch (_) {}
            if (resolved && resolved !== "search" && resolved !== "dir" && resolved !== "pub") {
              console.log(`[LINKEDIN-SEARCH] Found resolved username: ${resolved} for real name: ${realName}`);
              return resolved;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[LINKEDIN-SEARCH] Name search engine offline: ${err.message || err}`);
      }
    }
    return null;
  }

  /**
   * Main entry point to fetch a LinkedIn profile
   */
  public async fetchProfile(username: string, realName?: string): Promise<LinkedinIntelligence | null> {
    const cleanUsername = username.replace(/^in\//, "").replace(/\/$/, "").trim();
    
    // Layer 1: Authenticated Voyager API session
    if (this.hasAuthenticatedSession()) {
      try {
        console.log(`[LINKEDIN] Initiating authenticated Voyager API extraction for "${cleanUsername}"...`);
        const profile = await this.fetchAuthenticated(cleanUsername);
        if (profile) return profile;
      } catch (err) {
        console.error(`[LINKEDIN] Authenticated extraction failed for "${cleanUsername}", falling back:`, err);
      }
    }

    // Layer 2: Public direct HTML scraping
    console.log(`[LINKEDIN] Initiating public HTML direct extraction for "${cleanUsername}"...`);
    const directProfile = await this.fetchPublic(cleanUsername);
    if (directProfile && directProfile.fullName?.value && directProfile.fullName.value !== cleanUsername) {
      console.log(`[LINKEDIN] ✓ Direct HTML extraction successful.`);
      return directProfile;
    }

    // Layer 3: Search Engine index parsing (Dork fallback)
    console.log(`[LINKEDIN] Direct fetch blocked/failed. Initiating public Search Engine index extraction...`);
    const searchProvider = new LinkedInPublicSearchProvider();
    const searchProfile = await searchProvider.fetchProfile(cleanUsername);
    if (searchProfile) {
      return searchProfile;
    }

    // Layer 3.5: Fallback to name search if realName is provided and is different from the handle
    if (realName && realName.trim() && realName !== cleanUsername) {
      console.log(`[LINKEDIN] Standard handle lookup failed. Searching by real name "${realName}"...`);
      const resolved = await this.searchLinkedInByName(realName);
      if (resolved && resolved !== cleanUsername) {
        console.log(`[LINKEDIN] Found resolved handle "${resolved}" via name search. Re-fetching...`);
        const resolvedProfile = await this.fetchProfile(resolved); // fetch without realName to avoid loops
        if (resolvedProfile) return resolvedProfile;
      }
    }

    // Layer 4: Fallback to directProfile empty shell or demo data if nothing else resolved
    if (directProfile) {
      const demoIntel = getDemoLinkedinData(cleanUsername);
      if (demoIntel) {
        console.log(`[LINKEDIN] Last resort demo data fallback used for "${cleanUsername}"`);
        return demoIntel;
      }
      return directProfile;
    }

    return null;
  }

  /**
   * Authenticated Voyager API extraction
   */
  private async fetchAuthenticated(username: string): Promise<LinkedinIntelligence | null> {
    const endpoint = `https://www.linkedin.com/voyager/api/identity/profiles/${username}/profileView`;
    const csrfToken = this.config.jSessionIdCookie?.replace(/"/g, "") || "";

    const cleanJSessionId = this.config.jSessionIdCookie?.replace(/"/g, "") || "";
    const headers: Record<string, string> = {
      "User-Agent": this.config.userAgent!,
      "Cookie": `li_at=${this.config.liAtCookie}; JSESSIONID="${cleanJSessionId}";`,
      "Csrf-Token": cleanJSessionId,
      "X-Restli-Protocol-Version": "2.0.0",
      "Accept": "application/vnd.linkedin.normalized+json+2.1",
    };

    const response = await fetchWithTimeout(endpoint, 6000, { headers });
    if (!response.ok) {
      throw new Error(`LinkedIn Voyager API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return this.parseVoyagerJson(username, data);
  }

  /**
   * Parses the Voyager API profileView JSON response
   */
  private parseVoyagerJson(username: string, data: any): LinkedinIntelligence {
    const source = "LinkedIn Voyager API";
    const method = "AUTHENTICATED_SESSION";
    const confidence = 100;
    const status = "VERIFIED";

    const wrap = <T>(val: T): ForensicField<T> => ({
      value: val,
      source,
      acquisitionMethod: method,
      confidence,
      verificationStatus: status,
    });

    // Locate elements in the normalized Voyager JSON structure
    const profile = data.profile || {};
    const firstName = profile.firstName || "";
    const lastName = profile.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || username;
    const headline = profile.headline || "";
    const summary = profile.summary || "";
    const locationName = profile.locationName || "";
    const avatarUrl = profile.miniProfile?.picture?.artifacts?.[0]?.fileIdentifyingUrlPathSegment || "";

    // Parse experiences
    const experiences: LinkedinIntelligence["experiences"] = [];
    const positionElements = data.positionView?.elements || [];
    for (const pos of positionElements) {
      const title = pos.title || "";
      const companyName = pos.companyName || "";
      const desc = pos.description || "";
      
      let durationStr = "";
      if (pos.timePeriod) {
        const start = pos.timePeriod.startDate ? `${pos.timePeriod.startDate.month}/${pos.timePeriod.startDate.year}` : "";
        const end = pos.timePeriod.endDate ? `${pos.timePeriod.endDate.month}/${pos.timePeriod.endDate.year}` : "Present";
        durationStr = start ? `${start} - ${end}` : "";
      }

      if (title && companyName) {
        experiences.push({
          title: wrap(title),
          company: wrap(companyName),
          description: wrap(desc),
          duration: wrap(durationStr),
          startDate: wrap(pos.timePeriod?.startDate ? `${pos.timePeriod.startDate.year}-${String(pos.timePeriod.startDate.month).padStart(2, "0")}-01` : ""),
          endDate: wrap(pos.timePeriod?.endDate ? `${pos.timePeriod.endDate.year}-${String(pos.timePeriod.endDate.month).padStart(2, "0")}-01` : ""),
        });
      }
    }

    // Parse educations
    const educations: LinkedinIntelligence["educations"] = [];
    const eduElements = data.educationView?.elements || [];
    for (const edu of eduElements) {
      const schoolName = edu.schoolName || "";
      const degree = edu.degreeName || "";
      const field = edu.fieldOfStudy || "";
      
      let durationStr = "";
      if (edu.timePeriod) {
        const start = edu.timePeriod.startDate ? String(edu.timePeriod.startDate.year) : "";
        const end = edu.timePeriod.endDate ? String(edu.timePeriod.endDate.year) : "";
        durationStr = start ? `${start} - ${end}` : "";
      }

      if (schoolName) {
        educations.push({
          institution: wrap(schoolName),
          degree: wrap(degree),
          fieldOfStudy: wrap(field),
          duration: wrap(durationStr),
        });
      }
    }

    // Parse skills
    const skills: LinkedinIntelligence["skills"] = (data.skillView?.elements || [])
      .map((s: any) => s.name)
      .filter(Boolean)
      .map((name: string) => wrap(name));

    return {
      fullName: wrap(fullName),
      headline: wrap(headline),
      location: wrap(locationName),
      avatarUrl: wrap(avatarUrl),
      profileUrl: wrap(`https://www.linkedin.com/in/${username}`),
      currentRole: experiences[0] ? experiences[0].title : undefined,
      currentCompany: experiences[0] ? experiences[0].company : undefined,
      summary: wrap(summary),
      experiences,
      educations,
      skills,
    };
  }

  /**
   * Public HTML extraction using the deep fallback hierarchy (7 layers)
   */
  private async fetchPublic(username: string): Promise<LinkedinIntelligence | null> {
    const profileUrl = `https://www.linkedin.com/in/${username}`;
    
    let html = "";
    try {
      // Use full browser-mimicking headers — LinkedIn checks Sec-Fetch-* and Accept-Language
      // to decide whether to serve a real profile or a login redirect.
      const response = await fetchWithTimeout(profileUrl, 6000, {
        headers: {
          "User-Agent": this.config.userAgent!,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
        },
      });
      if (response.ok) {
        const tempHtml = await response.text();
        // If LinkedIn redirected us to the login page, trigger cache fallback
        const lowerHtml = tempHtml.substring(0, 2000).toLowerCase();
        if (lowerHtml.includes("authwall") || lowerHtml.includes("sign-in") || lowerHtml.includes("join now")) {
          console.log("[LINKEDIN] Direct fetch returned login wall.");
        } else {
          html = tempHtml;
        }
      }
    } catch (err) {
      console.log("[LINKEDIN] Direct fetch failed (likely blocked with HTTP 999).");
    }

    // Google Cache fallback if direct fetch failed or returned a login page
    if (!html) {
      console.log("[LINKEDIN] Triggering Google cache fallback...");
      try {
        const cacheResp = await fetchWithTimeout(
          `https://webcache.googleusercontent.com/search?q=cache:linkedin.com/in/${username}`,
          6000,
          { headers: { "User-Agent": this.config.userAgent! } }
        );
        if (cacheResp.ok) {
          html = await cacheResp.text();
          console.log("[LINKEDIN] ✓ Google cache fetch successful.");
        }
      } catch (cacheErr) {
        console.error(`[LINKEDIN] Google cache fallback failed:`, cacheErr);
      }
    }

    // If fetch failed, return empty profile shell
    if (!html) {
      return {
        profileUrl: {
          value: profileUrl,
          source: "Connection Failure",
          acquisitionMethod: "PUBLIC_METADATA",
          confidence: 20,
          verificationStatus: "UNVERIFIED",
        },
        experiences: [],
        educations: [],
        skills: [],
      };
    }

    const source = "LinkedIn Public Profile HTML";
    const method = "PUBLIC_METADATA";
    const confidence = 85;
    const status = "UNVERIFIED";

    const wrap = <T>(val: T, conf = confidence, src = source): ForensicField<T> => ({
      value: val,
      source: src,
      acquisitionMethod: method,
      confidence: conf,
      verificationStatus: status,
    });

    // ── Layer 1: JSON-LD Extraction ──────────────────────────────────────────
    let jsonLdData: any = null;
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        try {
          const cleanJson = block.replace(/<script[^>]*>|<\/script>/gi, "").trim();
          const parsed = JSON.parse(cleanJson);
          
          // JSON-LD can be an object or an array of objects
          const elements = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
          const person = elements.find((el: any) => el["@type"] === "Person" || el["@type"] === "http://schema.org/Person");
          if (person) {
            jsonLdData = person;
            break;
          }
        } catch (e) {
          // Ignore parse errors on other script blocks
        }
      }
    }

    if (jsonLdData) {
      console.log("[LINKEDIN] ✓ Layer 1: JSON-LD extraction successful.");
      
      const fullName = jsonLdData.name || "";
      const headline = jsonLdData.jobTitle || "";
      const locationName = jsonLdData.address?.addressLocality || jsonLdData.address?.addressRegion || "";
      const avatarUrl = jsonLdData.image || "";
      const summary = jsonLdData.description || "";

      // Parse experiences from JSON-LD worksFor
      const experiences: LinkedinIntelligence["experiences"] = [];
      const worksFor = Array.isArray(jsonLdData.worksFor) ? jsonLdData.worksFor : jsonLdData.worksFor ? [jsonLdData.worksFor] : [];
      for (const job of worksFor) {
        const title = job.jobTitle || headline;
        const comp = job.name || job.companyName || "";
        if (comp) {
          experiences.push({
            title: wrap(title, 85, "JSON-LD worksFor"),
            company: wrap(comp, 85, "JSON-LD worksFor"),
          });
        }
      }

      // Parse educations from JSON-LD alumniOf
      const educations: LinkedinIntelligence["educations"] = [];
      const alumniOf = Array.isArray(jsonLdData.alumniOf) ? jsonLdData.alumniOf : jsonLdData.alumniOf ? [jsonLdData.alumniOf] : [];
      for (const edu of alumniOf) {
        const inst = edu.name || "";
        if (inst) {
          educations.push({
            institution: wrap(inst, 85, "JSON-LD alumniOf"),
          });
        }
      }

      return {
        fullName: wrap(fullName),
        headline: wrap(headline),
        location: wrap(locationName),
        avatarUrl: wrap(avatarUrl),
        profileUrl: wrap(profileUrl),
        currentRole: experiences[0] ? experiences[0].title : undefined,
        currentCompany: experiences[0] ? experiences[0].company : undefined,
        summary: wrap(summary),
        experiences,
        educations,
        skills: [],
      };
    }

    // ── Layer 2 & 3: OpenGraph & Meta Descriptions ───────────────────────────
    console.log("[LINKEDIN] Layer 1 failed. Running Layer 2 & 3 (OpenGraph & Meta)...");
    const ogTitle = matchRegex(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                    matchRegex(html, /<title[^>]*>([^<]+)<\/title>/i);
    const ogDesc = matchRegex(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                   matchRegex(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = matchRegex(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const canonicalUrl = matchRegex(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || profileUrl;

    let fullName = "";
    let headline = "";
    if (ogTitle) {
      // og:title is usually "[Name] - [Headline] | LinkedIn"
      const parts = ogTitle.split(/\s*[|–-]\s*/);
      fullName = parts[0]?.trim() || "";
      if (parts.length >= 2) {
        headline = parts[1]?.trim() || "";
      }
    }

    // Parse jobTitle/company from ogDesc
    let jobTitle = "";
    let company = "";
    if (ogDesc) {
      const atMatch = ogDesc.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|·\-]|$)/i);
      if (atMatch) {
        jobTitle = atMatch[1]?.trim() || "";
        company  = atMatch[2]?.trim() || "";
      }
    }

    // ── Layer 5: Visible Profile Blocks (HTML Selectors Parsing) ─────────────
    console.log("[LINKEDIN] Running Layer 5 (HTML selectors parsing)...");
    const experiences: LinkedinIntelligence["experiences"] = [];
    if (jobTitle && company) {
      experiences.push({
        title: wrap(jobTitle, 75, "OG Meta Title/Description"),
        company: wrap(company, 75, "OG Meta Title/Description"),
      });
    }

    // Extract visible experience items from HTML
    // Looking for items like <li class="experience-item"> or similar structures
    const expRegex = /<li[^>]*class=["'][^"']*experience-item[^"']*["']>([\s\S]*?)<\/li>/gi;
    let expMatch;
    while ((expMatch = expRegex.exec(html)) !== null) {
      const block = expMatch[1];
      const title = matchRegex(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i) || matchRegex(block, /class=["'][^"']*experience-item__title[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const comp = matchRegex(block, /<h4[^>]*>([\s\S]*?)<\/h4>/i) || matchRegex(block, /class=["'][^"']*experience-item__subtitle[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const dur = matchRegex(block, /class=["'][^"']*date-range[^"']*["'][^>]*>([\s\S]*?)<\//i);

      if (title && comp) {
        experiences.push({
          title: wrap(title.replace(/<[^>]+>/g, "").trim(), 70, "HTML Selector (Experience)"),
          company: wrap(comp.replace(/<[^>]+>/g, "").trim(), 70, "HTML Selector (Experience)"),
          duration: dur ? wrap(dur.replace(/<[^>]+>/g, "").trim(), 70, "HTML Selector (Experience)") : undefined,
        });
      }
    }

    const educations: LinkedinIntelligence["educations"] = [];
    // Extract visible education items
    const eduRegex = /<li[^>]*class=["'][^"']*education__list-item[^"']*["']>([\s\S]*?)<\/li>/gi;
    let eduMatch;
    while ((eduMatch = eduRegex.exec(html)) !== null) {
      const block = eduMatch[1];
      const inst = matchRegex(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i) || matchRegex(block, /class=["'][^"']*education__school-name[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const deg = matchRegex(block, /class=["'][^"']*education__degree-single[^"']*["'][^>]*>([\s\S]*?)<\//i);

      if (inst) {
        educations.push({
          institution: wrap(inst.replace(/<[^>]+>/g, "").trim(), 70, "HTML Selector (Education)"),
          degree: deg ? wrap(deg.replace(/<[^>]+>/g, "").trim(), 70, "HTML Selector (Education)") : undefined,
        });
      }
    }

    // ── Layer 6: Regex Fallback ──────────────────────────────────────────────
    if (experiences.length === 0) {
      console.log("[LINKEDIN] Running Layer 6 (Regex fallback)...");
      // Try a general regex to find experience keywords in the text
      const workMatch = html.match(/(?:working as|employed as|position of)\s+([^,.]+?)\s+at\s+([^,.]+?)(?:\s+since|\s+from|\s+in|\.|$)/i);
      if (workMatch && workMatch[1] && workMatch[2]) {
        experiences.push({
          title: wrap(workMatch[1].trim(), 60, "Regex Fallback"),
          company: wrap(workMatch[2].trim(), 60, "Regex Fallback"),
        });
      }
    }

    return {
      fullName: wrap(fullName || username, 75, "OG Meta Title"),
      headline: wrap(headline || "Public LinkedIn Profile", 70, "OG Meta Title"),
      avatarUrl: ogImage ? wrap(ogImage, 80, "OG Image Tag") : undefined,
      profileUrl: wrap(canonicalUrl, 85, "Canonical Link Tag"),
      currentRole: experiences[0] ? experiences[0].title : undefined,
      currentCompany: experiences[0] ? experiences[0].company : undefined,
      summary: ogDesc ? wrap(ogDesc, 70, "OG Description Tag") : undefined,
      experiences,
      educations,
      skills: [],
    };
  }

  private async fetchProfileViaSearch(username: string): Promise<LinkedinIntelligence | null> {
    const profileUrl = `https://www.linkedin.com/in/${username}`;
    const cleanUsername = username.replace(/^in\//, "").replace(/\/$/, "").trim();
    
    const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(`site:linkedin.com/in/${cleanUsername}`)}`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in/${cleanUsername}`)}`;
    
    let html = "";
    let searchEngine = "";
    
    try {
      console.log(`[LINKEDIN] Fetching index via Yahoo Search dork...`);
      const resp = await fetchWithTimeout(yahooUrl, 6000, {
        headers: {
          "User-Agent": this.config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (resp.ok) {
        html = await resp.text();
        searchEngine = "yahoo";
      }
    } catch (err) {
      console.error(`[LINKEDIN] Yahoo Search dork failed:`, err);
    }
    
    if (!html) {
      try {
        console.log(`[LINKEDIN] Fetching index via Bing Search dork...`);
        const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:linkedin.com/in/${cleanUsername}`)}`;
        const resp = await fetchWithTimeout(bingUrl, 6000, {
          headers: {
            "User-Agent": this.config.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (resp.ok) {
          html = await resp.text();
          searchEngine = "bing";
        }
      } catch (err) {
        console.error(`[LINKEDIN] Bing Search dork failed:`, err);
      }
    }
    
    if (!html) {
      return null;
    }
    
    let title = "";
    let snippet = "";
    
    if (searchEngine === "yahoo") {
      const blocks = html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi);
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const blockLower = block.toLowerCase();
        if (blockLower.includes(`linkedin.com/in/${cleanUsername.toLowerCase()}`) || blockLower.includes(`linkedin.com%2fin%2f${cleanUsername.toLowerCase()}`)) {
          const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
          if (h3Match) {
            title = h3Match[1].replace(/<[^>]+>/g, '').trim();
          }
          const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || 
                               block.match(/<p[^>]*class="[^"]*lh-16[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                               block.match(/<span[^>]*class="[^"]*compDscr[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          if (snippetMatch) {
            snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
          }
          break;
        }
      }
    } else if (searchEngine === "bing") {
      const blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const blockLower = block.toLowerCase();
        if (blockLower.includes(`linkedin.com/in/${cleanUsername.toLowerCase()}`) || blockLower.includes(`linkedin.com%2fin%2f${cleanUsername.toLowerCase()}`)) {
          const h2Match = block.match(/<h2><a[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          if (h2Match) {
            title = h2Match[1].replace(/<[^>]+>/g, '').trim();
          }
          
          const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || 
                               block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (snippetMatch) {
            snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
          }
          break;
        }
      }
    }
    
    if (!title && !snippet) {
      console.log(`[LINKEDIN] Username-specific block not found. Trying fallback result block parsing...`);
      if (searchEngine === "yahoo") {
        const block = html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi)[1];
        if (block) {
          const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
          if (h3Match) title = h3Match[1].replace(/<[^>]+>/g, '').trim();
          const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || 
                               block.match(/<p[^>]*class="[^"]*lh-16[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
          if (snippetMatch) snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
        }
      } else if (searchEngine === "google") {
        const block = html.split(/<div[^>]*class="[^"]*(?<![a-zA-Z0-9-])g(?![a-zA-Z0-9-])[^"]*"/gi)[1] ||
                      html.split(/<div[^>]*class="[^"]*MjjYud[^"]*"/gi)[1];
        if (block) {
          const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
          if (h3Match) title = h3Match[1].replace(/<[^>]+>/g, '').trim();
          
          if (!title) {
            const bneaweTitle = block.match(/<div[^>]*class="[^"]*BNeawe[^"]*vvP5r[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                                block.match(/<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (bneaweTitle) title = bneaweTitle[1].replace(/<[^>]+>/g, '').trim();
          }
          
          const snippetMatch = block.match(/<div[^>]*class="[^"]*(?:VwiC3b|yD3Yfe)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (snippetMatch) {
            snippet = snippetMatch[1].replace(/<[^>]+>/g, '').trim();
          } else {
            const bneaweSnippet = block.match(/<div[^>]*class="[^"]*BNeawe\s+s3v9rd[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (bneaweSnippet) snippet = bneaweSnippet[1].replace(/<[^>]+>/g, '').trim();
          }
        }
      }
    }
    
    if (!title && !snippet) {
      console.log(`[LINKEDIN] Direct dork parsing resolved no results.`);
      return null;
    }
    
    const source = `LinkedIn Public Search Index (${searchEngine.toUpperCase()})`;
    const method = "PUBLIC_METADATA";
    const confidence = 85;
    const status = "UNVERIFIED";
    
    const wrap = <T>(val: T, conf = confidence, src = source): ForensicField<T> => ({
      value: val,
      source: src,
      acquisitionMethod: method,
      confidence: conf,
      verificationStatus: status,
    });
    
    let fullName = cleanUsername;
    let headline = "LinkedIn Professional Profile";
    
    if (title) {
      const parts = title.split(/\s*[|–·•\-]\s*/);
      if (parts[0]) fullName = parts[0].trim();
      if (parts[1]) headline = parts[1].trim();
      if (headline.toLowerCase() === "linkedin") {
        headline = "LinkedIn Professional Profile";
      }
    }
    
    let summary = snippet || "Public LinkedIn profile confirmed via search index.";
    let locationName = "Not provided";
    let currentRole = headline;
    let currentCompany = "Not provided";
    
    const experiences: any[] = [];
    const educations: any[] = [];
    
    if (snippet) {
      const locMatch = snippet.match(/Location:\s*([^·\n|]+)/i);
      if (locMatch) locationName = locMatch[1].trim();
      
      const eduMatch = snippet.match(/Education:\s*([^·\n|]+)/i);
      if (eduMatch) {
        const school = eduMatch[1].replace(/&middot;/g, '').trim();
        if (school) {
          educations.push({
            institution: wrap(school),
            degree: wrap("Public Academic Record"),
            duration: wrap("Sourced via Search Index"),
          });
        }
      }
      
      const expMatch = snippet.match(/Experience:\s*([^·\n|]+)/i);
      if (expMatch) {
        const expText = expMatch[1].replace(/&middot;/g, '').trim();
        const atParts = expText.split(/\s+(?:at|@)\s+/i);
        const role = atParts[0]?.trim() || "Professional Role";
        const comp = atParts[1]?.trim() || expText;
        experiences.push({
          title: wrap(role),
          company: wrap(comp),
          duration: wrap("Sourced via Search Index"),
        });
        currentRole = role;
        currentCompany = comp;
      }
    }
    
    if (experiences.length === 0 && headline.toLowerCase().includes(" at ")) {
      const atParts = headline.split(/\s+at\s+/i);
      if (atParts[0] && atParts[1]) {
        currentRole = atParts[0].trim();
        currentCompany = atParts[1].trim();
        experiences.push({
          title: wrap(currentRole),
          company: wrap(currentCompany),
          duration: wrap("Sourced via Search Index"),
        });
      }
    }
    
    console.log(`[LINKEDIN] ✓ Successfully reconstructed profile for "${cleanUsername}" via dork: name="${fullName}", headline="${headline}"`);
    
    return {
      fullName: wrap(fullName),
      headline: wrap(headline),
      location: wrap(locationName),
      profileUrl: wrap(profileUrl),
      avatarUrl: wrap(`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fullName)}`),
      currentRole: currentRole ? wrap(currentRole) : undefined,
      currentCompany: currentCompany !== "Not provided" ? wrap(currentCompany) : undefined,
      summary: wrap(summary),
      experiences,
      educations,
      skills: [],
    };
  }
}
