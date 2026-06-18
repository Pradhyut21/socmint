export interface AliasResult {
  platform?: string;
  handle?: string;
  profileUrl?: string;
  isAlias?: boolean;
  confidence: number;
  confidenceLevel?: "CONFIRMED" | "PROBABLE" | "POSSIBLE" | string;
  aliasSignals?: string[];
  evasionPattern?: boolean;
  evasionReason?: string;
  alias?: string;
  source?: string;
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
  id?: string;
  platform: string;
  tier?: 1 | 2;
  username: string;
  profileUrl?: string;
  displayName?: string;
  bio: string;
  profilePicUrl?: string;
  deepfakeFlag?: boolean;
  followers: number;
  creationDate?: string;
  confidence?: "CONFIRMED" | "PROBABLE" | "POSSIBLE";
  reason?: string;
  capturedAt?: string;
  url?: string;
  verified?: boolean;
  lastActive?: string;
}

export interface Post {
  id: string;
  platform: string;
  content: string;
  postedAt?: string;
  mediaUrls?: string[];
  geolat?: number;
  geolng?: number;
  locationName?: string;
  flagLevel?: "NORMAL" | "SUSPICIOUS" | "HIGH_RISK" | string;
  flagReason?: string;
  capturedAt?: string;
  timestamp?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  sentiment?: string;
}

export interface LegalRecord {
  id: string;
  source?: string;
  recordType?: "Court Case" | "Court Judgment" | "News" | "Company" | "Company Registration" | "Academic" | string;
  title: string;
  summary?: string;
  status?: string;
  date: string;
  url?: string;
  sourceUrl?: string;
  credibilityScore?: "HIGH" | "MEDIUM" | "LOW" | number;
  credibilityLevel?: "HIGH" | "MEDIUM" | "LOW";
  capturedAt?: string;
  court?: string;
  severity?: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  group: "suspect" | "account" | "person" | "group" | "mule" | "self" | "alias" | "crypto" | "legal" | string;
  val?: number;
  size?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  type?: "OWNS" | "INTERACTS_WITH" | "MEMBER_OF" | "CO_ACCUSED" | string;
  weight?: number;
  strength?: number;
  label?: string;
}

export interface ShadowAccountResult {
  handle: string;
  platform: string;
  profileUrl?: string;
  detectionMethod?: string;
  handleSimilarity?: number;
  bioCrossRef?: number;
  avatarMatch?: number;
  overallConfidence?: number;
  confidenceLevel?: "CONFIRMED" | "PROBABLE" | "POSSIBLE" | string;
  signals?: string[];
  isPrivate?: boolean;
  createdAt?: string;
  evasionScore?: number;
  status?: string;
}

export interface CryptoTransaction {
  hash: string;
  timestamp?: string;
  from?: string;
  to?: string;
  amount: number | string;
  type?: "INCOMING" | "OUTGOING" | string;
  mixerFlag?: boolean;
  mixerName?: string;
  riskScore?: number;
  counterparty?: string;
  date?: string;
}

export interface CryptoTraceResult {
  address?: string;
  coin?: "BTC" | "ETH" | "LTC" | string;
  balance?: number | string;
  totalReceived?: number;
  totalSent?: number;
  riskScore?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  associatedMixers?: string[];
  transactions: CryptoTransaction[];
  note?: string;
  wallets?: {
    chain: string;
    address: string;
    balance: string;
    flagged: boolean;
  }[];
}

export interface FaceScanMetadata {
  landmarks: { name: string; x: number; y: number; width: number; height: number }[];
  exif: {
    camera: string;
    lens: string;
    software: string;
    created: string;
    gps: {
      lat: string;
      lng: string;
      place: string;
    };
  };
  deepfake: {
    isSynthetic: boolean;
    score: number;
    note: string;
    factors: { name: string; score: number }[];
  };
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
  upiFootprint?: UpiFootprint | any;
  financialFootprint?: FinancialFootprint;
  hibpResult?: HibpResult | any;
  newsArticles?: NewsArticle[] | any[];
  nexusAnalysis?: NexusAnalysis;
  shadowAccounts?: ShadowAccountResult[];
  cryptoTrace?: CryptoTraceResult;
  faceScan?: FaceScanMetadata | any;
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

export interface DossierInput {
  usernames: string[];
  realName: string;
  email: string;
  phone: string;
  faceData: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AlertItem {
  id: string;
  title: string;
  details: string;
  timestamp: string;
  type: "critical" | "warning" | "info";
  isRead?: boolean;
}

export interface TruecallerRecord {
  name: string;
  carrier: string;
  circle: string;
  spamScore: number;
  spamReports: number;
  tags: string[];
}

export interface NcrpComplaint {
  id: string;
  date: string;
  category: string;
  status: "OPEN" | "UNDER_INVESTIGATION" | "CLOSED";
  amountInr?: number;
  jurisdiction: string;
}

export interface FinancialFootprint {
  upi: {
    handles: string[];
    banks: string[];
    lastSeen: string;
  };
  truecaller: TruecallerRecord;
  ncrp: NcrpComplaint[];
  bankAccounts?: { bank: string; ifsc: string; accountMasked: string; flagged: boolean }[];
}

export interface DossierQuery {
  username?: string;
  realName?: string;
  phone?: string;
  email?: string;
  faceImage?: string;
}




