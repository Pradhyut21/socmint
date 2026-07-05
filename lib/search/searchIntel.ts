/**
 * Search Intelligence Module — SOCMINT Shield
 *
 * Single source of truth for query dork generation, live Google search crawling,
 * result normalization, duplicate merging, and initial profile dossier seeding.
 */

import { DORK_TEMPLATES } from "./dorkTemplates";
import type { SuspectProfile, SearchIntelQuery, SearchIntelResult, SearchIntelBundle } from "../types";
import { fetchWithTimeout } from "../utils";

// ── Helper functions ────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}



function getSourceFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    return "Web Link";
  }
}



// ── Query Dork Generation ───────────────────────────────────────────────────

/**
 * Generate dork queries for a specific entity type and value.
 */
export function generateDorks(entityType: string, entityValue: string): SearchIntelQuery[] {
  const templates = DORK_TEMPLATES[entityType];
  if (!templates) return [];

  const cleanedVal = entityValue.trim();
  if (!cleanedVal) return [];

  return templates.map((tmpl, index) => ({
    id: `dq-${entityType}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    label: tmpl.label,
    query: tmpl.queryPattern.replace(/{value}/g, cleanedVal),
    category: tmpl.category,
    entityType,
    notes: tmpl.notes,
  }));
}

/**
 * Generate name-based dorks using education/experience context hints.
 */
export function generateNameDorks(
  realName: string,
  colleges: string[],
  companies: string[]
): SearchIntelQuery[] {
  const templates = DORK_TEMPLATES.name;
  if (!templates || !realName.trim()) return [];

  const cleanedName = realName.trim();
  const queries: SearchIntelQuery[] = [];
  const contexts = Array.from(new Set([...colleges, ...companies])).filter(Boolean);

  for (const tmpl of templates) {
    if (tmpl.queryPattern.includes("{context}")) {
      if (contexts.length > 0) {
        for (const ctx of contexts) {
          queries.push({
            id: `dq-name-${tmpl.category}-${Math.random().toString(36).slice(2, 6)}`,
            label: `${tmpl.label} (${ctx})`,
            query: tmpl.queryPattern.replace(/{value}/g, cleanedName).replace(/{context}/g, ctx),
            category: tmpl.category,
            entityType: "name",
            notes: `${tmpl.notes || ""} context: ${ctx}`,
          });
        }
      } else {
        queries.push({
          id: `dq-name-${tmpl.category}-${Math.random().toString(36).slice(2, 6)}`,
          label: `${tmpl.label} (General)`,
          query: tmpl.queryPattern.replace(/{value}/g, cleanedName).replace(/{context}/g, "Software OR University"),
          category: tmpl.category,
          entityType: "name",
          notes: tmpl.notes,
        });
      }
    } else {
      queries.push({
        id: `dq-name-${tmpl.category}-${Math.random().toString(36).slice(2, 6)}`,
        label: tmpl.label,
        query: tmpl.queryPattern.replace(/{value}/g, cleanedName),
        category: tmpl.category,
        entityType: "name",
        notes: tmpl.notes,
      });
    }
  }

  return queries;
}

/**
 * Parses usernames list from the suspect profile.
 */
function parseUsernamesFromProfile(profile: SuspectProfile): string[] {
  const list: string[] = [];
  
  if (profile.username) {
    const parts = profile.username.split(",");
    for (const part of parts) {
      const clean = part.replace(/@/g, "").replace(/\(AI-discovered\)/gi, "").trim();
      if (clean && !clean.includes("Not provided") && !list.includes(clean)) {
        list.push(clean);
      }
    }
  }
  
  if (profile.accounts) {
    for (const acc of profile.accounts) {
      if (acc.username && !list.includes(acc.username)) {
        list.push(acc.username);
      }
    }
  }

  return list;
}

/**
 * Scan SuspectProfile fields and generate consolidated advanced search dorks.
 */
export function detectAndGenerateAllDorks(profile: SuspectProfile): SearchIntelQuery[] {
  const allQueries: SearchIntelQuery[] = [];
  const seenQueries = new Set<string>();

  const addQueries = (queries: SearchIntelQuery[]) => {
    for (const q of queries) {
      if (!seenQueries.has(q.query.toLowerCase())) {
        seenQueries.add(q.query.toLowerCase());
        allQueries.push(q);
      }
    }
  };

  // 1. Process Domain
  const isDomain = (str: string) => /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?\.[a-z]{2,}/i.test(str) && !/^(\d{1,3}\.){3}\d{1,3}$/.test(str);
  const primaryUser = profile.username?.split(",")?.[0]?.replace(/@/g, "")?.trim() || "";
  if (isDomain(primaryUser)) {
    addQueries(generateDorks("domain", primaryUser));
  }

  // 2. Process Usernames (Handles)
  const usernames = parseUsernamesFromProfile(profile);
  for (const username of usernames) {
    if (!isDomain(username)) {
      addQueries(generateDorks("username", username));
    }
  }

  // 3. Process Real Name (LinkedIn & Professional/Academic)
  let realName = profile.realName && profile.realName !== "Not provided" ? profile.realName.trim() : "";
  if (!realName && profile.accounts) {
    for (const acc of profile.accounts) {
      if (acc.displayName && !acc.displayName.includes("profile") && acc.username && acc.displayName.toLowerCase() !== acc.username.toLowerCase()) {
        realName = acc.displayName.trim();
        break;
      }
    }
  }

  if (realName) {
    const colleges: string[] = [];
    if (profile.education) {
      for (const edu of profile.education) {
        if (edu.institution && !colleges.includes(edu.institution.trim())) {
          colleges.push(edu.institution.trim());
        }
      }
    }

    const companies: string[] = [];
    if (profile.experience) {
      for (const exp of profile.experience) {
        if (exp.company && !companies.includes(exp.company.trim())) {
          companies.push(exp.company.trim());
        }
      }
    }

    addQueries(generateNameDorks(realName, colleges, companies));
  }

  // 4. Process Email
  if (profile.emailAddress && profile.emailAddress !== "Not provided" && profile.emailAddress.includes("@")) {
    addQueries(generateDorks("email", profile.emailAddress));
  }

  // 5. Process Phone
  if (profile.phoneNumber && profile.phoneNumber !== "Not provided") {
    const cleanPhone = profile.phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      addQueries(generateDorks("phone", cleanPhone.slice(-10)));
    }
  }

  // 6. Process Company
  const isCompanyWord = (str: string) => /\b(ltd|pvt|corp|inc|company|services|industries|holdings|bank)\b/i.test(str);
  if (realName && isCompanyWord(realName)) {
    addQueries(generateDorks("company", realName));
  } else if (profile.realName && profile.realName !== "Not provided" && (isCompanyWord(profile.realName) || isDomain(primaryUser))) {
    addQueries(generateDorks("company", profile.realName));
  }



  return allQueries;
}

// ── Deduplication & Merging ────────────────────────────────────────────────

/**
 * Deduplicate results by URL (or title if no URL). Merges matched query IDs and categories.
 */
export function deduplicateResults(
  existing: SearchIntelResult[],
  incoming: SearchIntelResult[]
): SearchIntelResult[] {
  const mergedMap = new Map<string, SearchIntelResult>();

  for (const item of existing) {
    const key = item.url ? item.url.toLowerCase().trim() : item.title.toLowerCase().trim().slice(0, 100);
    mergedMap.set(key, item);
  }

  for (const item of incoming) {
    const key = item.url ? item.url.toLowerCase().trim() : item.title.toLowerCase().trim().slice(0, 100);
    const existingItem = mergedMap.get(key);
    if (existingItem) {
      const matchedQueryIds = Array.from(new Set([...existingItem.matchedQueryIds, ...item.matchedQueryIds]));
      const categories = Array.from(new Set([...existingItem.categories, ...item.categories]));
      const riskTags = Array.from(new Set([...existingItem.riskTags, ...item.riskTags]));

      mergedMap.set(key, {
        ...existingItem,
        matchedQueryIds,
        categories,
        riskTags,
        confidence: (existingItem.confidence === "high" || item.confidence === "high") ? "high" :
                    (existingItem.confidence === "medium" || item.confidence === "medium") ? "medium" : "low",
        metadata: { ...existingItem.metadata, ...item.metadata }
      });
    } else {
      mergedMap.set(key, item);
    }
  }

  return Array.from(mergedMap.values());
}

// ── Live Google Search Crawler (Layer B) ─────────────────────────────────────

export async function searchGoogleLive(
  queryStr: string,
  queryId: string,
  category: string
): Promise<SearchIntelResult[]> {
  const results: SearchIntelResult[] = [];
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(queryStr)}`;
    const resp = await fetchWithTimeout(searchUrl, 5000, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } });
    if (!resp.ok) return [];

    const html = await resp.text();
    const blocks = html.split(/<li[^>]*class="[^"]*b_algo[^"]*"/gi);

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];

      // Find URL
      const urlMatch = block.match(/href="([^"]+)"/i);
      let decodedUrl = '';
      if (urlMatch) {
        const rawUrl = urlMatch[1];
        if (!rawUrl.includes("bing.com/")) {
          decodedUrl = rawUrl;
        }
      }

      if (!decodedUrl) continue;

      // Find Title
      const h2Match = block.match(/<h2><a[^>]*>([\s\S]*?)<\/a>/i) || block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      let title = h2Match ? h2Match[1].replace(/<[^>]+>/g, '').trim() : 'Web Discovery Link';
      title = title || 'Web Discovery Link';

      // Find Snippet
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) ||
                           block.match(/<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                           block.match(/<p[^>]*class="[^"]*(?:lh-16|fc-dustygray)[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                           block.match(/<span[^>]*class="[^"]*compDscr[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      const cleanTitle = decodeHtmlEntities(title);
      const cleanSnippet = decodeHtmlEntities(snippet);

      // Category / Risk Tag identification
      const lowerSnippet = cleanSnippet.toLowerCase();
      const riskTags: string[] = [];

      if (lowerSnippet.includes("scam") || lowerSnippet.includes("fraud") || lowerSnippet.includes("complaint")) {
        riskTags.push("COMPLAINT/SCAM");
      }
      if (lowerSnippet.includes("breach") || lowerSnippet.includes("leak") || lowerSnippet.includes("credentials")) {
        riskTags.push("EXPOSED DATA");
      }
      if (lowerSnippet.includes("arrest") || lowerSnippet.includes("police") || lowerSnippet.includes("court") || lowerSnippet.includes("lawsuit")) {
        riskTags.push("LEGAL RECORD");
      }

      if (decodedUrl.includes("github.com")) {
        riskTags.push("DEVELOPER PROFILE");
      } else if (decodedUrl.includes("pastebin.com") || decodedUrl.includes("justpaste.it")) {
        riskTags.push("PASTE BIN");
      } else if (decodedUrl.includes("linkedin.com") || decodedUrl.includes("instagram.com") || decodedUrl.includes("x.com") || decodedUrl.includes("facebook.com") || decodedUrl.includes("reddit.com")) {
        riskTags.push("SOCIAL PROFILE");
      }

      let confidence: "high" | "medium" | "low" = "low";
      if (category === "exact_match") confidence = "high";
      else if (category === "social_profiles") confidence = "medium";

      results.push({
        id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: cleanTitle,
        url: decodedUrl,
        snippet: cleanSnippet,
        source: getSourceFromUrl(decodedUrl),
        matchedQueryIds: [queryId],
        categories: [category],
        confidence,
        riskTags,
        origin: "live",
        executedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Google Search Intel crawl error:", err);
  }
  return results;
}

// ── Initial Seeding ────────────────────────────────────────────────────────

function findMatchingQueryId(queries: SearchIntelQuery[], url: string, platform: string, category: string): string {
  const lowerUrl = url.toLowerCase();
  const lowerPlatform = platform.toLowerCase();

  const match = queries.find(q => {
    const qLower = q.query.toLowerCase();
    if (category === "social_profiles" && qLower.includes(lowerPlatform)) {
      return true;
    }
    if (category === "forums_pastes" && (qLower.includes("pastebin") || qLower.includes("justpaste") || qLower.includes("leak") || qLower.includes("breach"))) {
      return true;
    }
    if (category === "legal_public_refs" && (qLower.includes("court") || qLower.includes("lawsuit") || qLower.includes("kanoon") || qLower.includes("case"))) {
      return true;
    }
    return false;
  });

  return match ? match.id : `gen-${category}`;
}

/**
 * Map already fetched suspect components (linked platform accounts, darkweb pastes, legal references)
 * into SearchIntelResult objects to seed the dossier findings.
 */
export function seedInitialFindings(profile: SuspectProfile, queries: SearchIntelQuery[]): SearchIntelResult[] {
  const results: SearchIntelResult[] = [];
  const ts = profile.capturedAt || new Date().toISOString();

  // 1. Map Platform accounts
  if (profile.accounts) {
    for (const acc of profile.accounts) {
      if (acc.profileUrl || acc.url) {
        const url = acc.profileUrl || acc.url || "";
        const queryId = findMatchingQueryId(queries, url, acc.platform, "social_profiles");
        results.push({
          id: `seed-acc-${acc.platform}-${acc.username}-${Math.random().toString(36).slice(2, 6)}`,
          title: acc.displayName || `${acc.platform.toUpperCase()} — @${acc.username}`,
          url,
          snippet: acc.bio || `Public ${acc.platform} profile verified during live sweep.`,
          source: acc.platform,
          matchedQueryIds: [queryId],
          categories: ["social_profiles"],
          confidence: acc.confidence === "CONFIRMED" ? "high" : acc.confidence === "PROBABLE" ? "medium" : "low",
          riskTags: ["SOCIAL PROFILE"],
          origin: "seed",
          executedAt: ts
        });
      }
    }
  }



  // 3. Map Court/Public references
  if (profile.legalRecords) {
    for (const record of profile.legalRecords) {
      const url = record.url || record.sourceUrl || "";
      const queryId = findMatchingQueryId(queries, url, record.source || "", "legal_public_refs");
      results.push({
        id: `seed-legal-${record.id}`,
        title: record.title,
        url: url,
        snippet: record.summary || "Legal record reference found in court index sweep.",
        source: record.source || "Court Registry",
        matchedQueryIds: [queryId],
        categories: ["legal_public_refs"],
        confidence: record.credibilityLevel === "HIGH" ? "high" : record.credibilityLevel === "MEDIUM" ? "medium" : "low",
        riskTags: ["LEGAL RECORD"],
        origin: "seed",
        executedAt: ts
      });
    }
  }

  return results;
}

/**
 * Complete Search Intel Bundle creation flow.
 */
export function assembleSearchIntelBundle(profile: SuspectProfile): SearchIntelBundle {
  const queries = detectAndGenerateAllDorks(profile);
  const seededResults = seedInitialFindings(profile, queries);
  const dedupedResults = deduplicateResults([], seededResults);

  // Detect entityType from values
  let entityType = "username";
  let entityValue = profile.username?.split(",")?.[0]?.replace(/@/g, "")?.trim() || "";

  if (profile.domainIntel) {
    entityType = "domain";
  } else if (profile.phoneNumber && profile.phoneNumber !== "Not provided") {
    entityType = "phone";
    entityValue = profile.phoneNumber;
  } else if (profile.emailAddress && profile.emailAddress !== "Not provided") {
    entityType = "email";
    entityValue = profile.emailAddress;
  }

  // Extract Context Hints
  const names = new Set<string>();
  const colleges = new Set<string>();
  const companies = new Set<string>();

  if (profile.realName && profile.realName !== "Not provided") {
    names.add(profile.realName.trim());
  }
  if (profile.accounts) {
    for (const acc of profile.accounts) {
      if (acc.displayName && !acc.displayName.includes("profile") && acc.username && acc.displayName.toLowerCase() !== acc.username.toLowerCase()) {
        names.add(acc.displayName.trim());
      }
    }
  }

  if (profile.education) {
    for (const edu of profile.education) {
      if (edu.institution) colleges.add(edu.institution.trim());
    }
  }

  if (profile.experience) {
    for (const exp of profile.experience) {
      if (exp.company) companies.add(exp.company.trim());
    }
  }

  return {
    entityType,
    entityValue,
    queries,
    results: dedupedResults,
    summary: `Automatically generated advanced query dorks for suspect. Mapped ${dedupedResults.length} initial seeded findings from the investigation dossier.`,
    notes: "Analyst Note: Search Intelligence results are public open-web references and should be verified before official attribution.",
    contextHints: {
      names: Array.from(names),
      colleges: Array.from(colleges),
      companies: Array.from(companies)
    }
  };
}
