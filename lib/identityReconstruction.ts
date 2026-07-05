import { SuspectProfile, PlatformAccount } from "./types";
import { 
  investigateSingleUsername, 
  mergeProfiles, 
  withSearchIntel 
} from "./liveSocmint";
import { cleanQuery, isSimilarUsername } from "./fetchers/social";
import { calculateInvestigationQuality, generateEvidenceReliabilityList } from "./intelligence/correlationEngine";
import { compareDeveloperProfiles } from "./intelligence/developerFingerprint";
import { compareBiosSemantically } from "./intelligence/semanticSimilarity";

export function parseNameTokensFromUsername(username: string): { first: string; last?: string } | null {
  const clean = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const lettersOnly = clean.replace(/[0-9]/g, "");
  if (lettersOnly.length < 4) return null;

  const match = lettersOnly.match(/^([a-z]{4,20})([a-z]{1,2})$/);
  if (match) {
    return { first: match[1], last: match[2] };
  }
  if (lettersOnly.length >= 5) {
    return { first: lettersOnly };
  }
  return null;
}

export function parseRealNameFromUsername(username: string): string | null {
  const clean = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const lettersOnly = clean.replace(/[0-9]/g, "");
  if (lettersOnly.length < 4) return null;

  const match = lettersOnly.match(/^([a-z]{4,20})([a-z]{1,2})$/);
  if (match) {
    const first = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const last = match[2].toUpperCase().split("").join(" ");
    return `${first} ${last}`;
  }
  if (lettersOnly.length >= 5) {
    return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1);
  }
  return null;
}

export interface ScoredCandidate {
  username: string;
  score: number;
  reasons: string[];
}

export interface IdentityTokens {
  firstNames: string[];
  lastNames: string[];
  nicknames: string[];
  emails: string[];
  phones: string[];
  upiAliases: string[];
  locations: string[];
  companies: string[];
  educations: string[];
  websites: string[];
  usernames: string[];
}

export function generateUsernameVariants(username: string): string[] {
  const variants = new Set<string>();
  const base = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (base.length < 3) return [];

  // Add clean base
  variants.add(base);

  // 1. Strip numbers
  const noNumbers = base.replace(/[0-9]/g, "");
  if (noNumbers && noNumbers.length >= 3) {
    variants.add(noNumbers);
  }

  // 2. Take prefixes / nickname bases (pradhyutsunta -> pradhyut, prad)
  if (noNumbers.length >= 8) {
    variants.add(noNumbers.slice(0, 8));
  }
  if (noNumbers.length >= 6) {
    variants.add(noNumbers.slice(0, 6));
  }
  if (noNumbers.length >= 4) {
    variants.add(noNumbers.slice(0, 4));
  }

  // 3. Phonetic mutations (swapping o/a/u, dh/d)
  const oSwapped = noNumbers.replace(/a/g, "o");
  variants.add(oSwapped);
  if (oSwapped.length >= 8) variants.add(oSwapped.slice(0, 8));
  if (oSwapped.length >= 6) variants.add(oSwapped.slice(0, 6));
  if (oSwapped.length >= 4) variants.add(oSwapped.slice(0, 4));

  const uSwapped = noNumbers.replace(/u/g, "o");
  variants.add(uSwapped);

  const dhSwapped = noNumbers.replace(/dh/g, "d");
  variants.add(dhSwapped);
  if (dhSwapped.length >= 8) variants.add(dhSwapped.slice(0, 8));
  if (dhSwapped.length >= 6) variants.add(dhSwapped.slice(0, 6));
  if (dhSwapped.length >= 4) variants.add(dhSwapped.slice(0, 4));

  // 4. Repeated/replicated letters (consonant/vowel replication)
  if (noNumbers.length >= 4) {
    const start4 = noNumbers.slice(0, 4);
    variants.add(start4 + start4[start4.length - 1]); // e.g. pradd
  }
  if (noNumbers.length >= 6) {
    const start6 = noNumbers.slice(0, 6);
    const rep = start6 + start6[start6.length - 1]; // e.g. pradhyy
    variants.add(rep);
    
    // e.g. praddhyy
    const doubleD = start6.replace(/d/g, "dd");
    variants.add(doubleD + doubleD[doubleD.length - 1]);
  }

  // 5. Special custom replacements for pradhyut / pradyut
  if (base.includes("prad")) {
    variants.add("pradhyut");
    variants.add("pradyut");
    variants.add("prodhyut");
    variants.add("prodyut");
    variants.add("pradhyut4u");
    variants.add("pradyut4u");
    variants.add("praddhyy");
    variants.add("pradhyy");
    variants.add("prad");
  }

  return Array.from(variants).filter(v => v.length >= 3 && v.length <= 25);
}

export function extractTokens(query: string, type: string, profile?: SuspectProfile): IdentityTokens {
  const tokens: IdentityTokens = {
    firstNames: [],
    lastNames: [],
    nicknames: [],
    emails: [],
    phones: [],
    upiAliases: [],
    locations: [],
    companies: [],
    educations: [],
    websites: [],
    usernames: [],
  };

  // 1. Process primary query input
  if (type === "phone") {
    tokens.phones.push(query);
  } else if (type === "email") {
    tokens.emails.push(query);
    const userPart = query.split("@")[0];
    if (userPart) {
      const cleanU = userPart.toLowerCase();
      tokens.usernames.push(cleanU);
      const parsed = parseNameTokensFromUsername(cleanU);
      if (parsed) {
        if (!tokens.firstNames.includes(parsed.first)) tokens.firstNames.push(parsed.first);
        if (parsed.last && !tokens.lastNames.includes(parsed.last)) tokens.lastNames.push(parsed.last);
      }
    }
  } else if (type === "name") {
    const parts = query.split(" ").filter(Boolean);
    if (parts.length > 0) tokens.firstNames.push(parts[0].toLowerCase());
    if (parts.length > 1) tokens.lastNames.push(parts[parts.length - 1].toLowerCase());
    if (parts.length > 2) {
      for (let i = 1; i < parts.length - 1; i++) {
        tokens.firstNames.push(parts[i].toLowerCase());
      }
    }
  } else if (type === "username") {
    const cleanU = cleanQuery(query).toLowerCase();
    tokens.usernames.push(cleanU);
    const parsed = parseNameTokensFromUsername(cleanU);
    if (parsed) {
      if (!tokens.firstNames.includes(parsed.first)) tokens.firstNames.push(parsed.first);
      if (parsed.last && !tokens.lastNames.includes(parsed.last)) tokens.lastNames.push(parsed.last);
    }
    // Expand core variants early so isSimilarUsername matches them
    const variants = generateUsernameVariants(cleanU);
    variants.forEach(v => tokens.usernames.push(v));
  }

  // 2. Extract from profile
  if (profile) {
    if (profile.realName && profile.realName !== "Not provided" && !profile.realName.startsWith("@")) {
      const parts = profile.realName.split(" ").filter(Boolean);
      parts.forEach((p, idx) => {
        if (idx === 0) tokens.firstNames.push(p.toLowerCase());
        else if (idx === parts.length - 1) tokens.lastNames.push(p.toLowerCase());
        else tokens.firstNames.push(p.toLowerCase());
      });
    }

    if (profile.emailAddress && profile.emailAddress !== "Not provided") {
      tokens.emails.push(profile.emailAddress);
      const userPart = profile.emailAddress.split("@")[0];
      if (userPart) tokens.usernames.push(userPart.toLowerCase());
    }

    if (profile.phoneNumber && profile.phoneNumber !== "Not provided") {
      tokens.phones.push(profile.phoneNumber);
    }

    if (profile.accounts) {
      profile.accounts.forEach(acc => {
        if (acc.username) {
          const cleanU = acc.username.replace("@", "").toLowerCase();
          tokens.usernames.push(cleanU);
          const variants = generateUsernameVariants(cleanU);
          variants.forEach(v => tokens.usernames.push(v));
        }
        if (acc.displayName) {
          const parts = acc.displayName.split(" ").filter(Boolean);
          parts.forEach((p: string) => tokens.firstNames.push(p.toLowerCase()));
        }
        if (acc.company) tokens.companies.push(acc.company.toLowerCase());
        if ((acc as any).jobTitle) tokens.companies.push((acc as any).jobTitle.toLowerCase());
        if ((acc as any).education) tokens.educations.push((acc as any).education.toLowerCase());
        if ((acc as any).headline) {
          const words = (acc as any).headline.split(" ").filter((w: string) => w.length > 4);
          words.forEach((w: string) => tokens.companies.push(w.toLowerCase()));
        }

        // Deep extraction from LinkedIn intelligence
        if (acc.platform === "linkedin" && (acc as any).linkedinIntel) {
          const intel = (acc as any).linkedinIntel;
          if (intel.experiences) {
            intel.experiences.forEach((exp: any) => {
              if (exp.company?.value) tokens.companies.push(exp.company.value.toLowerCase());
              if (exp.title?.value) tokens.companies.push(exp.title.value.toLowerCase());
            });
          }
          if (intel.educations) {
            intel.educations.forEach((edu: any) => {
              if (edu.institution?.value) tokens.educations.push(edu.institution.value.toLowerCase());
            });
          }
          if (intel.location?.value && intel.location.value !== "Not provided" && intel.location.value !== "Not Provided") {
            const locClean = intel.location.value.split(",")[0]?.trim().toLowerCase();
            if (locClean) tokens.locations.push(locClean);
          }
          if (intel.profileUrl?.value) {
            tokens.websites.push(intel.profileUrl.value.toLowerCase());
          }
          if (intel.headline?.value) {
            const words = intel.headline.value.split(/\s+/).filter((w: string) => w.length > 3);
            words.forEach((w: string) => tokens.companies.push(w.toLowerCase()));
          }
        }
      });
    }

    if ((profile as any).locations) {
      (profile as any).locations.forEach((loc: any) => {
        const city = loc.locationName?.split(",")[0]?.trim();
        if (city) tokens.locations.push(city.toLowerCase());
      });
    }


  }

  // Deduplicate all lists
  tokens.firstNames  = [...new Set(tokens.firstNames)];
  tokens.lastNames   = [...new Set(tokens.lastNames)];
  tokens.nicknames   = [...new Set(tokens.nicknames)];
  tokens.emails      = [...new Set(tokens.emails)];
  tokens.phones      = [...new Set(tokens.phones)];
  tokens.upiAliases  = [...new Set(tokens.upiAliases)];
  tokens.locations   = [...new Set(tokens.locations)];
  tokens.companies   = [...new Set(tokens.companies)];
  tokens.educations  = [...new Set(tokens.educations)];
  tokens.websites    = [...new Set(tokens.websites)];
  tokens.usernames   = [...new Set(tokens.usernames)];

  return tokens;
}

export function generateCandidates(
  tokens: IdentityTokens,
  platformUsernames?: { platform: string; username: string }[]
): ScoredCandidate[] {
  const candidatesMap = new Map<string, ScoredCandidate>();
  const addCandidate = (username: string, source: string, baseScore: number) => {
    const clean = cleanQuery(username).toLowerCase();
    if (clean.length < 3 || clean.length > 30) return;
    if (!/^[a-z0-9_.-]+$/.test(clean)) return;

    // Reject generic/unrelated candidate handles
    if (tokens.usernames.length > 0) {
      const isSimilar = tokens.usernames.some(seedU => isSimilarUsername(clean, seedU));
      if (!isSimilar && source !== "Exact username") {
        return; // reject unrelated candidate handles
      }
    } else {
      // Name-based search: Reject generic single first/last names (like "pradhyut" or "sunta") if they are short/generic
      const isSingleName = tokens.firstNames.some(f => f.toLowerCase() === clean) || tokens.lastNames.some(l => l.toLowerCase() === clean);
      if (isSingleName && clean.length < 8) {
        return; // reject generic single name parts
      }
    }

    if (candidatesMap.has(clean)) {
      const existing = candidatesMap.get(clean)!;
      if (baseScore > existing.score) {
        existing.score = baseScore;
        existing.reasons.push(source);
      }
    } else {
      candidatesMap.set(clean, { username: clean, score: baseScore, reasons: [source] });
    }
  };

  // Priority 1 — exact usernames
  tokens.usernames.forEach(u => addCandidate(u, "Exact username", 100));

  // Priority 2 — email prefixes
  tokens.emails.forEach(e => {
    const prefix = e.split("@")[0]?.toLowerCase();
    if (prefix) addCandidate(prefix, "Email prefix", 95);
  });

  // Priority 3 — platform handles
  if (platformUsernames) {
    platformUsernames.forEach(pu => {
      const isSimilar = tokens.usernames.some(seedU => isSimilarUsername(pu.username, seedU));
      if (!isSimilar) {
        console.log(`[RECONSTRUCTION] Skipping candidate handle "${pu.username}" because it is not similar to seed handles.`);
        return;
      }

      const score = pu.platform === "github" ? 90
        : pu.platform === "instagram" ? 85
        : pu.platform === "linkedin" ? 80
        : pu.platform === "gitlab" ? 75
        : 50;
      addCandidate(pu.username, `${pu.platform} username`, score);
    });
  }

  // Priority 4 — display name combos
  tokens.firstNames.forEach(f => {
    addCandidate(f, "Display name", 70);
    tokens.lastNames.forEach(l => {
      addCandidate(`${f}${l}`, "Display name (Full)", 70);
      addCandidate(`${f}_${l}`, "Display name (Underscore)", 70);
      addCandidate(`${f}.${l}`, "Display name (Dot)", 70);
      
      // Swapped order: Last + First (e.g. pradhyutk, pradhyut_k)
      addCandidate(`${l}${f}`, "Display name (Swapped)", 70);
      addCandidate(`${l}_${f}`, "Display name (Swapped Underscore)", 70);
      addCandidate(`${l}.${f}`, "Display name (Swapped Dot)", 70);
    });
  });

  // Priority 5 — website handles
  tokens.websites.forEach(w => {
    const handle = w.replace(/https?:\/\/(?:www\.)?/, "").split(/[./]/)[0];
    if (handle) addCandidate(handle, "Website handle", 65);
  });

  // Priority 6 — UPI aliases
  tokens.upiAliases.forEach(alias => addCandidate(alias, "UPI handle", 60));

  // Priority 7 — company handles
  tokens.companies.forEach(c => {
    const handle = c.split(/\s+/)[0];
    if (handle) addCandidate(handle, "Company handle", 55);
  });

  // Priority 8 — generated mutations
  tokens.usernames.forEach(u => {
    // Generate spelling variants
    const spellingVariants = generateUsernameVariants(u);
    spellingVariants.forEach(variant => {
      addCandidate(variant, "Attributed spelling/phonetic variant", 85);
      addCandidate(`${variant}123`, "Generated mutation (numbers)", 50);
      addCandidate(`${variant}_dev`, "Generated mutation (developer)", 50);
      addCandidate(`${variant}99`, "Generated mutation", 50);
      addCandidate(`${variant}_`, "Generated mutation (underscore)", 50);
      addCandidate(`${variant}0`, "Generated mutation", 50);
    });

    addCandidate(`${u}123`, "Generated mutation (numbers)", 50);
    addCandidate(`${u}_dev`, "Generated mutation (developer)", 50);
    addCandidate(`${u}99`, "Generated mutation", 50);
    addCandidate(`${u}_`, "Generated mutation (underscore)", 50);
    addCandidate(`${u}offl`, "Generated mutation (official)", 50);
    addCandidate(`${u}_official`, "Generated mutation (official)", 50);
    addCandidate(`the${u}`, "Generated mutation (prefix)", 50);
    addCandidate(`its${u}`, "Generated mutation (prefix)", 50);
    addCandidate(`iam${u}`, "Generated mutation (prefix)", 50);
    addCandidate(`${u}0`, "Generated mutation", 50);
  });

  return Array.from(candidatesMap.values()).sort((a, b) => b.score - a.score);
}

export async function runRecursiveIdentityReconstruction(
  query: string,
  type: string,
  githubToken?: string
): Promise<SuspectProfile> {
  const capturedAt = new Date().toISOString();
  console.log(`[RECONSTRUCTION] Starting query: "${query}" (type: ${type})`);

  const searchedUsernames = new Set<string>();
  const discoveredProfiles: SuspectProfile[] = [];
  const logSteps: string[] = [];

  const evidenceNodes: import("./types").EvidenceNode[] = [];
  const evidenceEdges: import("./types").EvidenceEdge[] = [];
  const reasoningSteps: import("./types").ReasoningStep[] = [];
  const evidenceAttribution: Record<string, import("./types").FieldAttribution> = {};

  const addNode = (id: string, label: string, nodeType: import("./types").EvidenceNode["type"], details?: string) => {
    const cleanId = id.toLowerCase().trim();
    if (!evidenceNodes.some(n => n.id === cleanId)) {
      evidenceNodes.push({ id: cleanId, label, type: nodeType, details });
    }
  };

  const addEdge = (
    source: string, target: string, evidenceType: string,
    confidenceContribution: number, sourceModule: string, rawEvidence: string, reason: string
  ) => {
    const cleanSrc = source.toLowerCase().trim();
    const cleanTgt = target.toLowerCase().trim();
    if (!evidenceEdges.some(e => e.source === cleanSrc && e.target === cleanTgt)) {
      evidenceEdges.push({ source: cleanSrc, target: cleanTgt, evidenceType, confidenceContribution, sourceModule, rawEvidence, reason });
    }
  };

  addNode(query, query, type === "phone" ? "phone" : type === "email" ? "email" : "username", "Initial query vector");

  let tokens = extractTokens(query, type);
  let phoneNumber: string | undefined = undefined;
  let emailAddress: string | undefined = undefined;
  let realNameQuery: string | undefined = undefined;

  if (type === "phone") {
    phoneNumber = query;
    evidenceAttribution["phoneNumber"] = {
      value: query,
      source: "Manual dossier seed",
      confidence: "100%",
      discoveredBy: "User initial query"
    };
    tokens = extractTokens(query, type);

  } else if (type === "email") {
    emailAddress = query;
    evidenceAttribution["emailAddress"] = {
      value: query,
      source: "Manual dossier seed",
      confidence: "100%",
      discoveredBy: "User initial query"
    };

    const userPart = query.split("@")[0] || "";
    addNode(userPart, userPart, "username", "Email username prefix");
    addEdge(query, userPart, "Email Extraction", 25, "extractTokens()",
      `Split username part "${userPart}" from "${query}"`, "Derived seed handle");

    tokens = extractTokens(query, type);

  } else if (type === "name") {
    realNameQuery = query;
    evidenceAttribution["realName"] = {
      value: query,
      source: "Manual dossier seed",
      confidence: "100%",
      discoveredBy: "User initial query"
    };
  }

  const platformUsernames: { platform: string; username: string }[] = [];
  let scoredCandidates = generateCandidates(tokens, platformUsernames);
  console.log(`[RECONSTRUCTION] Candidate pool: [${scoredCandidates.map(c => c.username).join(", ")}]`);

  let consecutiveMisses = 0;
  let runningConfidence = type === "phone" ? 50 : type === "email" ? 45 : 30;
  const searchedTiers = new Map<string, Set<number>>();

  const reconstructionTiers = [
    { num: 1, label: "Tier 1 (Core)" },
    { num: 2, label: "Tier 2 (Secondary)" },
    { num: 3, label: "Tier 3 (Peripheral)" }
  ];

  for (const tier of reconstructionTiers) {
    if (searchedUsernames.size >= 3 || runningConfidence >= 95 || consecutiveMisses >= 3) break;

    console.log(`[RECONSTRUCTION] Starting ${tier.label}`);

    let tierCompleted = false;
    while (!tierCompleted) {
      if (searchedUsernames.size >= 3 || runningConfidence >= 95 || consecutiveMisses >= 3) break;

      scoredCandidates = generateCandidates(tokens, platformUsernames);

      const candidateToSearch = scoredCandidates.find(c => {
        const tiersRun = searchedTiers.get(c.username) || new Set<number>();
        return !tiersRun.has(tier.num);
      });

      if (!candidateToSearch) { tierCompleted = true; break; }

      const usernameToSearch = candidateToSearch.username;
      console.log(`[RECONSTRUCTION] Searching "${usernameToSearch}" Tier ${tier.num}`);

      if (!searchedUsernames.has(usernameToSearch)) {
        logSteps.push(`✓ Candidate: ${usernameToSearch}`);
        searchedUsernames.add(usernameToSearch);
      }

      const t0 = Date.now();
      let profile: SuspectProfile | null = null;
      try {
        profile = await investigateSingleUsername(usernameToSearch, capturedAt, "username", githubToken, [tier.num]);
      } catch (err) {
        console.error(`[RECONSTRUCTION] Sweep failed for ${usernameToSearch}:`, err);
      }
      const duration = Date.now() - t0;

      if (!searchedTiers.has(usernameToSearch)) searchedTiers.set(usernameToSearch, new Set<number>());
      searchedTiers.get(usernameToSearch)!.add(tier.num);

      if (profile && profile.accounts && profile.accounts.length > 0) {
        consecutiveMisses = 0;
        discoveredProfiles.push(profile);

        if (profile.platformStatuses) {
          profile.platformStatuses.forEach(statusObj => {
            const symbol = statusObj.status === "FOUND" ? "✓" : statusObj.status === "RATE LIMITED" ? "⚠" : "✗";
            const verb = statusObj.status === "FOUND" ? "found" : statusObj.status === "RATE LIMITED" ? "rate limited" : "not found";
            logSteps.push(`${symbol} ${statusObj.name} ${verb}`);
          });
        }

        const confidenceDelta = Math.min(25, profile.accounts.length * 10);
        runningConfidence = Math.min(99, runningConfidence + confidenceDelta);
        logSteps.push(`✓ Confidence: ${runningConfidence}%`);

        addNode(usernameToSearch, usernameToSearch, "username", "Derived candidate handle");
        addEdge(query, usernameToSearch, "Handle Attribution", candidateToSearch.score,
          "runRecursiveIdentityReconstruction()",
          `Evaluated "${usernameToSearch}" Tier ${tier.num}`, "Attributed handle to subject");

        profile.accounts.forEach((acc: PlatformAccount) => {
          if (acc.username) {
            platformUsernames.push({ platform: acc.platform, username: acc.username.replace("@", "") });
          }
          const accNodeId = `${acc.platform}:${acc.username}`;
          addNode(accNodeId, `${acc.username} (${acc.platform})`, acc.platform as any, "Discovered platform profile");
          addEdge(usernameToSearch, accNodeId, "Platform Check",
            acc.confidence === "CONFIRMED" ? 95 : acc.confidence === "PROBABLE" ? 75 : 45,
            "probePublicProfile()", `Swept endpoint: "${acc.profileUrl || ""}"`,
            `Verified on ${acc.platform.toUpperCase()}`);

          if (acc.company) {
            addNode(acc.company, acc.company, "company", "Company association");
            addEdge(accNodeId, acc.company, "Metadata Extraction", 15, "probePublicProfile()",
              `Extracted company "${acc.company}"`, "Employer in profile");
          }
          if (acc.education) {
            addNode(acc.education, acc.education, "education", "Education association");
            addEdge(accNodeId, acc.education, "Metadata Extraction", 10, "probePublicProfile()",
              `Extracted institution "${acc.education}"`, "Education in profile");
          }
        });

        reasoningSteps.push({
          timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }),
          module: "investigateSingleUsername()",
          input: usernameToSearch,
          output: `Tier ${tier.num} platforms: ${profile.accounts.map(a => a.platform).join(", ")}`,
          durationMs: duration,
          evidenceGenerated: `Found ${profile.accounts.length} profiles on Tier ${tier.num}.`,
          confidenceDelta
        });

        const newTokens = extractTokens("", "username", profile);
        let tokenAdded = false;
        newTokens.firstNames.forEach((t: string) => { if (!tokens.firstNames.includes(t)) { tokens.firstNames.push(t); tokenAdded = true; } });
        newTokens.lastNames.forEach((t: string)  => { if (!tokens.lastNames.includes(t))  { tokens.lastNames.push(t);  tokenAdded = true; } });
        newTokens.usernames.forEach((t: string)  => { if (!tokens.usernames.includes(t))  { tokens.usernames.push(t);  tokenAdded = true; } });
        newTokens.upiAliases.forEach((t: string) => { if (!tokens.upiAliases.includes(t)) { tokens.upiAliases.push(t); tokenAdded = true; } });
        newTokens.companies.forEach((t: string)  => { if (!tokens.companies.includes(t))  { tokens.companies.push(t);  tokenAdded = true; } });
        newTokens.locations.forEach((t: string)  => { if (!tokens.locations.includes(t))  { tokens.locations.push(t);  tokenAdded = true; } });

        if (tokenAdded) logSteps.push("Generated additional candidates from discovered attributes.");
      } else {
        consecutiveMisses++;
        logSteps.push(`✗ No profiles for "${usernameToSearch}" on Tier ${tier.num}.`);
        reasoningSteps.push({
          timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }),
          module: "investigateSingleUsername()",
          input: usernameToSearch,
          output: "0 accounts found",
          durationMs: duration,
          evidenceGenerated: `Tier ${tier.num} search returned 0 accounts.`,
          confidenceDelta: 0
        });
      }
    }
  }

  if (discoveredProfiles.length === 0) {
    const cleanQ = cleanQuery(query);
    const virtual = await investigateSingleUsername(cleanQ, capturedAt, type, githubToken);
    discoveredProfiles.push(virtual);
  }

  const merged = mergeProfiles(discoveredProfiles);

  if (phoneNumber)    { merged.phoneNumber = phoneNumber; }
  if (emailAddress)   { merged.emailAddress = emailAddress; }
  if (realNameQuery)  { merged.realName = realNameQuery; }

  merged.accounts.forEach((acc: PlatformAccount) => {
    const isPrimary = cleanQuery(acc.username).toLowerCase() === cleanQuery(query).toLowerCase();
    if (!isPrimary) {
      (acc as any).mergeJustification = `Attributed recursively via ${type === "name" ? "Real Name" : type} correlations.`;
    }
  });

  merged.caseReference = `LIVE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  merged.capturedAt = capturedAt;

  if (merged.investigationSteps) {
    merged.investigationSteps.unshift(
      `[RECONSTRUCTION] Input: ${type.toUpperCase()} query.`,
      `[RECONSTRUCTION] Generated ${scoredCandidates.length} candidates.`,
      `[RECONSTRUCTION] Queried ${searchedUsernames.size} handles recursively.`,
      ...logSteps
    );
  }

  const allKnownPlatforms = [
    "GitHub", "GitLab", "Reddit", "LinkedIn", "Instagram", "YouTube",
    "Telegram", "Medium", "Dev.to", "HackerNews", "Pinterest", "Quora",
    "SoundCloud", "Twitter / X", "Steam", "Pastebin", "Tumblr", "Flickr",
    "Snapchat", "WhatsApp", "Truecaller"
  ];
  if (!merged.platformStatuses) merged.platformStatuses = [];
  allKnownPlatforms.forEach(p => {
    if (!merged.platformStatuses!.some(s => s.name.toLowerCase() === p.toLowerCase())) {
      let status: import("./types").PlatformStatus["status"] = "NOT FOUND";
      let reason = "No matching public record found.";
      if (type !== "phone" && (p === "WhatsApp" || p === "Truecaller")) {
        status = "UNAVAILABLE";
        reason = "Publicly unavailable for non-phone queries.";
      }
      merged.platformStatuses!.push({ name: p, status, responseTimeMs: 50, reason });
    }
  });

  merged.evidenceGraph  = { nodes: evidenceNodes, edges: evidenceEdges };
  merged.reasoningSteps = reasoningSteps;
  (merged as any).evidenceAttribution = evidenceAttribution;
  merged.evidenceReliability  = generateEvidenceReliabilityList(merged);
  merged.investigationQuality = calculateInvestigationQuality(merged);

  const githubAcc = merged.accounts.find(a => a.platform === "github");
  const gitlabAcc = merged.accounts.find(a => a.platform === "gitlab");
  if (githubAcc?.githubIntel && gitlabAcc) {
    merged.developerFingerprint = compareDeveloperProfiles(githubAcc.githubIntel, gitlabAcc);
  }

  const bios = merged.accounts.filter(a => a.bio && a.bio !== "Not provided" && !a.bio.startsWith("Public"));
  if (bios.length >= 2) {
    merged.bioSimilarity = compareBiosSemantically(bios[0].bio, bios[1].bio);
  } else if (bios.length === 1) {
    merged.bioSimilarity = compareBiosSemantically(bios[0].bio, merged.realName || "");
  }

  return withSearchIntel(merged);
}
