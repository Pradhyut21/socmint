/**
 * Privacy Filter — SOCMINT Shield
 *
 * Filters / redacts sensitive private data before results are returned.
 * Compliant with DPDP Act 2023 principles and ethical OSINT practices.
 * All results must pass through this layer before display.
 */

// ── Patterns to detect sensitive private data ──────────────────────────────
const HOME_ADDRESS_PATTERNS = [
  /\b\d{1,5}\s+[\w\s]+(?:street|st|road|rd|avenue|ave|lane|ln|nagar|colony|layout|apartments?|flats?)\b/gi,
  /\bflat\s+no\.?\s*[A-Z0-9-]+/gi,
  /\bdoor\s+no\.?\s*[A-Z0-9-]+/gi,
];

const GOV_ID_PATTERNS = [
  /\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b/g,  // Aadhaar
  /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,                     // PAN
  /\bVoter ID:?\s*[A-Z]{3}[0-9]{7}\b/gi,
];

const RAW_CREDENTIAL_PATTERNS = [
  /password\s*[:=]\s*\S+/gi,
  /passwd\s*[:=]\s*\S+/gi,
  /\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}/g,           // bcrypt hash
  /(?:sha256|md5|sha1)\s*[:=]?\s*[0-9a-f]{32,64}/gi,
];

// Indian mobile numbers in suspicious context
const PHONE_IN_CREDENTIALS_PATTERN = /(?:mobile|phone|contact)\s*[:=]\s*[+91]?[6-9]\d{9}/gi;

/**
 * Redact a sensitive value from text, replacing with a safe placeholder.
 */
function redact(text: string, pattern: RegExp, placeholder: string): string {
  return text.replace(pattern, placeholder);
}

/**
 * Sanitize a text string for display — removes home addresses, gov IDs,
 * raw credentials.  Returns sanitized text + list of what was redacted.
 */
export function sanitizeText(text: string): {
  sanitized: string;
  redactions: string[];
} {
  const redactions: string[] = [];
  let out = text;

  for (const pattern of HOME_ADDRESS_PATTERNS) {
    const matches = out.match(pattern);
    if (matches) {
      redactions.push("Possible home address redacted");
      out = redact(out, pattern, "[ADDRESS REDACTED]");
    }
  }

  for (const pattern of GOV_ID_PATTERNS) {
    const matches = out.match(pattern);
    if (matches) {
      redactions.push("Government ID number redacted");
      out = redact(out, pattern, "[GOV-ID REDACTED]");
    }
  }

  for (const pattern of RAW_CREDENTIAL_PATTERNS) {
    const matches = out.match(pattern);
    if (matches) {
      redactions.push("Raw credential/hash redacted");
      out = redact(out, pattern, "[CREDENTIAL REDACTED]");
    }
  }

  const phoneMatches = out.match(PHONE_IN_CREDENTIALS_PATTERN);
  if (phoneMatches) {
    redactions.push("Phone number in credential context redacted");
    out = redact(out, PHONE_IN_CREDENTIALS_PATTERN, "[PHONE REDACTED]");
  }

  return { sanitized: out, redactions };
}

/**
 * Convert a raw breach record list into a safe summary.
 * Never expose: usernames, passwords, hashed passwords, private emails from breach data.
 */
export function summariseBreach(breaches: {
  name: string;
  breachDate: string;
  dataClasses: string[];
  pwnCount: number;
}[]): string {
  if (breaches.length === 0) return "No breach exposure found.";

  const count = breaches.length;
  const types = [...new Set(breaches.flatMap(b => b.dataClasses))].slice(0, 5);
  const oldest = breaches.sort((a, b) => a.breachDate.localeCompare(b.breachDate))[0]?.breachDate;
  const latest = breaches.sort((a, b) => b.breachDate.localeCompare(a.breachDate))[0]?.breachDate;

  return (
    `Email found in ${count} public breach dataset(s). ` +
    `Exposed data types include: ${types.join(", ")}. ` +
    `Earliest breach: ${oldest || "unknown"}. Latest: ${latest || "unknown"}. ` +
    `Raw credentials are NOT displayed — only exposure metadata is shown.`
  );
}

/**
 * Check if a string looks like a follower-email or follower-phone list
 * (which should never be surfaced from public platforms).
 */
export function isFollowerPIIList(text: string): boolean {
  const emailListPattern = /(?:\S+@\S+\.\S+\s*,?\s*){5,}/;
  const phoneListPattern = /(?:[+91]?[6-9]\d{9}\s*,?\s*){5,}/;
  return emailListPattern.test(text) || phoneListPattern.test(text);
}

/**
 * Apply privacy filter to a content snippet before display.
 * Use this on any raw evidence text before returning to the UI.
 */
export function filterEvidence(snippet: string): string {
  if (isFollowerPIIList(snippet)) {
    return "[FOLLOWER DATA SUPPRESSED — private follower lists are not displayed]";
  }
  const { sanitized } = sanitizeText(snippet);
  return sanitized;
}

/**
 * Safe breach summary — wraps raw HIBP data into analyst-friendly text.
 */
export function safeBreachSummary(status: string, breachCount: number, pasteCount: number): string {
  if (status === "NOT_CONFIGURED") {
    return "Breach exposure check not configured. Add HIBP_API_KEY to enable.";
  }
  if (status === "CLEAN") {
    return "No breach exposure signal found from configured providers.";
  }
  if (status === "FOUND") {
    return `Breach exposure indicators found: ${breachCount} dataset(s), ${pasteCount} paste(s). Exact credentials are NOT exposed.`;
  }
  if (status === "ERROR") {
    return "Breach check encountered an error. Retry or check API key.";
  }
  return "Breach status unknown.";
}
