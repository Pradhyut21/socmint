import { SemanticSimilarityResult } from "../types";

// Synonyms and category mapping dictionary
const SEMANTIC_DICTIONARY = {
  professions: [
    { canonical: "Software Engineer", keywords: ["software engineer", "developer", "coder", "programmer", "dev", "sde", "builder"] },
    { canonical: "Security Researcher", keywords: ["security researcher", "pentester", "ethical hacker", "infosec", "security analyst", "bug bounty"] },
    { canonical: "Data Scientist", keywords: ["data scientist", "ml engineer", "ai researcher", "data analyst", "machine learning engineer"] },
    { canonical: "Student", keywords: ["student", "undergrad", "postgrad", "phd", "candidate", "bmsce", "college", "university"] },
    { canonical: "Designer", keywords: ["designer", "ui/ux", "product designer", "creative"] },
    { canonical: "Architect", keywords: ["architect", "system architect", "solutions architect"] },
  ],
  interests: [
    { canonical: "Open Source", keywords: ["open source", "oss", "foss", "contributor", "github", "git"] },
    { canonical: "Cybersecurity", keywords: ["cybersecurity", "infosec", "pentesting", "hacking", "ctf", "malware", "reverse engineering"] },
    { canonical: "AI / Machine Learning", keywords: ["machine learning", "ml", "ai", "deep learning", "neural", "nlp", "llm"] },
    { canonical: "Blockchain / Web3", keywords: ["blockchain", "web3", "crypto", "solidity", "ethereum", "smart contracts", "defi"] },
    { canonical: "Finance", keywords: ["finance", "fintech", "trading", "stocks", "investing"] },
    { canonical: "Photography", keywords: ["photography", "photo", "travel", "photos"] },
  ],
  organizations: [
    { canonical: "BMSCE", keywords: ["bmsce", "bms", "bms college"] },
    { canonical: "Google", keywords: ["google", "googler", "xoogler"] },
    { canonical: "Microsoft", keywords: ["microsoft"] },
    { canonical: "Meta", keywords: ["meta", "facebook"] },
    { canonical: "Amazon", keywords: ["amazon", "aws"] },
  ],
  technologies: [
    { canonical: "Python", keywords: ["python", "py", "django", "flask", "fastapi"] },
    { canonical: "TypeScript / JavaScript", keywords: ["typescript", "ts", "javascript", "js", "react", "nextjs", "vue", "angular", "node", "express"] },
    { canonical: "Go", keywords: ["go", "golang"] },
    { canonical: "Rust", keywords: ["rust", "rs"] },
    { canonical: "Java", keywords: ["java", "spring"] },
    { canonical: "C++", keywords: ["c++", "cpp", "cplusplus"] },
  ],
  research: [
    { canonical: "Cryptography", keywords: ["cryptography", "crypto", "zkp", "zero knowledge", "encryption"] },
    { canonical: "Deepfake Detection", keywords: ["deepfake", "synthetic media", "generative ai", "manipulation"] },
    { canonical: "Threat Intelligence", keywords: ["threat intelligence", "cti", "ioc", "apt", "osint"] },
    { canonical: "Natural Language Processing", keywords: ["nlp", "natural language", "transformers", "bert", "gpt"] },
  ]
};

function extractEntities(text: string, category: keyof typeof SEMANTIC_DICTIONARY): string[] {
  const normalized = text.toLowerCase();
  const found: string[] = [];

  SEMANTIC_DICTIONARY[category].forEach(item => {
    const matches = item.keywords.some(keyword => {
      // Use word boundaries or substring matching where appropriate
      if (keyword.length <= 3) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?![a-zA-Z0-9_])`).test(normalized);
      }
      return normalized.includes(keyword);
    });
    if (matches) {
      found.push(item.canonical);
    }
  });

  return found;
}

export function compareBiosSemantically(bioA: string, bioB: string): SemanticSimilarityResult {
  const cleanA = bioA || "";
  const cleanB = bioB || "";

  // Extract entities from both bios
  const profsA = extractEntities(cleanA, "professions");
  const profsB = extractEntities(cleanB, "professions");

  const intsA = extractEntities(cleanA, "interests");
  const intsB = extractEntities(cleanB, "interests");

  const orgsA = extractEntities(cleanA, "organizations");
  const orgsB = extractEntities(cleanB, "organizations");

  const techsA = extractEntities(cleanA, "technologies");
  const techsB = extractEntities(cleanB, "technologies");

  const resA = extractEntities(cleanA, "research");
  const resB = extractEntities(cleanB, "research");

  // Check matches
  const professionMatch = profsA.some(p => profsB.includes(p));
  const professionDetails = profsA.filter(p => profsB.includes(p)).join(", ");

  const interestsMatch = intsA.some(i => intsB.includes(i));
  const interestsDetails = intsA.filter(i => intsB.includes(i)).join(", ");

  const organizationMatch = orgsA.some(o => orgsB.includes(o));
  const organizationDetails = orgsA.filter(o => orgsB.includes(o)).join(", ");

  const technologiesMatch = techsA.some(t => techsB.includes(t));
  const technologiesDetails = techsA.filter(t => techsB.includes(t)).join(", ");

  const researchMatch = resA.some(r => resB.includes(r));
  const researchDetails = resA.filter(r => resB.includes(r)).join(", ");

  // Calculate Jaccard similarity score
  let matchPoints = 0;
  let totalChecks = 0;

  const checkCategory = (hasMatch: boolean, listA: string[], listB: string[], weight: number) => {
    if (listA.length > 0 && listB.length > 0) {
      totalChecks += weight;
      if (hasMatch) {
        matchPoints += weight;
      }
    }
  };

  checkCategory(professionMatch, profsA, profsB, 30);
  checkCategory(interestsMatch, intsA, intsB, 20);
  checkCategory(organizationMatch, orgsA, orgsB, 15);
  checkCategory(technologiesMatch, techsA, techsB, 20);
  checkCategory(researchMatch, resA, resB, 15);

  let score = 0;
  if (totalChecks > 0) {
    score = Math.round((matchPoints / totalChecks) * 100);
  } else {
    // Fallback word overlap Jaccard similarity if no dictionary words are matched
    const wordsA = new Set(cleanA.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(cleanB.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    
    if (union.size > 0) {
      score = Math.round((intersection.size / union.size) * 100);
    }
  }

  // Generate reasoning summary
  const matchesList: string[] = [];
  if (professionMatch) matchesList.push(`profession (${professionDetails})`);
  if (interestsMatch) matchesList.push(`interests (${interestsDetails})`);
  if (organizationMatch) matchesList.push(`organization (${organizationDetails})`);
  if (technologiesMatch) matchesList.push(`technologies (${technologiesDetails})`);
  if (researchMatch) matchesList.push(`research focus (${researchDetails})`);

  let reasoningSummary = "";
  if (matchesList.length > 0) {
    reasoningSummary = `Semantic alignment identified on: ${matchesList.join(", ")}.`;
  } else {
    reasoningSummary = "No significant semantic overlaps detected in profile bios.";
  }

  return {
    score,
    professionMatch,
    professionDetails: professionDetails || undefined,
    interestsMatch,
    interestsDetails: interestsDetails || undefined,
    organizationMatch,
    organizationDetails: organizationDetails || undefined,
    technologiesMatch,
    technologiesDetails: technologiesDetails || undefined,
    researchMatch,
    researchDetails: researchDetails || undefined,
    reasoningSummary
  };
}
