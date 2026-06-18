import type { SuspectProfile, AlertItem, RiskLevel, DossierQuery, FinancialFootprint } from "./types";

export function buildMockProfile(query: string | DossierQuery): SuspectProfile {
  const dq: DossierQuery = typeof query === "string" ? { username: query } : query;
  const seed = (dq.username || dq.realName || dq.email || dq.phone || "shadowtrader99").toString();
  const username = seed.replace(/[^a-z0-9]/gi, "").toLowerCase() || "shadowtrader99";
  const realName = dq.realName || "Vikram Rathore";
  const phone = dq.phone || "+91 98765 43210";
  const email = dq.email || `${username}@protonmail.com`;
  const riskScore = 78;
  const riskLevel: RiskLevel = "HIGH";
  return {
    username,
    realName,
    phoneNumber: phone,
    emailAddress: email,
    photoUrl: dq.faceImage || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(username)}`,
    riskScore,
    riskLevel,
    riskSubscores: { language: 72, behavioral: 84, network: 69, legal: 88 },
    riskSignals: [
      "Multiple alias accounts detected across Reddit and X",
      "Linked to two MCA21 shell entities",
      "Geofence overlap with 3 known incident sites in Bengaluru",
      "Crypto wallet flagged on Chainalysis sanctions list",
    ],
    accounts: [
      { platform: "X / Twitter", username: `@${username}`, url: "#", verified: false, followers: 4210, bio: "Markets. Signals. Nothing more.", lastActive: "2026-06-16" },
      { platform: "Reddit", username: `u/${username}_alt`, url: "#", followers: 312, bio: "Trader. NSE/BSE.", lastActive: "2026-06-15" },
      { platform: "Telegram", username: `@${username}_vip`, url: "#", followers: 1820, bio: "Private group", lastActive: "2026-06-17" },
      { platform: "Instagram", username: `@vik.rathore`, url: "#", verified: true, followers: 28400, bio: "Bengaluru • Investor", lastActive: "2026-06-14" },
    ],
    posts: [
      { id: "p1", platform: "X / Twitter", content: "Big move incoming on $ABCD. Don't say I didn't warn you.", timestamp: "2026-06-16T09:14:00Z", engagement: { likes: 412, comments: 88, shares: 41 }, sentiment: "neutral" },
      { id: "p2", platform: "Reddit", content: "Anyone else seeing the volume spike? Insiders are loading.", timestamp: "2026-06-15T18:22:00Z", engagement: { likes: 76, comments: 23, shares: 4 }, sentiment: "negative" },
      { id: "p3", platform: "Telegram", content: "Tomorrow 09:30 IST. Be ready. This is the one.", timestamp: "2026-06-17T03:10:00Z", engagement: { likes: 0, comments: 0, shares: 0 }, sentiment: "negative" },
    ],
    legalRecords: [
      { id: "lr1", title: "SEBI Adjudication Order — Pump & Dump", court: "SEBI WTM", date: "2024-11-02", status: "Pending", severity: "HIGH" },
      { id: "lr2", title: "FIR 214/2025 — IT Act §66D", court: "Cubbon Park PS", date: "2025-04-18", status: "Under Investigation", severity: "CRITICAL" },
    ],
    aliasResults: [
      { alias: "shadowtrader_99", source: "Sherlock", confidence: 0.92 },
      { alias: "vik_signals", source: "WhatsMyName", confidence: 0.71 },
    ],
    upiFootprint: { handles: [`${username}@okhdfc`, `vikram.r@oksbi`], banks: ["HDFC", "SBI"], lastSeen: "2026-06-12" },
    financialFootprint: buildFinancial(username, realName, phone),
    hibpResult: { breaches: [{ name: "Collection #1", date: "2019-01-07", data: ["Email", "Password"] }, { name: "LinkedIn Scrape", date: "2021-06-22", data: ["Email", "Phone"] }] },
    newsArticles: [
      { title: "Bengaluru man under SEBI lens for stock manipulation", source: "Deccan Herald", url: "#", date: "2025-05-12", snippet: "Authorities are probing a Telegram-based pump-and-dump ring..." },
    ],
    nexusAnalysis: {
      key_finding: "Suspect coordinates pump-and-dump runs across three burner Reddit accounts feeding a Telegram VIP channel.",
      connected_signals: [
        { signal1: "Reddit u/shadowtrader99_alt", signal2: "Telegram @shadowtrader99_vip", connection: "Identical writing fingerprint (NLP cosine 0.94)" },
        { signal1: "UPI vikram.r@oksbi", signal2: "Crypto wallet bc1q...", connection: "On-ramp transactions within 6 hours" },
      ],
      anomalies: [
        { description: "Deleted 412 posts in the 72h preceding FIR registration", severity: "HIGH" },
        { description: "Geolocation gap of 18 days across April 2025", severity: "MEDIUM" },
      ],
      investigator_priority: "Seize devices, freeze UPI handles, request Telegram preservation order.",
    },
    shadowAccounts: [
      { platform: "Reddit", handle: "u/shadowtrader99_alt", createdAt: "2025-03-04", evasionScore: 0.88, status: "ACTIVE" },
      { platform: "X / Twitter", handle: "@st_signals_v2", createdAt: "2025-05-19", evasionScore: 0.74, status: "DELETED" },
      { platform: "Telegram", handle: "@vik_burner_01", createdAt: "2025-06-01", evasionScore: 0.81, status: "DORMANT" },
    ],
    cryptoTrace: {
      wallets: [
        { chain: "BTC", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", balance: "0.842 BTC", flagged: true },
        { chain: "ETH", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f7E1aD", balance: "12.4 ETH", flagged: false },
      ],
      transactions: [
        { hash: "0xabc...891", amount: "0.5 BTC", counterparty: "Garantex (sanctioned)", date: "2026-05-12" },
        { hash: "0xdef...442", amount: "2.1 ETH", counterparty: "Tornado Cash", date: "2026-04-08" },
      ],
    },
    faceScan: {
      matchScore: 0.93,
      deepfakeProbability: 0.07,
      matches: [
        { source: "PimEyes", url: "#", confidence: 0.93 },
        { source: "FaceCheck.ID", url: "#", confidence: 0.81 },
      ],
    },
    network: {
      nodes: [
        { id: "s", label: "Suspect", group: "self", size: 24 },
        { id: "a1", label: "Reddit alt", group: "alias", size: 14 },
        { id: "a2", label: "TG VIP", group: "alias", size: 14 },
        { id: "w1", label: "BTC wallet", group: "crypto", size: 12 },
        { id: "c1", label: "MCA shell", group: "legal", size: 16 },
      ],
      links: [
        { source: "s", target: "a1", strength: 0.9, label: "writing match" },
        { source: "s", target: "a2", strength: 0.8 },
        { source: "a1", target: "a2", strength: 0.7, label: "cross-post" },
        { source: "s", target: "w1", strength: 0.6 },
        { source: "s", target: "c1", strength: 0.5 },
      ],
    },
    locations: [
      { lat: 12.9716, lng: 77.5946, locationName: "Bengaluru, MG Road", date: "2026-06-10", source: "Instagram geotag", details: "Coffee shop check-in" },
      { lat: 12.9352, lng: 77.6245, locationName: "Koramangala 5th Block", date: "2026-05-22", source: "EXIF metadata", details: "Apartment building", crimeMatched: { title: "FIR 214/2025", date: "2025-04-18", recordId: "lr2", severity: "CRITICAL" } },
      { lat: 13.0827, lng: 80.2707, locationName: "Chennai, T. Nagar", date: "2026-04-02", source: "Twitter geotag", details: "Public meet" },
    ],
    caseReference: `KSP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    capturedAt: new Date().toISOString(),
  };
}

export const seedAlerts: AlertItem[] = [
  { id: "a1", title: "Wallet flagged on sanctions list", details: "BTC bc1q... matched OFAC SDN list within 12 minutes of last sync.", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: "critical" },
  { id: "a2", title: "New burner account detected", details: "Reddit u/st_signals_v3 created with 87% writing-style match to active suspect shadowtrader99.", timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(), type: "warning" },
  { id: "a3", title: "Geofence overlap", details: "Suspect device pinged within 200m of incident site KSP-2026-1182 (Koramangala 5th Block).", timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), type: "warning" },
  { id: "a4", title: "Dark web mention — phone number", details: "+91 98765 43210 appeared on a credential dump indexed by Intelligence X 2 hours ago.", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), type: "critical" },
  { id: "a5", title: "Court record update", details: "SEBI adjudication order on suspect Vikram Rathore moved from PENDING → HEARING SCHEDULED on 2026-07-02.", timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), type: "info" },
  { id: "a6", title: "Deepfake video detected", details: "Telegram channel @market_oracle posted an 11-second clip of suspect — deepfake probability 0.81.", timestamp: new Date(Date.now() - 1000 * 60 * 220).toISOString(), type: "warning" },
  { id: "a7", title: "OSINT feed synced", details: "Pulled 2,418 records across 14 sources. No errors.", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), type: "info" },
  { id: "a8", title: "Wikidata entity match", details: "New entity Q1148290 (corporate director) matched to suspect Manish Naik with 0.74 confidence.", timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(), type: "info" },
];

export function riskColor(level: RiskLevel) {
  switch (level) {
    case "CRITICAL": return "bg-stamp text-primary-foreground";
    case "HIGH": return "bg-stamp/90 text-primary-foreground";
    case "MEDIUM": return "bg-warn text-ink";
    case "LOW": return "bg-evidence/80 text-primary-foreground";
  }
}

// ============ Seed dossiers for Case Directory ============

const SEED_SUSPECTS: Array<{ q: string; name: string; risk: RiskLevel; score: number; phone: string; email: string }> = [
  { q: "shadowtrader99", name: "Vikram Rathore", risk: "HIGH", score: 78, phone: "+91 98765 43210", email: "shadowtrader99@protonmail.com" },
  { q: "darkphoenix_07", name: "Aarav Menon", risk: "CRITICAL", score: 92, phone: "+91 98123 11220", email: "phoenix.fly@tutanota.com" },
  { q: "nightowl_blr", name: "Sneha Iyer", risk: "MEDIUM", score: 54, phone: "+91 99008 22113", email: "nightowl.blr@gmail.com" },
  { q: "crypto_kavi", name: "Kavi Deshpande", risk: "HIGH", score: 81, phone: "+91 97411 30441", email: "kavi.deshp@protonmail.com" },
  { q: "lotuscoder", name: "Riya Pillai", risk: "LOW", score: 22, phone: "+91 90080 77123", email: "riya@lotuslab.in" },
  { q: "tigerstrike", name: "Manish Naik", risk: "CRITICAL", score: 88, phone: "+91 80991 47820", email: "tigerstrike@tutanota.com" },
];

export function buildSeedRecents(): SuspectProfile[] {
  return SEED_SUSPECTS.map(({ q, name, risk, score, phone, email }) => {
    const p = buildMockProfile(q);
    p.realName = name;
    p.riskLevel = risk;
    p.riskScore = score;
    p.phoneNumber = phone;
    p.emailAddress = email;
    p.capturedAt = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 14).toISOString();
    return p;
  });
}

// ============ Seed audit logs for Compliance ============

export function buildSeedAuditLogs(): { id: string; ts: string; action: string; detail?: string }[] {
  const now = Date.now();
  const m = (mins: number) => new Date(now - mins * 60000).toISOString();
  return [
    { id: "al01", ts: m(2), action: "ALERT_AUDITED", detail: "Wallet flagged on sanctions list" },
    { id: "al02", ts: m(14), action: "EXPORT_REPORT", detail: "KSP-2026-4421" },
    { id: "al03", ts: m(28), action: "INVESTIGATE", detail: "shadowtrader99" },
    { id: "al04", ts: m(64), action: "NEXUS_SYNTHESIS", detail: "auto-fired post-sweep · 5 signals fused" },
    { id: "al05", ts: m(95), action: "INVESTIGATE", detail: "darkphoenix_07" },
    { id: "al06", ts: m(180), action: "ANALYST_UPDATED", detail: "A. Sharma · KSP-4421" },
    { id: "al07", ts: m(245), action: "SESSION_VERIFIED", detail: "MFA · hardware token · Yubikey-04" },
    { id: "al08", ts: m(360), action: "INVESTIGATE", detail: "crypto_kavi" },
    { id: "al09", ts: m(420), action: "EVIDENCE_HASH", detail: "SHA-256 5f3c…91a0 · KSP-2026-1182" },
    { id: "al10", ts: m(540), action: "POLICY_ACK", detail: "KSP General Order 14/2024 acknowledged" },
    { id: "al11", ts: m(720), action: "INVESTIGATE", detail: "tigerstrike" },
    { id: "al12", ts: m(1440), action: "SESSION_START", detail: "Workstation KSP-CYB-07 · 0.0.0.0/24 LAN" },
  ];
}


function buildFinancial(username: string, realName: string, phone: string): FinancialFootprint {
  const last4 = phone.replace(/\D/g, "").slice(-4) || "4210";
  return {
    upi: {
      handles: [`${username}@okhdfc`, `${username}.pay@okicici`, `${realName.split(" ")[0].toLowerCase()}.r@oksbi`, `${last4}@paytm`],
      banks: ["HDFC", "ICICI", "SBI", "Paytm Payments Bank"],
      lastSeen: "2026-06-12",
    },
    truecaller: {
      name: realName.toUpperCase() + " (TC)",
      carrier: "Jio · 4G/5G",
      circle: "Karnataka",
      spamScore: 74,
      spamReports: 312,
      tags: ["Stock Tips", "Investment Fraud", "Telegram Promo", "Unknown"],
    },
    ncrp: [
      { id: "NCRP-2026-018221", date: "2026-05-22", category: "Online Financial Fraud", status: "UNDER_INVESTIGATION", amountInr: 245000, jurisdiction: "Bengaluru City Cyber PS" },
      { id: "NCRP-2026-014778", date: "2026-04-09", category: "Investment / Trading Scam", status: "OPEN", amountInr: 80000, jurisdiction: "Mysuru Cyber PS" },
      { id: "NCRP-2025-099812", date: "2025-12-30", category: "UPI Phishing", status: "CLOSED", amountInr: 12500, jurisdiction: "Hubballi Cyber PS" },
    ],
    bankAccounts: [
      { bank: "HDFC Bank", ifsc: "HDFC0001234", accountMasked: "XXXX XXXX 4421", flagged: true },
      { bank: "SBI", ifsc: "SBIN0005678", accountMasked: "XXXX XXXX 8810", flagged: false },
    ],
  };
}
