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
  createdAt?: string;
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
    status: "NOT_CONFIGURED" | "PUBLIC_DATA_UNAVAILABLE" | "SUCCESS";
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

export interface PlatformStatus {
  name: string;
  status: "Online" | "Rate Limited" | "Unavailable" | "FOUND" | "NOT FOUND" | "RATE LIMITED" | "FOUND (PARTIAL)" | "PRIVATE" | "UNAVAILABLE";
  responseTimeMs: number;
  requestsRemaining?: number;
  reason?: string;
}

export interface NexusAnalysis {
  key_finding: string;
  connected_signals: { signal1: string; signal2: string; connection: string }[];
  anomalies: { description: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }[];
  investigator_priority: string;
  investigator_brief?: string;
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
  /** Enriched GitHub intelligence — populated by fetchGithubActivity */
  githubIntel?: GithubIntelligence;
  /** Enriched Reddit intelligence — populated by fetchRedditActivity */
  redditIntel?: RedditIntelligence;
  /** Enriched LinkedIn intelligence — populated by LinkedInProvider */
  linkedinIntel?: LinkedinIntelligence;
  /** LinkedIn extraction fields — parsed from public HTML meta tags */
  jobTitle?: string;
  company?: string;
  education?: string;
  headline?: string;
  mergeJustification?: string;
}



// ─── GitHub Intelligence ─────────────────────────────────────────────────────

export interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  homepage: string | null;
  createdAt: string;
  pushedAt: string;
  url: string;
}

export interface GithubIntelligence {
  login: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  createdAt: string;        // account creation date
  updatedAt: string;        // last profile update
  accountAgeDays: number;   // computed from createdAt
  topRepos: GithubRepo[];   // top 3 by star count
  techStack: string[];      // unique languages across top-10 repos
  organizations: { login: string; description: string | null }[];
  primaryLanguage?: string;
  mostStarredRepo?: string;
  totalStars?: number;
  totalForks?: number;
  repoCategories?: { category: string; count: number }[];
  allTopics?: string[];
  seniorityEstimate?: "Senior Developer" | "Mid-Level Developer" | "Junior / Hobbyist Developer";
}


// ─── Reddit Intelligence ──────────────────────────────────────────────────────

export interface RedditIntelligence {
  commentKarma: number;
  linkKarma: number;
  totalKarma: number;
  cakeDay: string;          // ISO date
  isGold: boolean;
  verified: boolean;
  topSubreddits: { subreddit: string; count: number }[];  // sorted desc
  postingFrequency: number;   // average posts per week (last 25)
  topKeywords: string[];      // top 10 words from post titles
  accountAgeDays: number;
}


// ─── LinkedIn Intelligence ──────────────────────────────────────────────────

export interface DetailedSource {
  engine: "Bing" | "DuckDuckGo" | "Yahoo" | "Wayback";
  confidence: number;
  extractedAt: string;
  value: string;
}

export interface ForensicField<T> {
  value: T;
  source: string; // e.g. "LinkedIn Public Profile", "LinkedIn Voyager API"
  acquisitionMethod: "PUBLIC_METADATA" | "AUTHENTICATED_SESSION" | "SEARCH_INDEX_MAPPED";
  confidence: number; // 0-100
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "INFERRED";
  sources?: DetailedSource[];
}

export interface SearchEngineEvidence {
  engine: "Bing" | "DuckDuckGo" | "Yahoo" | "Wayback";
  query: string;
  searchedAt: string;
  success: boolean;
  responseTimeMs: number;
  profileUrl?: string;
  title?: string;
  snippet?: string;
  fieldsExtracted: string[];
  confidence: number;
  rawSource?: string;
}

export interface LinkedinIntelligence {
  fullName?: ForensicField<string>;
  headline?: ForensicField<string>;
  location?: ForensicField<string>;
  avatarUrl?: ForensicField<string>;
  profileUrl: ForensicField<string>;
  currentRole?: ForensicField<string>;
  currentCompany?: ForensicField<string>;
  summary?: ForensicField<string>;
  experiences: Array<{
    title: ForensicField<string>;
    company: ForensicField<string>;
    duration?: ForensicField<string>;
    description?: ForensicField<string>;
    startDate?: ForensicField<string>;
    endDate?: ForensicField<string>;
  }>;
  educations: Array<{
    institution: ForensicField<string>;
    degree?: ForensicField<string>;
    fieldOfStudy?: ForensicField<string>;
    duration?: ForensicField<string>;
  }>;
  skills: Array<ForensicField<string>>;
  organizations?: Array<{
    name: ForensicField<string>;
    role?: ForensicField<string>;
  }>;
  acquisitionLogs?: SearchEngineEvidence[];
  mergeMatrix?: Record<string, Record<string, "Found" | "Partial" | "Unavailable">>;
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
  exif?: {
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
  investigationSteps?: string[];
  platformStatuses?: PlatformStatus[];
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
  domainIntel?: any;
  toolkitExecutions?: ToolkitExecution[];
  toolkitFindings?: NormalizedFinding[];
  waybackArchive?: import("./fetchers/wayback").WaybackArchiveResult;
  contactDiscovery?: import("./fetchers/contactDiscovery").ContactDiscoveryResult;
  evidenceGraph?: EvidenceGraphData;
  reasoningSteps?: ReasoningStep[];
  evidenceAttribution?: Record<string, FieldAttribution>;
  investigationQuality?: {
    score: number;
    reason: string;
    breakdown: {
      searched: number;
      responded: number;
      evidenceCount: number;
      verifiedCount: number;
      correlationStrength: number;
      timelineCount: number;
      aiConfidence: number;
    };
  };
  evidenceReliability?: ReliableEvidenceItem[];
  developerFingerprint?: PlatformComparison;
  bioSimilarity?: SemanticSimilarityResult;
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
  resumeUrl?: string;
  education?: {
    institution: string;
    degree: string;
    period: string;
    webEnriched?: boolean;
    website?: string;
    description?: string;
  }[];
  experience?: {
    role: string;
    company: string;
    period: string;
    details: string;
  }[];
  hackathons?: {
    name: string;
    result: string;
    year: string;
    source: string;
  }[];
  darkWebPastes?: {
    id: string;
    platform: string;
    title: string;
    snippet: string;
    url: string;
    postedAt: string;
    riskTag: string;
  }[];
  searchIntel?: SearchIntelBundle;
  suggestedProfiles?: {
    name: string;
    platform: string;
    handle: string;
    profileUrl: string;
    bio?: string;
    followers?: number;
    matchScore: number; // 0-100, how well the name prefix matches
  }[];
}

export interface SearchIntelQuery {
  id: string;
  label: string;
  query: string;
  category: string;
  entityType: string;
  notes?: string;
}

export interface SearchIntelResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  matchedQueryIds: string[];
  categories: string[];
  confidence: "high" | "medium" | "low";
  riskTags: string[];
  origin: "seed" | "live";
  executedAt: string;
  metadata?: Record<string, any>;
}

export interface SearchIntelBundle {
  entityType: string;
  entityValue: string;
  queries: SearchIntelQuery[];
  results: SearchIntelResult[];
  summary?: string;
  notes?: string;
  contextHints?: {
    names: string[];
    colleges: string[];
    companies: string[];
  };
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

// ─── New extension types (Phase 2) ────────────────────────────────────────

/** Normalized evidence schema shared by all providers and modules */
export interface NormalizedEvidence {
  provider: string;
  platform: string | null;
  entity_type:
    | "phone" | "email" | "username" | "domain" | "company" | "ip"
    | "social_profile" | "channel" | "post" | "comment" | "upi_handle";
  query: string;
  title: string;
  snippet: string;
  url: string | null;
  source_type:
    | "official_site" | "public_social_profile" | "directory" | "forum"
    | "scam_report" | "reputation_source" | "telecom_metadata" | "breach_summary"
    | "geo_source" | "legal_source" | "upi_source" | "manual_ingest"
    | "post_capture" | "other";
  confidence: "high" | "medium" | "low";
  metadata: Record<string, unknown>;
}

/** A pinned / captured evidence artifact (for chain-of-custody) */
export interface EvidenceArtifact {
  id: string;
  caseReference: string;
  sourcePlatform: string;
  sourceUrl: string | null;
  retrievedAt: string;           // ISO timestamp of capture
  query: string;                 // investigation query that produced it
  title: string;
  textSnapshot: string;          // normalized text content captured
  metadataSnapshot: Record<string, unknown>;
  sha256: string;               // hex hash of textSnapshot
  screenshotPath?: string;      // optional image path/data URL
  analystNotes?: string;
  tags: string[];
  provenance: string;           // which module/provider retrieved it
}

/** Content risk analysis result for a public text post */
export interface ContentRiskResult {
  inputText: string;
  platform: string | null;
  authorHandle: string | null;
  analysedAt: string;
  scores: {
    violence: number;       // 0-100
    harassment: number;     // 0-100
    scamFraud: number;      // 0-100
    mobilisation: number;   // 0-100
    hateSpeech: number;     // 0-100
    overall: number;        // 0-100, weighted
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: "high" | "medium" | "low";
  triggeringPhrases: string[];
  explanation: string;
  analystCaution: string;
  nimEnhanced?: boolean;    // true if NIM LLM was used for deep analysis
}

/** Result of pairwise stylometric comparison */
export interface StylometryPairResult {
  sourceA: string;   // label for source A
  sourceB: string;   // label for source B
  similarity: number;   // 0-100
  confidenceLabel: "exploratory" | "weak" | "moderate" | "strong";
  features: {
    vocabularyOverlap: number;
    punctuationSimilarity: number;
    capitalisationPattern: number;
    emojiUsageSimilarity: number;
    avgWordLength: number;
    sentenceLengthSimilarity: number;
    repeatedPhrases: string[];
  };
}

/** Full stylometry analysis result for a corpus */
export interface StylometryResult {
  analysedAt: string;
  sources: { label: string; text: string; platform?: string }[];
  pairResults: StylometryPairResult[];
  signaturePatterns: {
    repeatedPhrases: string[];
    emojiHabits: string[];
    punctuationHabits: string[];
    transliterationPattern: boolean;
    codeMixingPattern: boolean;
  };
  analystCaution: string;
}

/** Domain / IP / company investigation result */
export interface DomainIntelResult {
  query: string;
  queryType: "domain" | "ip" | "company";
  analysedAt: string;
  whois?: {
    registrar?: string;
    registrationDate?: string;
    expiryDate?: string;
    registrant?: string;
    nameservers?: string[];
    country?: string;
  };
  dns?: {
    a?: string[];
    mx?: string[];
    ns?: string[];
    txt?: string[];
  };
  reputation?: {
    score: number;         // 0-100, higher = more risky
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    categories: string[];  // e.g. ["spam", "phishing", "malware"]
    sources: string[];
  };
  scamSignals: string[];
  publicReferences: NormalizedEvidence[];
  confidence: "high" | "medium" | "low";
  analystNote: string;
}

/** A manually ingested public post or evidence item */
export interface IngestedPost {
  id: string;
  caseTag: string;
  platform: string;
  postUrl: string | null;
  authorHandle: string | null;
  captionText: string;
  commentsText?: string;
  locationTag?: string;
  timestamp?: string;   // if known
  ingestedAt: string;   // when analyst added it
  screenshotDataUrl?: string;
  contentRisk?: ContentRiskResult;
  stylometryTag?: string;   // label used in stylometry corpus
  evidenceId?: string;     // linked EvidenceArtifact id if pinned
  tags?: string[];         // optional analyst-defined tags
}

export interface NormalizedFinding {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string | null;
  confidence: number; // 0 to 1
  category: string;
  entity: string;
  provider: string;
  timestamp: string;
}

export interface ToolkitExecution {
  id: string;
  caseReference: string;
  providerId: string;
  query: string;
  timestamp: string;
  durationMs: number;
  status: "SUCCESS" | "FAILED";
  findingsCount: number;
  logs: string[];
}

export interface EvidenceNode {
  id: string;
  label: string;
  type: "phone" | "email" | "username" | "github" | "gitlab" | "reddit" | "linkedin" | "instagram" | "twitter" | "website" | "company" | "education" | "upi" | "alias" | "geo" | "event" | "engine" | "school";
  details?: string;
}

export interface EvidenceEdge {
  source: string;
  target: string;
  evidenceType: string;
  confidenceContribution: number;
  sourceModule: string;
  rawEvidence: string;
  reason: string;
}

export interface EvidenceGraphData {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface ReasoningStep {
  timestamp: string;
  module: string;
  input: string;
  output: string;
  durationMs: number;
  evidenceGenerated: string;
  confidenceDelta: number;
}

export interface FieldAttribution {
  value: string;
  source: string;
  confidence: string;
  discoveredBy: string;
}

export interface ReliableEvidenceItem {
  id: string;
  source: string;
  evidenceType: string;
  confidence: "High" | "Medium" | "Low";
  reliability: "High" | "Medium" | "Low";
  freshness: string;
  verificationStatus: "Yes" | "Partial" | "No";
  details: string;
}

export interface DeveloperFingerprint {
  primaryLanguages: string[];
  frameworks: string[];
  topics: string[];
  repositoryCategories: { category: string; count: number }[];
  developerStack: string[];
  ossActivity: {
    stars: number;
    forks: number;
    publicRepos: number;
    activityLevel: "High" | "Medium" | "Low";
  };
}

export interface PlatformComparison {
  platformA: string;
  platformB: string;
  fingerprintA: DeveloperFingerprint;
  fingerprintB: DeveloperFingerprint;
  similarity: number;
  matchingRepos: { name: string; similarity: number }[];
  matchingTech: string[];
}

export interface SemanticSimilarityResult {
  score: number;
  professionMatch: boolean;
  professionDetails?: string;
  interestsMatch: boolean;
  interestsDetails?: string;
  organizationMatch: boolean;
  organizationDetails?: string;
  technologiesMatch: boolean;
  technologiesDetails?: string;
  researchMatch: boolean;
  researchDetails?: string;
  reasoningSummary: string;
}

export interface ExtendedAuditLog {
  id: string;
  timestamp: string;
  officer: {
    name: string;
    badge: string;
    unit: string;
  };
  caseId: string;
  investigationTarget: string;
  searchType: string;
  platformsQueried: string[];
  evidenceCount: number;
  reportGenerated: boolean;
  durationMs: number;
  action: string;
  detail?: string;
}



