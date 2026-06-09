import { LegalRecord } from "../types";

const RESULT_BLOCK_PATTERN = /<div\s+class=["']result["'][\s\S]*?<\/div>\s*<\/div>|<div\s+class=["']result["'][\s\S]*?<\/div>/gi;

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(prefix: string, value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

function parseIndianKanoonResults(html: string, capturedAt: string): LegalRecord[] {
  const blocks = html.match(RESULT_BLOCK_PATTERN) || [];

  return blocks.slice(0, 5).flatMap((block) => {
    const linkMatch = block.match(/<a\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) return [];

    const path = linkMatch[1];
    const title = decodeHtml(linkMatch[2]);
    const snippet =
      decodeHtml(block.match(/<div\s+class=["']headline["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "") ||
      decodeHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "") ||
      "Public judgment result returned by Indian Kanoon.";
    const docsource = decodeHtml(block.match(/<div\s+class=["']docsource["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "Indian Kanoon");
    const date = decodeHtml(block.match(/(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/)?.[1] || new Date().toISOString().slice(0, 10));
    const url = path.startsWith("http") ? path : `https://indiankanoon.org${path}`;

    return [
      {
        id: makeId("ik", `${title}-${url}`),
        source: docsource || "Indian Kanoon",
        recordType: "Court Judgment",
        title,
        summary: snippet,
        status: "Public Record",
        date,
        url,
        sourceUrl: url,
        credibilityScore: 95,
        credibilityLevel: "HIGH",
        capturedAt,
      },
    ];
  });
}

export async function fetchIndianKanoon(name: string): Promise<LegalRecord[]> {
  const capturedAt = new Date().toISOString();
  const url = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(name)}&pagenum=0`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SOCMINT-Shield/1.0; Public-OSINT)",
        Accept: "text/html",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Indian Kanoon returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const parsed = parseIndianKanoonResults(html, capturedAt);
    if (parsed.length > 0) return parsed;
  } catch {
    // Fall through to a live source link. The UI labels this as a search link, not a stored record.
  }

  return [
    {
      id: makeId("ik-live", name),
      source: "Indian Kanoon",
      recordType: "Court Judgment",
      title: `Live public judgment search for ${name}`,
      summary: "Open this source to inspect current public Indian judgment matches. No court result is cached when the live parser cannot extract records.",
      status: "LIVE SEARCH LINK",
      date: capturedAt.slice(0, 10),
      url,
      sourceUrl: url,
      credibilityScore: 90,
      credibilityLevel: "HIGH",
      capturedAt,
    },
  ];
}

export async function fetchMcaCompanySearch(name: string): Promise<LegalRecord[]> {
  const capturedAt = new Date().toISOString();
  const url = "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html";

  return [
    {
      id: makeId("mca-live", name),
      source: "MCA21 Master Data",
      recordType: "Company Registration",
      title: `MCA21 company/director search for ${name}`,
      summary:
        "MCA21 exposes company master data through an interactive government portal. Open the source and search the director/company name to verify CIN, company status, and designation.",
      status: "PUBLIC PORTAL VERIFICATION REQUIRED",
      date: capturedAt.slice(0, 10),
      url,
      sourceUrl: url,
      credibilityScore: 90,
      credibilityLevel: "HIGH",
      capturedAt,
    },
  ];
}
