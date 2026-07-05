import { LinkedinIntelligence, ForensicField, SearchEngineEvidence, DetailedSource } from "../types";
import { getDemoLinkedinData } from "../mock/demoData";
import { fetchWithTimeout } from "../utils";

export interface SearchResult {
  engine: "bing" | "ddg" | "yahoo" | "wayback";
  url: string;
  title: string;
  snippet: string;
  cachedCompany?: string;
  cachedHeadline?: string;
  cachedLocation?: string;
}

// Helper to extract a substring using regex
function matchRegex(text: string, regex: RegExp, index = 1): string | null {
  const match = text.match(regex);
  return match && match[index] ? match[index].trim() : null;
}

export class LinkedInPublicSearchProvider {
  private static cache = new Map<string, any>();
  private userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  /**
   * Main entry point to perform multi-engine search and fetch profile
   */
  public async fetchProfile(username: string): Promise<LinkedinIntelligence | null> {
    const cleanUsername = username.replace(/^in\//, "").replace(/\/$/, "").trim();
    const cacheKey = cleanUsername.toLowerCase();
    if (LinkedInPublicSearchProvider.cache.has(cacheKey)) {
      console.log(`[LINKEDIN-SEARCH] ✓ Cache hit for "${cleanUsername}" - skipping search engine queries.`);
      return LinkedInPublicSearchProvider.cache.get(cacheKey);
    }

    const results: SearchResult[] = [];
    const logs: SearchEngineEvidence[] = [];

    const bingQuery = `site:linkedin.com/in/${cleanUsername}`;
    const ddgQuery = `https://html.duckduckgo.com/html/?q=site:linkedin.com/in/${cleanUsername}`;
    const yahooQuery = `site:linkedin.com/in/${cleanUsername}`;
    const waybackQuery = `https://web.archive.org/cdx/search/cdx?url=linkedin.com/in/${cleanUsername}`;

    const bingStart = Date.now();
    const ddgStart = Date.now();
    const yahooStart = Date.now();
    const waybackStart = Date.now();

    // ── Concurrently fetch all search sources ──
    const [bingRes, ddgRes, yahooRes, waybackRes] = await Promise.all([
      this.queryBing(cleanUsername).catch(e => { console.warn(`[LINKEDIN-SEARCH] Bing query offline: ${e.message || e}`); return null; }),
      this.queryDDG(cleanUsername).catch(e => { console.warn(`[LINKEDIN-SEARCH] DDG query offline: ${e.message || e}`); return null; }),
      this.queryYahoo(cleanUsername).catch(e => { console.warn(`[LINKEDIN-SEARCH] Yahoo query offline: ${e.message || e}`); return null; }),
      this.queryWaybackCDX(cleanUsername).catch(e => { console.warn(`[LINKEDIN-SEARCH] Wayback CDX offline: ${e.message || e}`); return null; })
    ]);

    const bingDuration = Date.now() - bingStart;
    const ddgDuration = Date.now() - ddgStart;
    const yahooDuration = Date.now() - yahooStart;
    const waybackDuration = Date.now() - waybackStart;

    if (bingRes) {
      results.push(bingRes);
    }
    logs.push({
      engine: "Bing",
      query: bingQuery,
      searchedAt: new Date().toISOString(),
      success: !!bingRes,
      responseTimeMs: bingDuration,
      profileUrl: bingRes?.url,
      title: bingRes?.title,
      snippet: bingRes?.snippet,
      fieldsExtracted: bingRes ? this.getExtractedFieldsList(bingRes) : [],
      confidence: bingRes ? 80 : 0,
      rawSource: bingRes ? `Bing search query result title: "${bingRes.title}" and snippet: "${bingRes.snippet}"` : undefined
    });

    if (ddgRes) {
      results.push(ddgRes);
    }
    logs.push({
      engine: "DuckDuckGo",
      query: ddgQuery,
      searchedAt: new Date().toISOString(),
      success: !!ddgRes,
      responseTimeMs: ddgDuration,
      profileUrl: ddgRes?.url,
      title: ddgRes?.title,
      snippet: ddgRes?.snippet,
      fieldsExtracted: ddgRes ? this.getExtractedFieldsList(ddgRes) : [],
      confidence: ddgRes ? 75 : 0,
      rawSource: ddgRes ? `DDG search HTML title: "${ddgRes.title}" and snippet: "${ddgRes.snippet}"` : undefined
    });

    if (yahooRes) {
      results.push(yahooRes);
    }
    logs.push({
      engine: "Yahoo",
      query: yahooQuery,
      searchedAt: new Date().toISOString(),
      success: !!yahooRes,
      responseTimeMs: yahooDuration,
      profileUrl: yahooRes?.url,
      title: yahooRes?.title,
      snippet: yahooRes?.snippet,
      fieldsExtracted: yahooRes ? this.getExtractedFieldsList(yahooRes) : [],
      confidence: yahooRes ? 70 : 0,
      rawSource: yahooRes ? `Yahoo search page title: "${yahooRes.title}" and snippet: "${yahooRes.snippet}"` : undefined
    });

    let waybackHtml = "";
    if (waybackRes) {
      results.push(waybackRes.result);
      waybackHtml = waybackRes.html;
    }
    logs.push({
      engine: "Wayback",
      query: waybackQuery,
      searchedAt: new Date().toISOString(),
      success: !!waybackRes,
      responseTimeMs: waybackDuration,
      profileUrl: waybackRes?.result.url,
      title: waybackRes?.result.title,
      snippet: waybackRes?.result.snippet,
      fieldsExtracted: waybackRes ? this.getExtractedFieldsList(waybackRes.result, waybackHtml) : [],
      confidence: waybackRes ? 90 : 0,
      rawSource: waybackRes ? `Wayback Machine CDX timestamp ${waybackRes.timestamp}. Raw snapshot HTML size: ${waybackHtml.length} bytes.` : undefined
    });

    if (results.length === 0) {
      return null;
    }


    // Merge search engine cache results
    const merged = await this.mergeResults(cleanUsername, results, waybackHtml);
    if (merged) {
      merged.acquisitionLogs = logs;
      
      // Build the merge matrix
      const matrix: Record<string, Record<string, "Found" | "Partial" | "Unavailable">> = {};
      const fields = ["name", "headline", "company", "location", "education"];
      for (const f of fields) {
        matrix[f] = {};
        for (const log of logs) {
          const engKey = log.engine === "DuckDuckGo" ? "ddg" : log.engine.toLowerCase();
          if (log.success && log.fieldsExtracted.includes(f)) {
            matrix[f][engKey] = "Found";
          } else if (log.success && f === "company" && log.engine === "Bing" && (log.title || log.snippet)?.toLowerCase().includes("at")) {
            matrix[f][engKey] = "Partial";
          } else {
            matrix[f][engKey] = "Unavailable";
          }
        }
      }
      merged.mergeMatrix = matrix;
    }
    LinkedInPublicSearchProvider.cache.set(cacheKey, merged);
    return merged;
  }

  /**
   * Helper to identify fields extracted by search engine
   */
  private getExtractedFieldsList(res: SearchResult, waybackHtml?: string): string[] {
    const fields: string[] = ["profileurl"];
    if (res.title) {
      fields.push("name");
      const parts = res.title.split(/\s*[|–·•\-]\s*/);
      if (parts.length >= 2) fields.push("headline");
    }
    if (res.cachedCompany || (res.snippet && (res.snippet.toLowerCase().includes("experience:") || res.snippet.toLowerCase().includes("at")))) {
      fields.push("company");
    }
    if (res.cachedLocation || (res.snippet && res.snippet.toLowerCase().includes("location:"))) {
      fields.push("location");
    }
    if (res.snippet && res.snippet.toLowerCase().includes("education:")) {
      fields.push("education");
    }
    if (res.engine === "wayback" && waybackHtml) {
      const parsed = this.parseArchivedHtml(waybackHtml, "");
      if (parsed.fullName?.value) fields.push("name");
      if (parsed.headline?.value) fields.push("headline");
      if (parsed.location?.value) fields.push("location");
      if (parsed.experiences && parsed.experiences.length > 0) fields.push("company");
      if (parsed.educations && parsed.educations.length > 0) fields.push("education");
    }
    return [...new Set(fields)].map(f => f.toLowerCase());
  }

  /**
   * Queries Bing for the LinkedIn profile
   */
  private async queryBing(username: string): Promise<SearchResult | null> {
    const url = `https://www.bing.com/search?q=site:linkedin.com/in/${username}`;
    const resp = await fetchWithTimeout(url, 6000, { headers: { "User-Agent": this.userAgent } });
    if (!resp.ok) return null;

    const html = await resp.text();
    const blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);
    
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const blockLower = block.toLowerCase();
      if (blockLower.includes(`linkedin.com/in/${username.toLowerCase()}`) || blockLower.includes(`linkedin.com%2fin%2f${username.toLowerCase()}`)) {
        const h2Match = block.match(/<h2><a[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        const title = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : "";

        const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || 
                             block.match(/<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        const hrefMatch = block.match(/href="([^"]*)"/i);
        const profileUrl = hrefMatch ? hrefMatch[1] : `https://www.linkedin.com/in/${username}`;

        // Parse visible attributes from snippet
        let cachedCompany = "";
        let cachedHeadline = "";
        let cachedLocation = "";

        const compMatch = snippet.match(/(?:works at|employed at|company:)\s*([^·\n|]+)/i);
        if (compMatch) cachedCompany = compMatch[1].trim();

        const locMatch = snippet.match(/(?:location:)\s*([^·\n|]+)/i) || snippet.match(/(?:Bengaluru|Delhi|Mumbai|Pune|California|London|New York)/i);
        if (locMatch) cachedLocation = locMatch[0].trim();

        return {
          engine: "bing",
          url: profileUrl,
          title,
          snippet,
          cachedCompany,
          cachedHeadline,
          cachedLocation,
        };
      }
    }
    return null;
  }

  /**
   * Queries DuckDuckGo HTML-only version
   */
  private async queryDDG(username: string): Promise<SearchResult | null> {
    const url = `https://html.duckduckgo.com/html/?q=site:linkedin.com/in/${username}`;
    const resp = await fetchWithTimeout(url, 6000, { headers: { "User-Agent": this.userAgent } });
    if (!resp.ok) return null;

    const html = await resp.text();
    const blocks = html.split(/<div[^>]*class="[^"]*result[^"]*"/gi);

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const blockLower = block.toLowerCase();
      if (blockLower.includes(`linkedin.com/in/${username.toLowerCase()}`) || blockLower.includes(`linkedin.com%2fin%2f${username.toLowerCase()}`)) {
        const titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || 
                             block.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        const hrefMatch = block.match(/href="([^"]*)"/i);
        const profileUrl = hrefMatch ? hrefMatch[1] : `https://www.linkedin.com/in/${username}`;

        return {
          engine: "ddg",
          url: profileUrl,
          title,
          snippet,
        };
      }
    }
    return null;
  }

  /**
   * Queries Yahoo Search dorks
   */
  private async queryYahoo(username: string): Promise<SearchResult | null> {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(`site:linkedin.com/in/${username}`)}`;
    const resp = await fetchWithTimeout(url, 6000, { headers: { "User-Agent": this.userAgent } });
    if (!resp.ok) return null;

    const html = await resp.text();
    const blocks = html.split(/<div[^>]*class="[^"]*algo[^"]*"/gi);

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const blockLower = block.toLowerCase();
      if (blockLower.includes(`linkedin.com/in/${username.toLowerCase()}`) || blockLower.includes(`linkedin.com%2fin%2f${username.toLowerCase()}`)) {
        const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        const title = h3Match ? h3Match[1].replace(/<[^>]+>/g, '').trim() : "";

        const snippetMatch = block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || 
                             block.match(/<p[^>]*class="[^"]*lh-16[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                             block.match(/<span[^>]*class="[^"]*compDscr[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        const hrefMatch = block.match(/href="([^"]*)"/i);
        const profileUrl = hrefMatch ? hrefMatch[1] : `https://www.linkedin.com/in/${username}`;

        return {
          engine: "yahoo",
          url: profileUrl,
          title,
          snippet,
        };
      }
    }
    return null;
  }

  /**
   * Queries Wayback Machine CDX API and fetches archived HTML
   */
  private async queryWaybackCDX(username: string): Promise<{ result: SearchResult; html: string; timestamp: string } | null> {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=linkedin.com/in/${username}&output=json&limit=3`;
    const cdxResp = await fetchWithTimeout(cdxUrl, 6000, { headers: { "User-Agent": this.userAgent } });
    if (!cdxResp.ok) return null;

    const snapshots = await cdxResp.json();
    if (!Array.isArray(snapshots) || snapshots.length <= 1) return null;

    let latestSnapshot: string[] | null = null;
    for (let i = snapshots.length - 1; i >= 1; i--) {
      const row = snapshots[i];
      if (row[4] === "200" && row[3] === "text/html") {
        latestSnapshot = row;
        break;
      }
    }

    if (!latestSnapshot) return null;

    const timestamp = latestSnapshot[1];
    const originalUrl = latestSnapshot[2];
    const waybackRawUrl = `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;

    const rawResp = await fetchWithTimeout(waybackRawUrl, 8000, { headers: { "User-Agent": this.userAgent } });
    if (!rawResp.ok) return null;

    const html = await rawResp.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : `${username} - LinkedIn Profile`;
    const snippetMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const snippet = snippetMatch ? snippetMatch[1].trim() : "Archived profile snapshot retrieved.";

    return {
      result: {
        engine: "wayback",
        url: originalUrl,
        title,
        snippet,
      },
      html,
      timestamp,
    };
  }

  /**
   * Extract LinkedIn fields from archived HTML using hierarchical selectors
   */
  private parseArchivedHtml(html: string, username: string): Partial<LinkedinIntelligence> {
    const parsed: Partial<LinkedinIntelligence> = {};
    const source = "Wayback Machine HTML Archive";
    const method = "PUBLIC_METADATA";
    const confidence = 90;
    const status = "UNVERIFIED";

    const wrap = <T>(val: T, conf = confidence, src = source): ForensicField<T> => ({
      value: val,
      source: src,
      acquisitionMethod: method,
      confidence: conf,
      verificationStatus: status,
    });

    // ── Layer 1: JSON-LD ──
    let jsonLdData: any = null;
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        try {
          const cleanJson = block.replace(/<script[^>]*>|<\/script>/gi, "").trim();
          const parsedJson = JSON.parse(cleanJson);
          const elements = Array.isArray(parsedJson) ? parsedJson : parsedJson["@graph"] ? parsedJson["@graph"] : [parsedJson];
          const person = elements.find((el: any) => el["@type"] === "Person" || el["@type"] === "http://schema.org/Person");
          if (person) {
            jsonLdData = person;
            break;
          }
        } catch {}
      }
    }

    if (jsonLdData) {
      parsed.fullName = wrap(jsonLdData.name || "");
      parsed.headline = wrap(jsonLdData.jobTitle || "");
      parsed.location = wrap(jsonLdData.address?.addressLocality || jsonLdData.address?.addressRegion || "");
      parsed.avatarUrl = wrap(jsonLdData.image || "");
      parsed.summary = wrap(jsonLdData.description || "");

      const experiences: LinkedinIntelligence["experiences"] = [];
      const worksFor = Array.isArray(jsonLdData.worksFor) ? jsonLdData.worksFor : jsonLdData.worksFor ? [jsonLdData.worksFor] : [];
      for (const job of worksFor) {
        const title = job.jobTitle || parsed.headline?.value;
        const comp = job.name || job.companyName || "";
        if (comp) {
          experiences.push({
            title: wrap(title, 90, "JSON-LD worksFor"),
            company: wrap(comp, 90, "JSON-LD worksFor"),
          });
        }
      }
      parsed.experiences = experiences;

      const educations: LinkedinIntelligence["educations"] = [];
      const alumniOf = Array.isArray(jsonLdData.alumniOf) ? jsonLdData.alumniOf : jsonLdData.alumniOf ? [jsonLdData.alumniOf] : [];
      for (const edu of alumniOf) {
        const inst = edu.name || "";
        if (inst) {
          educations.push({
            institution: wrap(inst, 90, "JSON-LD alumniOf"),
          });
        }
      }
      parsed.educations = educations;
      return parsed;
    }

    // ── Layer 2 & 3: OpenGraph & Meta Descriptions ──
    const ogTitle = matchRegex(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                    matchRegex(html, /<title[^>]*>([^<]+)<\/title>/i);
    const ogDesc = matchRegex(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                   matchRegex(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = matchRegex(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const canonicalUrl = matchRegex(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || `https://www.linkedin.com/in/${username}`;

    let fullName = "";
    let headline = "";
    if (ogTitle) {
      const parts = ogTitle.split(/\s*[|–·•\-]\s*/);
      fullName = parts[0]?.trim() || "";
      if (parts.length >= 2) {
        headline = parts[1]?.trim() || "";
      }
    }

    let jobTitle = "";
    let company = "";
    if (ogDesc) {
      const atMatch = ogDesc.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|·\-]|$)/i);
      if (atMatch) {
        jobTitle = atMatch[1]?.trim() || "";
        company = atMatch[2]?.trim() || "";
      }
    }

    // ── Layer 5: Visible HTML Parsing ──
    const experiences: LinkedinIntelligence["experiences"] = [];
    if (jobTitle && company) {
      experiences.push({
        title: wrap(jobTitle, 80, "OG Meta Title/Description"),
        company: wrap(company, 80, "OG Meta Title/Description"),
      });
    }

    const expRegex = /<li[^>]*class=["'][^"']*experience-item[^"']*["']>([\s\S]*?)<\/li>/gi;
    let expMatch;
    while ((expMatch = expRegex.exec(html)) !== null) {
      const block = expMatch[1];
      const title = matchRegex(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i) || matchRegex(block, /class=["'][^"']*experience-item__title[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const comp = matchRegex(block, /<h4[^>]*>([\s\S]*?)<\/h4>/i) || matchRegex(block, /class=["'][^"']*experience-item__subtitle[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const dur = matchRegex(block, /class=["'][^"']*date-range[^"']*["'][^>]*>([\s\S]*?)<\//i);

      if (title && comp) {
        experiences.push({
          title: wrap(title.replace(/<[^>]+>/g, "").trim(), 80, "HTML Selector (Experience)"),
          company: wrap(comp.replace(/<[^>]+>/g, "").trim(), 80, "HTML Selector (Experience)"),
          duration: dur ? wrap(dur.replace(/<[^>]+>/g, "").trim(), 80, "HTML Selector (Experience)") : undefined,
        });
      }
    }

    const educations: LinkedinIntelligence["educations"] = [];
    const eduRegex = /<li[^>]*class=["'][^"']*education__list-item[^"']*["']>([\s\S]*?)<\/li>/gi;
    let eduMatch;
    while ((eduMatch = eduRegex.exec(html)) !== null) {
      const block = eduMatch[1];
      const inst = matchRegex(block, /<h3[^>]*>([\s\S]*?)<\/h3>/i) || matchRegex(block, /class=["'][^"']*education__school-name[^"']*["'][^>]*>([\s\S]*?)<\//i);
      const deg = matchRegex(block, /class=["'][^"']*education__degree-single[^"']*["'][^>]*>([\s\S]*?)<\//i);

      if (inst) {
        educations.push({
          institution: wrap(inst.replace(/<[^>]+>/g, "").trim(), 80, "HTML Selector (Education)"),
          degree: deg ? wrap(deg.replace(/<[^>]+>/g, "").trim(), 80, "HTML Selector (Education)") : undefined,
        });
      }
    }

    // ── Layer 6: Regex Fallback ──
    if (experiences.length === 0) {
      const workMatch = html.match(/(?:working as|employed as|position of)\s+([^,.]+?)\s+at\s+([^,.]+?)(?:\s+since|\s+from|\s+in|\.|$)/i);
      if (workMatch && workMatch[1] && workMatch[2]) {
        experiences.push({
          title: wrap(workMatch[1].trim(), 70, "Regex Fallback"),
          company: wrap(workMatch[2].trim(), 70, "Regex Fallback"),
        });
      }
    }

    return {
      fullName: wrap(fullName || username, 80, "OG Meta Title"),
      headline: wrap(headline || "Public LinkedIn Profile", 80, "OG Meta Title"),
      avatarUrl: ogImage ? wrap(ogImage, 85, "OG Image Tag") : undefined,
      profileUrl: wrap(canonicalUrl, 90, "Canonical Link Tag"),
      currentRole: experiences[0] ? experiences[0].title : undefined,
      currentCompany: experiences[0] ? experiences[0].company : undefined,
      summary: ogDesc ? wrap(ogDesc, 75, "OG Description Tag") : undefined,
      experiences,
      educations,
      skills: [],
    };
  }

  /**
   * Dynamic multi-source merging with verification and confidence boosting
   */
  private async mergeResults(username: string, results: SearchResult[], waybackHtml: string): Promise<LinkedinIntelligence> {
    const bing = results.find(r => r.engine === "bing");
    const ddg = results.find(r => r.engine === "ddg");
    const yahoo = results.find(r => r.engine === "yahoo");
    const wayback = results.find(r => r.engine === "wayback");

    const engineNames = results.map(r => r.engine);
    const hasWayback = engineNames.includes("wayback");

    let waybackParsed: Partial<LinkedinIntelligence> = {};
    if (waybackHtml) {
      waybackParsed = this.parseArchivedHtml(waybackHtml, username);
    }

    // Helper to extract fields from SearchResult
    const parseSearchEngineFields = (res?: SearchResult) => {
      if (!res) return { name: "", headline: "", company: "", location: "" };
      let name = "";
      let headline = "";
      if (res.title) {
        const parts = res.title.split(/\s*[|–·•\-]\s*/);
        name = parts[0]?.trim() || "";
        if (parts[1] && parts[1].toLowerCase() !== "linkedin") {
          headline = parts[1].trim();
        }
      }
      
      let company = res.cachedCompany || "";
      if (!company && res.snippet) {
        const expMatch = res.snippet.match(/(?:Experience|Works at|Role):\s*([^·\n|]+)/i);
        if (expMatch) {
          const expText = expMatch[1].replace(/&middot;/g, '').trim();
          const atParts = expText.split(/\s+(?:at|@)\s+/i);
          company = atParts[1]?.trim() || expText;
        }
      }

      let location = res.cachedLocation || "";
      if (!location && res.snippet) {
        const locMatch = res.snippet.match(/Location:\s*([^·\n|]+)/i) || res.snippet.match(/(?:Bengaluru|Delhi|Mumbai|Pune|California|London|New York)/i);
        if (locMatch) location = locMatch[0].trim();
      }

      return { name, headline, company, location };
    };

    const bingFields = parseSearchEngineFields(bing);
    const ddgFields = parseSearchEngineFields(ddg);
    const yahooFields = parseSearchEngineFields(yahoo);

    const waybackName = waybackParsed.fullName?.value || "";
    const waybackHeadline = waybackParsed.headline?.value || "";
    const waybackCompany = waybackParsed.currentCompany?.value || "";
    const waybackLocation = waybackParsed.location?.value || "";

    // ── Build Sources Lists ──
    const fullNameSources: any[] = [];
    if (bingFields.name) fullNameSources.push({ engine: "Bing", confidence: 85, value: bingFields.name });
    if (ddgFields.name) fullNameSources.push({ engine: "DuckDuckGo", confidence: 80, value: ddgFields.name });
    if (yahooFields.name) fullNameSources.push({ engine: "Yahoo", confidence: 75, value: yahooFields.name });
    if (waybackName) fullNameSources.push({ engine: "Wayback", confidence: 90, value: waybackName });

    const headlineSources: any[] = [];
    if (bingFields.headline) headlineSources.push({ engine: "Bing", confidence: 85, value: bingFields.headline });
    if (ddgFields.headline) headlineSources.push({ engine: "DuckDuckGo", confidence: 80, value: ddgFields.headline });
    if (yahooFields.headline) headlineSources.push({ engine: "Yahoo", confidence: 75, value: yahooFields.headline });
    if (waybackHeadline) headlineSources.push({ engine: "Wayback", confidence: 90, value: waybackHeadline });

    const companySources: any[] = [];
    if (bingFields.company) companySources.push({ engine: "Bing", confidence: 85, value: bingFields.company });
    if (ddgFields.company) companySources.push({ engine: "DuckDuckGo", confidence: 80, value: ddgFields.company });
    if (yahooFields.company) companySources.push({ engine: "Yahoo", confidence: 75, value: yahooFields.company });
    if (waybackCompany) companySources.push({ engine: "Wayback", confidence: 90, value: waybackCompany });

    const locationSources: any[] = [];
    if (bingFields.location) locationSources.push({ engine: "Bing", confidence: 85, value: bingFields.location });
    if (ddgFields.location) locationSources.push({ engine: "DuckDuckGo", confidence: 80, value: ddgFields.location });
    if (yahooFields.location) locationSources.push({ engine: "Yahoo", confidence: 75, value: yahooFields.location });
    if (waybackLocation) locationSources.push({ engine: "Wayback", confidence: 90, value: waybackLocation });

    const summarySources: any[] = [];
    if (bing?.snippet) summarySources.push({ engine: "Bing", confidence: 80, value: bing.snippet });
    if (ddg?.snippet) summarySources.push({ engine: "DuckDuckGo", confidence: 75, value: ddg.snippet });
    if (yahoo?.snippet) summarySources.push({ engine: "Yahoo", confidence: 70, value: yahoo.snippet });
    if (waybackParsed.summary?.value) summarySources.push({ engine: "Wayback", confidence: 90, value: waybackParsed.summary.value });

    const profileUrlSources: any[] = [];
    if (bing?.url) profileUrlSources.push({ engine: "Bing", confidence: 95, value: bing.url });
    if (ddg?.url) profileUrlSources.push({ engine: "DuckDuckGo", confidence: 95, value: ddg.url });
    if (yahoo?.url) profileUrlSources.push({ engine: "Yahoo", confidence: 95, value: yahoo.url });
    if (wayback?.url) profileUrlSources.push({ engine: "Wayback", confidence: 95, value: wayback.url });

    // Merged Values selection
    const resolvedName = waybackName || bingFields.name || ddgFields.name || yahooFields.name || username;
    const resolvedHeadline = waybackHeadline || bingFields.headline || ddgFields.headline || yahooFields.headline || "LinkedIn Professional Profile";
    const resolvedCompany = waybackCompany || bingFields.company || ddgFields.company || yahooFields.company || "";
    const resolvedLocation = waybackLocation || bingFields.location || ddgFields.location || yahooFields.location || "Not Provided";
    const resolvedSummary = waybackParsed.summary?.value || bing?.snippet || ddg?.snippet || yahoo?.snippet || "Public LinkedIn profile confirmed via search index.";
    const resolvedProfileUrl = wayback?.url || bing?.url || ddg?.url || yahoo?.url || `https://www.linkedin.com/in/${username}`;
    const resolvedAvatarUrl = waybackParsed.avatarUrl?.value || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(resolvedName)}`;

    // Wrap Helper
    const wrapWithSources = <T>(
      val: T,
      sourcesList: { engine: "Bing" | "DuckDuckGo" | "Yahoo" | "Wayback"; confidence: number; value: string }[],
      defaultConf = 70,
      defaultSrc = "Search Engine Index"
    ): ForensicField<T> => {
      let finalConfidence = defaultConf;
      const engines = sourcesList.map(s => s.engine);
      const uniqueEnginesCount = new Set(engines).size;

      if (uniqueEnginesCount >= 2) {
        finalConfidence = Math.min(98, defaultConf + uniqueEnginesCount * 8);
      } else if (uniqueEnginesCount === 1) {
        finalConfidence = Math.max(50, defaultConf - 15);
      } else {
        finalConfidence = 40;
      }

      const detailedSources: DetailedSource[] = sourcesList.map(s => ({
        engine: s.engine,
        confidence: s.confidence,
        extractedAt: new Date().toISOString(),
        value: s.value
      }));

      const verificationStatus: "VERIFIED" | "UNVERIFIED" | "INFERRED" = 
        uniqueEnginesCount >= 2 ? "VERIFIED" : "UNVERIFIED";

      return {
        value: val,
        source: engines.length > 0 ? engines.map(e => `✓ ${e}`).join(" + ") : defaultSrc,
        acquisitionMethod: hasWayback || engines.includes("Wayback") ? "PUBLIC_METADATA" : "SEARCH_INDEX_MAPPED",
        confidence: finalConfidence,
        verificationStatus,
        sources: detailedSources
      };
    };

    let experiences = waybackParsed.experiences || [];
    let educations = waybackParsed.educations || [];

    if (experiences.length === 0 && resolvedCompany) {
      experiences.push({
        title: wrapWithSources(resolvedHeadline, headlineSources, 70),
        company: wrapWithSources(resolvedCompany, companySources, 80),
        duration: wrapWithSources("Sourced via Search Index", companySources, 65)
      });
    }

    return {
      fullName: wrapWithSources(resolvedName, fullNameSources, 80),
      headline: wrapWithSources(resolvedHeadline, headlineSources, 80),
      location: wrapWithSources(resolvedLocation, locationSources, 75),
      avatarUrl: wrapWithSources(resolvedAvatarUrl, fullNameSources, 85),
      profileUrl: wrapWithSources(resolvedProfileUrl, profileUrlSources, 90),
      currentRole: experiences[0] ? experiences[0].title : undefined,
      currentCompany: experiences[0] ? experiences[0].company : undefined,
      summary: wrapWithSources(resolvedSummary, summarySources, 75),
      experiences,
      educations,
      skills: [],
    };
  }
}
