/**
 * SOCMINT Shield — Demo / Mock Data Module
 * 
 * All hardcoded demo profiles (hackathon subjects) live here.
 * This keeps liveSocmint.ts clean and makes it easy to tell
 * real OSINT logic from demo data.
 */

import { PlatformAccount, Post, LegalRecord, SuspectProfile, LinkedinIntelligence, ForensicField } from "../types";

// ── Demo user detection ───────────────────────────────────────────────

function isPradhyutVariant(str: string): boolean { return false; }

function isMeghanaVariant(str: string): boolean { return false; }

export function isDemoUser(username: string): boolean {
  const lower = username.toLowerCase();
  return (
    lower.includes("shadowtrader99") ||
    lower.includes("sneha_fintech") ||
    lower.includes("kulkarni_sneha") ||
    isPradhyutVariant(lower) ||
    isMeghanaVariant(lower)
  );
}

// ── Demo probe overrides ─────────────────────────────────────────────
// Returns a mock HTTP probe result for known demo usernames on certain platforms.

export function getDemoProbeResult(
  lowercaseUrl: string
): { ok: boolean; status: number; title?: string; description?: string } | null {
  if (lowercaseUrl.includes("shadowtrader99")) {
    if (lowercaseUrl.includes("linkedin")) {
      return {
        ok: true,
        status: 200,
        title: "Vikram Rathore | LinkedIn",
        description:
          "Blockchain developer & DeFi researcher. Attended DevFest Delhi in Oct 2025. Speaker at local meetups. Ex-Fintech contractor.",
      };
    }
    if (lowercaseUrl.includes("github")) {
      return {
        ok: true,
        status: 200,
        title: "shadowtrader99 (Vikram Rathore) · GitHub",
        description:
          "Full stack DeFi builder. Hackathon participant at EthIndia Bengaluru Dec 2025. Exploring decentralized liquidity.",
      };
    }
  }

  if (
    lowercaseUrl.includes("sneha_fintech") ||
    lowercaseUrl.includes("kulkarni_sneha")
  ) {
    if (lowercaseUrl.includes("linkedin")) {
      return {
        ok: true,
        status: 200,
        title: "Sneha Kulkarni | LinkedIn",
        description:
          "Risk Analyst & Cryptography enthusiast. DevFest Mumbai Sep 2025 participant. Working on secure payment systems.",
      };
    }
    if (lowercaseUrl.includes("github")) {
      return {
        ok: true,
        status: 200,
        title: "sneha_fintech (Sneha Kulkarni) · GitHub",
        description: "Fintech security research. Winner of Smart India Hackathon Pune, Nov 2025.",
      };
    }
  }

  return null; // not a demo URL
}

// ── Demo GitHub activity ──────────────────────────────────────────────

export function getDemoGithubData(
  username: string
): { account: Partial<PlatformAccount>; posts: Post[]; resolvedUsername?: string } | null {
  const lower = username.toLowerCase();
  if (lower.includes("shadowtrader99")) {
    return {
      account: {
        displayName: "Vikram Rathore",
        bio: "Full stack DeFi builder. Hackathon participant at EthIndia Bengaluru Dec 2025. Exploring decentralized liquidity.",
        profilePicUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Vikram%20Rathore",
        followers: 128,
        creationDate: "2024-06-20",
      },
      posts: [
        {
          id: "github-sh-1",
          platform: "github",
          content:
            "Pushed 4 commits to repository 'defi-liquidity-pools': 'implement multi-sig bypass fix' and 'optimize gas cost'",
          postedAt: "2025-12-05T18:30:00Z",
          flagLevel: "NORMAL",
          capturedAt: new Date().toISOString(),
        },
        {
          id: "github-sh-2",
          platform: "github",
          content:
            "Pushed 2 commits to repository 'mixer-audit': 'drafting zero knowledge mixer proof validation'",
          postedAt: "2025-09-08T10:00:00Z",
          flagLevel: "NORMAL",
          capturedAt: new Date().toISOString(),
        },
        {
          id: "github-sh-3",
          platform: "github",
          content:
            "Pushed 1 commit to repository 'eth-global-london': 'initial repo structure and smart contract boilerplates'",
          postedAt: "2025-03-02T15:45:00Z",
          flagLevel: "NORMAL",
          capturedAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (lower.includes("sneha_fintech") || lower.includes("kulkarni")) {
    return {
      account: {
        displayName: "Sneha Kulkarni",
        bio: "Fintech security research. Winner of Smart India Hackathon Pune, Nov 2025.",
        profilePicUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Sneha%20Kulkarni",
        followers: 94,
        creationDate: "2024-01-15",
      },
      posts: [
        {
          id: "github-sn-1",
          platform: "github",
          content:
            "Pushed 5 commits to repository 'transaction-monitor': 'add secure signature validation filter'",
          postedAt: "2025-11-12T14:20:00Z",
          flagLevel: "NORMAL",
          capturedAt: new Date().toISOString(),
        },
        {
          id: "github-sn-2",
          platform: "github",
          content:
            "Pushed 1 commit to repository 'security-workshop-berlin': 'setup presentation slides and code templates'",
          postedAt: "2025-04-18T09:15:00Z",
          flagLevel: "NORMAL",
          capturedAt: new Date().toISOString(),
        },
      ],
    };
  }

  return null;
}

// ── Demo extra accounts (cross-platform accounts for a demo user) ─────
// Returns additional PlatformAccount entries that cannot be discovered
// via standard HTTP probes (e.g. different usernames on other platforms).

export function getDemoExtraAccounts(
  username: string,
  capturedAt: string
): PlatformAccount[] {
  const lower = username.toLowerCase();
  return [];
}

// ── Demo UPI footprint (specific per-user override) ───────────────────
// Returns a structured UPI footprint for demo users so the generic phone-based
// generator is not used, avoiding hallucinated handles.

export function getDemoUpiFootprint(username: string): any | undefined {
  const lower = username.toLowerCase();

  return undefined;
}

// ── Demo legal records ────────────────────────────────────────────────

export function getDemoLegalRecords(
  username: string,
  realName: string,
  capturedAt: string
): LegalRecord[] {
  const lower = username.toLowerCase();
  const lowerName = realName.toLowerCase();
  const records: LegalRecord[] = [];

  if (lower.includes("shadowtrader99") || lowerName.includes("vikram")) {
    records.push(
      {
        id: "mock-crime-blr",
        source: "Karnataka Police Cyber Cell",
        recordType: "Court Case",
        title: "Cyber Crime Complaint - Indiranagar, Bengaluru (FIR 345/2025)",
        summary:
          "Complaint filed on 2025-12-06 regarding unauthorized crypto transfer and escrow bypass matching indicators of shadowtrader99.",
        date: "2025-12-06",
        url: "https://ecourts.gov.in",
        credibilityScore: 95,
        credibilityLevel: "HIGH",
        capturedAt,
      },
      {
        id: "mock-crime-del",
        source: "Delhi Police Cyber Cell",
        recordType: "Court Case",
        title: "UPI Fraud Complaint - Rohini, Delhi (FIR 812/2025)",
        summary:
          "Investigation report from Delhi Police Cyber Cell detailing money mule account routing. Timeframe overlaps with DevFest Delhi in Oct 2025.",
        date: "2025-10-20",
        url: "https://ecourts.gov.in",
        credibilityScore: 95,
        credibilityLevel: "HIGH",
        capturedAt,
      }
    );
  }

  if (lower.includes("sneha") || lowerName.includes("sneha")) {
    records.push(
      {
        id: "mock-crime-pune",
        source: "Maharashtra Police IT Cell",
        recordType: "Court Case",
        title: "Financial Analytics Security Audit - Pune (FIR 412/2025)",
        summary:
          "Audit registry filed on 2025-11-15 during Smart India Hackathon Pune regarding testing of unauthorized payment bypasses.",
        date: "2025-11-15",
        url: "https://ecourts.gov.in",
        credibilityScore: 95,
        credibilityLevel: "HIGH",
        capturedAt,
      },
      {
        id: "mock-crime-mum",
        source: "Mumbai Cyber Crime Cell",
        recordType: "Court Case",
        title: "UPI Phishing Investigation - Andheri, Mumbai (REG 118/2025)",
        summary:
          "Preliminary FIR mentioning a handle similar to kulkarni_sneha in a structured UPI phishing ring active in Sep 2025.",
        date: "2025-09-25",
        url: "https://ecourts.gov.in",
        credibilityScore: 90,
        credibilityLevel: "HIGH",
        capturedAt,
      }
    );
  }

  return records;
}

// ── Full face-scan demo profile (new suspect mode) ────────────────────

export function getDemoNewSuspectProfile(
  photoUrl: string,
  capturedAt: string
): Omit<SuspectProfile, "faceScan" | "network" | "caseReference"> {
  const realName = "Rajesh Kumar";
  const username = "rk_crypto_dev";
  const phoneNumber = "+91 99887 76655";
  const emailAddress = "rk_crypto@proton.me";

  const accounts: PlatformAccount[] = [
    {
      id: "github-rk_crypto_dev",
      platform: "github",
      tier: 1,
      username: "rk_crypto_dev",
      profileUrl: "https://github.com/rk_crypto_dev",
      displayName: "Rajesh Kumar",
      bio: "Blockchain architect and open source builder. Active in Bengaluru Web3 developer groups.",
      profilePicUrl: photoUrl,
      deepfakeFlag: false,
      followers: 45,
      creationDate: "2024-03-10",
      confidence: "CONFIRMED",
      reason: "Matched during automated forensic face indexing sweep.",
      capturedAt,
    },
    {
      id: "twitter-rk_crypto_dev",
      platform: "twitter",
      tier: 2,
      username: "rk_crypto_dev",
      profileUrl: "https://x.com/rk_crypto_dev",
      displayName: "Rajesh Web3",
      bio: "DeFi protocols, smart contract audits, and zero knowledge scaling. Sourced in Indiranagar.",
      deepfakeFlag: false,
      followers: 210,
      creationDate: "2024-05-15",
      confidence: "PROBABLE",
      reason: "Handle and Bio correlation search.",
      capturedAt,
    },
  ];

  const posts: Post[] = [
    {
      id: "post-rk-1",
      platform: "github",
      content: "Pushed 3 commits to repository 'liquidity-engine': 'secure multi-sig contract revisions'",
      postedAt: "2026-05-24T10:15:00Z",
      flagLevel: "NORMAL",
      capturedAt,
    },
    {
      id: "post-rk-2",
      platform: "twitter",
      content:
        "Exploring off-grid mixers. Layer 2 transactions are starting to show grid trace vulnerabilities.",
      postedAt: "2026-05-25T14:30:00Z",
      flagLevel: "SUSPICIOUS",
      flagReason: "DeFi mixer keywords flagged.",
      capturedAt,
    },
  ];

  const legalRecords: LegalRecord[] = [
    {
      id: "legal-rk-1",
      source: "Karnataka Police Cyber Cell",
      recordType: "Court Case",
      title: "Cyber Cell Enquiry - Halasuru, Bengaluru (FIR 109/2026)",
      summary:
        "Preliminary investigation on transaction routing related to mirror payments and unauthorized smart contract sweeps.",
      date: "2026-05-28",
      url: "https://ecourts.gov.in",
      credibilityScore: 90,
      credibilityLevel: "HIGH",
      capturedAt,
    },
  ];

  return {
    username: `@${username}`,
    realName,
    phoneNumber,
    emailAddress,
    photoUrl,
    riskScore: 65,
    riskLevel: "HIGH",
    riskSubscores: { language: 15, behavioral: 20, network: 15, legal: 15 },
    riskSignals: [
      "2 platform accounts identified with face matching tags.",
      "Committed contract code mentions unverified local liquidity pools.",
      "Karnataka Police Cyber Cell FIR record matches suspect details in Bengaluru.",
      "EXIF tags from uploaded image place suspect at crime-scene Indiranagar, Bengaluru within 4 days of FIR.",
    ],
    accounts,
    posts,
    legalRecords,
    aliasResults: [
      {
        platform: "Telegram",
        handle: "rk_alpha_yield",
        profileUrl: "https://t.me/rk_alpha_yield",
        isAlias: true,
        confidence: 78,
        confidenceLevel: "PROBABLE",
        aliasSignals: ["Bio writing style correlation", "Activity time matching"],
        evasionPattern: true,
        evasionReason: "Alternate handle using standard evasion patterns.",
      },
    ],
    shadowAccounts: [
      {
        handle: "rk_stealth_node",
        platform: "github",
        profileUrl: "https://github.com/rk_stealth_node",
        detectionMethod: "Levenshtein distance matching",
        handleSimilarity: 68,
        bioCrossRef: 75,
        avatarMatch: 0,
        overallConfidence: 71,
        confidenceLevel: "PROBABLE",
        signals: ["Writing style overlap", "Shared GPG keys"],
        isPrivate: false,
      },
    ],
    locations: [
      {
        lat: 12.9716,
        lng: 77.5946,
        locationName: "Bengaluru",
        date: "2026-05-24",
        source: "Face Scan EXIF",
        details: "Geotag parsed from EXIF metadata in uploaded face image.",
      },
    ],
    capturedAt,
  };
}

export function getDemoEducationAndExperience(username: string): {
  resumeUrl?: string;
  education?: { institution: string; degree: string; period: string }[];
  experience?: { role: string; company: string; period: string; details: string }[];
} {
  const lower = username.toLowerCase();
  if (lower.includes("shadowtrader99") || lower.includes("vikram")) {
    return {
      resumeUrl: "https://www.linkedin.com/in/vikram-rathore/resume-pdf",
      education: [
        {
          institution: "Indian Institute of Technology (IIT) Delhi",
          degree: "B.Tech in Computer Science & Engineering",
          period: "2020 - 2024",
        },
      ],
      experience: [
        {
          role: "Lead Blockchain Researcher",
          company: "DeFi Labs Delhi",
          period: "June 2024 - Present",
          details: "Audited multi-sig smart contracts, gas optimization scripts, and decentralized liquidity pools. Designed proof-of-concept for Zero-Knowledge Mixer systems.",
        },
      ],
    };
  }

  if (lower.includes("sneha") || lower.includes("kulkarni")) {
    return {
      resumeUrl: "https://www.linkedin.com/in/sneha-kulkarni/resume-pdf",
      education: [
        {
          institution: "Pune Institute of Computer Technology (PICT)",
          degree: "B.E. in Information Technology",
          period: "2021 - 2025",
        },
      ],
      experience: [
        {
          role: "Cyber Security Analyst Intern",
          company: "Maharashtra Police Cyber Forensic Division",
          period: "Jan 2025 - Present",
          details: "Assisted in tracking UPI money-mule accounts and phishing networks. Generated credibility score metrics for online records.",
        },
      ],
    };
  }

  return {};
}

export function getDemoLinkedinData(username: string): LinkedinIntelligence | null {
  const lower = username.toLowerCase();
    const isShadow = lower.includes("shadowtrader99") || lower.includes("vikram");
  const isSneha = lower.includes("sneha") || lower.includes("kulkarni");

  if (!isShadow && !isSneha) {
    return null;
  }

  let fullName = "";
  let headline = "";
  let bio = "";
  let avatarUrl = "";
  let followers = 0;
  let creationDate = "";
  let profileUrl = "";

  if (isShadow) {
    fullName = "Vikram Rathore";
    headline = "Blockchain developer & DeFi researcher. Speaker at local meetups. Ex-Fintech contractor.";
    bio = headline;
    avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200";
    followers = 780;
    creationDate = "2020-04-12";
    profileUrl = "https://www.linkedin.com/in/vikram-rathore";
  } else if (isSneha) {
    fullName = "Sneha Kulkarni";
    headline = "Risk Analyst & Cryptography enthusiast. DevFest Mumbai Sep 2025 participant. Working on secure payment systems.";
    bio = headline;
    avatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200";
    followers = 410;
    creationDate = "2022-06-18";
    profileUrl = "https://www.linkedin.com/in/sneha-kulkarni";
  }

  const demoEduAndExp = getDemoEducationAndExperience(username);
  
  const source = "LinkedIn Intelligence Engine (Demo)";
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

  const experiences = (demoEduAndExp.experience || []).map(exp => ({
    title: wrap(exp.role),
    company: wrap(exp.company),
    description: wrap(exp.details),
    duration: wrap(exp.period),
  }));

  const educations = (demoEduAndExp.education || []).map(edu => ({
    institution: wrap(edu.institution),
    degree: wrap(edu.degree),
    duration: wrap(edu.period),
  }));

  return {
    fullName: wrap(fullName),
    headline: wrap(headline),
    location: wrap("Bengaluru, Karnataka, India"),
    avatarUrl: wrap(avatarUrl),
    profileUrl: wrap(profileUrl),
    currentRole: experiences[0] ? experiences[0].title : undefined,
    currentCompany: experiences[0] ? experiences[0].company : undefined,
    summary: wrap(bio),
    experiences,
    educations,
    skills: [wrap("Full-Stack Development"), wrap("TypeScript"), wrap("React"), wrap("REST APIs")],
  };
}
