export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PlatformAccount {
  platform: string;
  username: string;
  url: string;
  verified?: boolean;
  followers?: number;
  bio?: string;
  lastActive?: string;
  displayName?: string;
  creationDate?: string;
  id?: string;
}

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

export interface Post {
  id: string;
  platform: string;
  content: string;
  timestamp: string;
  engagement?: { likes: number; comments: number; shares: number };
  sentiment?: "positive" | "neutral" | "negative";
}

export interface LegalRecord {
  id: string;
  title: string;
  court: string;
  date: string;
  status: string;
  severity: RiskLevel;
}

export interface AliasResult {
  alias: string;
  source: string;
  confidence: number;
}

export interface ShadowAccountResult {
  platform: string;
  handle: string;
  createdAt: string;
  evasionScore: number;
  status: "ACTIVE" | "DELETED" | "DORMANT";
}

export interface CryptoTraceResult {
  wallets: { chain: string; address: string; balance: string; flagged: boolean }[];
  transactions: { hash: string; amount: string; counterparty: string; date: string }[];
}

export interface FaceScanMetadata {
  matchScore: number;
  deepfakeProbability: number;
  matches: { source: string; url: string; confidence: number }[];
}

export interface NetworkNode { id: string; label: string; group: string; size: number }
export interface NetworkLink { source: string; target: string; strength: number; label?: string }

export interface NewsArticle { title: string; source: string; url: string; date: string; snippet: string }
export interface HibpResult { breaches: { name: string; date: string; data: string[] }[] }
export interface UpiFootprint { handles: string[]; banks: string[]; lastSeen: string }

export interface TruecallerRecord {
  name: string;
  carrier: string;
  circle: string;
  spamScore: number; // 0-100
  spamReports: number;
  tags: string[];
}

export interface NcrpComplaint {
  id: string;
  date: string;
  category: string; // e.g. "Online Financial Fraud"
  status: "OPEN" | "UNDER_INVESTIGATION" | "CLOSED";
  amountInr?: number;
  jurisdiction: string;
}

export interface FinancialFootprint {
  upi: UpiFootprint;
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

export interface NexusAnalysis {
  key_finding: string;
  connected_signals: { signal1: string; signal2: string; connection: string }[];
  anomalies: { description: string; severity: RiskLevel }[];
  investigator_priority: string;
}

export interface SuspectProfile {
  username: string;
  realName: string;
  phoneNumber: string;
  emailAddress: string;
  photoUrl: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskSubscores: { language: number; behavioral: number; network: number; legal: number };
  riskSignals: string[];
  accounts: PlatformAccount[];
  posts: Post[];
  legalRecords: LegalRecord[];
  aliasResults: AliasResult[];
  upiFootprint?: UpiFootprint;
  financialFootprint?: FinancialFootprint;
  hibpResult?: HibpResult;
  newsArticles?: NewsArticle[];
  nexusAnalysis?: NexusAnalysis;
  shadowAccounts?: ShadowAccountResult[];
  cryptoTrace?: CryptoTraceResult;
  faceScan?: FaceScanMetadata;
  network: { nodes: NetworkNode[]; links: NetworkLink[] };
  discovered_usernames?: any[];
  locations: {
    lat: number; lng: number; locationName: string; date: string; source: string; details: string;
    crimeMatched?: { title: string; date: string; recordId: string; severity: RiskLevel };
  }[];
  caseReference: string;
  capturedAt: string;
}

export interface AlertItem {
  id: string;
  title: string;
  details: string;
  timestamp: string;
  type: "critical" | "warning" | "info";
  isRead?: boolean;
}

export interface DossierInput {
  usernames: string[];
  realName: string;
  phone: string;
  email: string;
  faceData: string;
}
