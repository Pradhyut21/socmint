/**
 * Domain / IP / Company Investigation Provider — SOCMINT Shield
 *
 * Provides public OSINT for domain names, IP addresses, and company names.
 * Data sources:
 *   - DNS over HTTPS (dns.google) — for A, MX, NS, TXT records
 *   - IANA WHOIS-like (rdap.org) — public RDAP for domain registration info
 *   - Reputation signal (AbuseIPDB public lookup link + heuristics)
 *   - Scam-domain signal heuristics (suspicious keywords, short domains, TLD patterns)
 *   - MCA21 company portal link (for company names)
 *
 * All data comes from public APIs — no authenticated enterprise services.
 * Falls back to structured search links when live data is unavailable.
 */

import type { DomainIntelResult, NormalizedEvidence } from "../../types";
import type { InvestigationProvider, ProviderCapability, ProviderResult } from "../providerRegistry";
import { normalizeSearchResult } from "../../normalization/evidenceNormalizer";

const CAPABILITY: ProviderCapability = {
  handles: ["domain", "ip", "company"],
  tier: 2,
  lawful: true,
  requiresApiKey: false,
  dataClasses: ["whois", "dns", "reputation", "company_registration"],
  region: "global",
  description: "Public DNS (dns.google) + RDAP + heuristic scam signal detection.",
};

// ── DNS over HTTPS (dns.google) ─────────────────────────────────────────────

async function dnsQuery(domain: string, type: "A" | "MX" | "NS" | "TXT"): Promise<string[]> {
  try {
    const resp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { Accept: "application/dns-json" }, cache: "no-store" }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const answers: { data: string }[] = data.Answer || data.Authority || [];
    return answers
      .map(a => a.data?.trim().replace(/\.$/,"") ?? "")
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ── RDAP domain registration info (public) ──────────────────────────────────

interface RdapResult {
  registrar?: string;
  registrationDate?: string;
  expiryDate?: string;
  registrant?: string;
  nameservers?: string[];
  country?: string;
}

async function rdapLookup(domain: string): Promise<RdapResult> {
  try {
    // Use rdap.org as a proxy which works for most TLDs
    const resp = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return {};
    const data = await resp.json();

    const events: { eventAction: string; eventDate: string }[] = data.events || [];
    const getDate = (action: string) =>
      events.find(e => e.eventAction === action)?.eventDate;

    const entities: any[] = data.entities || [];
    const registrar = entities
      .find(e => (e.roles || []).includes("registrar"))
      ?.vcardArray?.[1]?.find((v: any[]) => v[0] === "fn")?.[3] || undefined;

    const registrant = entities
      .find(e => (e.roles || []).includes("registrant"))
      ?.vcardArray?.[1]?.find((v: any[]) => v[0] === "fn")?.[3] || undefined;

    const nameservers = (data.nameservers || []).map((ns: any) => ns.ldhName || ns.unicodeName).filter(Boolean);
    const country = entities
      .flatMap((e: any) => e.vcardArray?.[1] || [])
      .find((v: any[]) => v[0] === "adr")?.[1]?.["country-name"] || undefined;

    return {
      registrar,
      registrationDate: getDate("registration"),
      expiryDate: getDate("expiration"),
      registrant,
      nameservers,
      country,
    };
  } catch {
    return {};
  }
}

// ── Heuristic scam/phishing signals ─────────────────────────────────────────

const SCAM_TLD_PATTERNS = [".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".cc", ".click", ".win", ".bid"];
const SCAM_KEYWORDS = [
  "kyc", "otp", "verify", "update-", "bank-", "paytm", "upi-", "-support",
  "helpdesk", "refund", "claim", "win-", "prize", "lucky",
  "alert-", "secure-", "login-", "-login", "reset-", "confirm-",
];
const TYPOSQUAT_PATTERNS = [
  { legit: "sbi", squats: ["sbi-", "-sbi", "sbi0", "sbii"] },
  { legit: "hdfc", squats: ["hdfc-", "-hdfc", "hdfcc"] },
  { legit: "paytm", squats: ["paytm-", "pay-tm", "paytn"] },
  { legit: "uidai", squats: ["uidaii", "uidai-", "uid-ai"] },
  { legit: "irctc", squats: ["irctcc", "irtcc", "irctc-"] },
];

function detectScamSignals(domain: string): string[] {
  const signals: string[] = [];
  const lower = domain.toLowerCase();

  for (const tld of SCAM_TLD_PATTERNS) {
    if (lower.endsWith(tld)) {
      signals.push(`Suspicious TLD: ${tld} — commonly used in phishing campaigns`);
    }
  }

  for (const kw of SCAM_KEYWORDS) {
    if (lower.includes(kw)) {
      signals.push(`Suspicious keyword in domain: "${kw}"`);
    }
  }

  for (const { legit, squats } of TYPOSQUAT_PATTERNS) {
    for (const sq of squats) {
      if (lower.includes(sq) || (lower.includes(legit) && lower !== legit)) {
        signals.push(`Possible typosquatting of "${legit.toUpperCase()}" brand`);
        break;
      }
    }
  }

  const dotCount = (domain.match(/\./g) || []).length;
  if (dotCount >= 4) {
    signals.push(`Excessive subdomain depth (${dotCount} dots) — common in phishing URLs`);
  }

  const domainPart = lower.split(".")[0] || "";
  if (domainPart.length <= 4 && /\d/.test(domainPart)) {
    signals.push("Short domain with digits — possible randomly generated phishing domain");
  }

  return signals;
}

// ── IP reputation heuristic ──────────────────────────────────────────────────

function ipReputationLinks(ip: string): NormalizedEvidence[] {
  return [
    normalizeSearchResult({
      provider: "AbuseIPDB",
      platform: null,
      query: ip,
      title: `AbuseIPDB reputation check for ${ip}`,
      snippet: "Public abuse/spam reputation database. Check for this IP's report history.",
      url: `https://www.abuseipdb.com/check/${ip}`,
      sourceType: "reputation_source",
      entityType: "ip",
      confidence: "medium",
    }),
    normalizeSearchResult({
      provider: "Shodan",
      platform: null,
      query: ip,
      title: `Shodan scan results for ${ip}`,
      snippet: "Open ports, banners, and service identification from Shodan's continuous scan.",
      url: `https://www.shodan.io/host/${ip}`,
      sourceType: "reputation_source",
      entityType: "ip",
      confidence: "medium",
    }),
    normalizeSearchResult({
      provider: "VirusTotal",
      platform: null,
      query: ip,
      title: `VirusTotal report for ${ip}`,
      snippet: "Antivirus and threat intelligence aggregation from 70+ engines.",
      url: `https://www.virustotal.com/gui/ip-address/${ip}`,
      sourceType: "reputation_source",
      entityType: "ip",
      confidence: "medium",
    }),
  ];
}

// ── Company name investigation ──────────────────────────────────────────────

function companyIntelLinks(name: string): NormalizedEvidence[] {
  return [
    normalizeSearchResult({
      provider: "MCA21",
      platform: null,
      query: name,
      title: `MCA21 company/director search for "${name}"`,
      snippet: "Government of India company registration, CIN, director details, and filing history.",
      url: "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html",
      sourceType: "legal_source",
      entityType: "company",
      confidence: "high",
    }),
    normalizeSearchResult({
      provider: "Indian Kanoon",
      platform: null,
      query: name,
      title: `Court records mentioning "${name}"`,
      snippet: "Public court judgments and legal proceedings mentioning this company.",
      url: `https://indiankanoon.org/search/?formInput=${encodeURIComponent(name)}`,
      sourceType: "legal_source",
      entityType: "company",
      confidence: "high",
    }),
    normalizeSearchResult({
      provider: "Zauba Corp",
      platform: null,
      query: name,
      title: `Zauba Corp — Company Intelligence for "${name}"`,
      snippet: "Indian company intelligence: MCA filings, annual returns, and director network.",
      url: `https://www.zaubacorp.com/search?q=${encodeURIComponent(name)}`,
      sourceType: "directory",
      entityType: "company",
      confidence: "medium",
    }),
  ];
}

// ── Main investigation function ─────────────────────────────────────────────

export async function investigateDomainOrIp(query: string): Promise<DomainIntelResult> {
  const analysedAt = new Date().toISOString();
  const q = query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Detect query type
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(q);
  const isDomain = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?\.[a-z]{2,}/.test(q) && !isIp;
  const queryType: DomainIntelResult["queryType"] = isIp ? "ip" : isDomain ? "domain" : "company";

  if (queryType === "company") {
    const refs = companyIntelLinks(query);
    return {
      query,
      queryType: "company",
      analysedAt,
      scamSignals: [],
      publicReferences: refs,
      confidence: "medium",
      analystNote:
        "Company investigation provides links to official government and public registries. " +
        "Open each source to verify company registration, director network, and legal history.",
    };
  }

  if (queryType === "ip") {
    const refs = ipReputationLinks(q);
    return {
      query: q,
      queryType: "ip",
      analysedAt,
      scamSignals: [],
      publicReferences: refs,
      confidence: "medium",
      analystNote:
        "IP reputation links are generated from public databases. Visit each source to check " +
        "abuse reports, open ports, and threat classifications.",
    };
  }

  // Domain investigation
  const [aRecords, mxRecords, nsRecords, txtRecords, whois] = await Promise.all([
    dnsQuery(q, "A"),
    dnsQuery(q, "MX"),
    dnsQuery(q, "NS"),
    dnsQuery(q, "TXT"),
    rdapLookup(q),
  ]);

  const scamSignals = detectScamSignals(q);

  // Build reputation score heuristically
  let reputationScore = 0;
  if (scamSignals.length > 0) reputationScore += scamSignals.length * 20;
  if (!whois.registrationDate) reputationScore += 10; // unknown registration = more suspicious
  if (whois.registrar && whois.registrar.toLowerCase().includes("namecheap")) reputationScore += 5;

  const reputationScore_capped = Math.min(100, reputationScore);
  const reputationLevel: DomainIntelResult["reputation"] = {
    score: reputationScore_capped,
    riskLevel:
      reputationScore_capped >= 60 ? "HIGH" :
      reputationScore_capped >= 30 ? "MEDIUM" : "LOW",
    categories: scamSignals.length > 0 ? ["phishing/scam", "suspicious"] : ["clean"],
    sources: ["heuristic", "rdap"],
  };

  // Build public reference links
  const publicReferences: NormalizedEvidence[] = [
    normalizeSearchResult({
      provider: "VirusTotal",
      platform: null,
      query: q,
      title: `VirusTotal scan results for ${q}`,
      snippet: "Multi-engine threat intelligence report. Check for malware, phishing, and scam flags.",
      url: `https://www.virustotal.com/gui/domain/${q}`,
      sourceType: "reputation_source",
      entityType: "domain",
      confidence: "medium",
    }),
    normalizeSearchResult({
      provider: "URLVoid",
      platform: null,
      query: q,
      title: `URLVoid domain report for ${q}`,
      snippet: "Domain reputation check against 30+ security blacklists.",
      url: `https://www.urlvoid.com/scan/${q}/`,
      sourceType: "reputation_source",
      entityType: "domain",
      confidence: "medium",
    }),
    normalizeSearchResult({
      provider: "Google SafeBrowsing",
      platform: null,
      query: q,
      title: `Google Safe Browsing status for ${q}`,
      snippet: "Check if this domain is flagged as dangerous by Google Safe Browsing.",
      url: `https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(q)}`,
      sourceType: "reputation_source",
      entityType: "domain",
      confidence: "high",
    }),
    ...(aRecords.length > 0
      ? aRecords.slice(0, 2).flatMap(ip => ipReputationLinks(ip))
      : []),
  ];

  const confidence: DomainIntelResult["confidence"] =
    aRecords.length > 0 && whois.registrationDate ? "high" : aRecords.length > 0 ? "medium" : "low";

  return {
    query: q,
    queryType: "domain",
    analysedAt,
    whois: Object.keys(whois).length > 0 ? whois : undefined,
    dns: {
      a: aRecords.length > 0 ? aRecords : undefined,
      mx: mxRecords.length > 0 ? mxRecords : undefined,
      ns: nsRecords.length > 0 ? nsRecords : undefined,
      txt: txtRecords.length > 0 ? txtRecords : undefined,
    },
    reputation: reputationLevel,
    scamSignals,
    publicReferences,
    confidence,
    analystNote:
      "Domain investigation uses public DNS (dns.google), RDAP registration data, and heuristic " +
      "scam signal detection. Reputation links require manual review. Do not treat heuristic " +
      "signals as definitive — verify with VirusTotal and Google Safe Browsing before action.",
  };
}

// ── Provider adapter ────────────────────────────────────────────────────────

export const domainProvider: InvestigationProvider<DomainIntelResult> = {
  name: "domain-provider",
  capability: CAPABILITY,
  async investigate(query) {
    try {
      const result = await investigateDomainOrIp(query);
      return {
        providerName: "domain-provider",
        success: true,
        evidence: result.publicReferences,
        raw: result,
        capturedAt: result.analysedAt,
      };
    } catch (err) {
      return {
        providerName: "domain-provider",
        success: false,
        evidence: [],
        error: String(err),
        capturedAt: new Date().toISOString(),
      };
    }
  },
};
