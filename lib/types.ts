export interface AliasResult {
  platform: string;
  handle: string;
  profileUrl: string;
  isAlias: boolean;
  confidence: number;
  confidenceLevel: "CONFIRMED" | "PROBABLE" | "POSSIBLE";
  aliasSignals: string[];
  evasionPattern: boolean;
  evasionReason?: string;
}

export interface UpiFootprint {
  phone: string;
  probableUpiIds: {
    id: string;
    confidence: "INFERRED";
    source: string;
  }[];
  ncrp: {
    status: "NOT_PUBLICLY_QUERYABLE" | "FOUND_PUBLIC_MENTION";
    complaintCount?: number;
    note: string;
    sourceUrl: string;
  };
  truecaller: {
    status: "NOT_CONFIGURED" | "PUBLIC_DATA_UNAVAILABLE";
    name?: string;
    spamScore?: number;
    carrier?: string;
    telecomCircle?: string;
    note: string;
  };
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: "NEUTRAL" | "NEGATIVE" | "POSITIVE";
  relevanceScore: number;
}

export interface NexusAnalysis {
  key_finding: string;
  connected_signals: { signal1: string; signal2: string; connection: string }[];
  anomalies: { description: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }[];
  investigator_priority: string;
}

export interface BreachRecord {
  name: string;
  breachDate: string;
  dataClasses: string[];
  description: string;
  domain: string;
  isVerified: boolean;
  pwnCount: number;
}

export interface HibpResult {
  email: string;
  breachCount: number;
  breaches: BreachRecord[];
  pasteCount: number;
  status: "FOUND" | "CLEAN" | "NOT_CONFIGURED" | "ERROR";
  note: string;
  checkedAt: string;
}

export interface PlatformAccount {
  id: string;
  platform: "instagram" | "twitter" | "facebook" | "telegram" | "reddit" | "linkedin" | "github" | "quora"
    | "hackernews" | "devto" | "gitlab" | "tumblr" | "tiktok" | "snapchat" | "pinterest"
    | "soundcloud" | "medium" | "steam" | "pastebin" | "youtube";
  tier?: 1 | 2;
  username: string;
  profileUrl: string;
  displayName: string;
  bio: string;
  profilePicUrl?: string;
  deepfakeFlag: boolean;
  followers: number;
  creationDate: string;
  confidence: "CONFIRMED" | "PROBABLE" | "POSSIBLE";
  reason: string;
  capturedAt?: string;
}

export interface Post {
  id: string;
  platform: string;
  content: string;
  postedAt: string;
  mediaUrls?: string[];
  geolat?: number;
  geolng?: number;
  locationName?: string;
  flagLevel: "NORMAL" | "SUSPICIOUS" | "HIGH_RISK";
  flagReason?: string;
  capturedAt?: string;
}

export interface LegalRecord {
  id: string;
  source: string;
  recordType: "Court Case" | "Court Judgment" | "News" | "Company" | "Company Registration" | "Academic";
  title: string;
  summary: string;
  status?: string;
  date: string;
  url: string;
  sourceUrl?: string;
  credibilityScore: "HIGH" | "MEDIUM" | "LOW" | number;
  credibilityLevel?: "HIGH" | "MEDIUM" | "LOW";
  capturedAt?: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  group: "suspect" | "account" | "person" | "group" | "mule";
  val: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  type: "OWNS" | "INTERACTS_WITH" | "MEMBER_OF" | "CO_ACCUSED";
  weight: number;
}

export interface SuspectProfile {
  username: string;
  realName: string;
  phoneNumber: string;
  emailAddress: string;
  photoUrl: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskSubscores: {
    language: number;
    behavioral: number;
    network: number;
    legal: number;
  };
  riskSignals: string[];
  accounts: PlatformAccount[];
  posts: Post[];
  legalRecords: LegalRecord[];
  aliasResults: AliasResult[];
  upiFootprint?: UpiFootprint;
  hibpResult?: HibpResult;
  newsArticles?: NewsArticle[];
  nexusAnalysis?: NexusAnalysis;
  network: {
    nodes: NetworkNode[];
    links: NetworkLink[];
  };
  locations: {
    lat: number;
    lng: number;
    locationName: string;
    date: string;
    source: string;
    details: string;
    crimeMatched?: {
      title: string;
      date: string;
      recordId: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    };
  }[];
  caseReference: string;
  capturedAt: string;
}
