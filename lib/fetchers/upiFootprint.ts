import { UpiFootprint } from "../types";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

// Specific bank identifiers to generate deterministic UPI handles based on phone number.
const BANK_HANDLES = ["okhdfc", "oksbi", "okicici", "paytm"];

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function fetchUpiFootprint(phone: string): Promise<UpiFootprint> {
  const normalized = normalizePhone(phone);

  let truecallerData: any = {
    status: "PUBLIC_DATA_UNAVAILABLE" as const,
    note: "Truecaller search requires a valid login. Run 'truecallerpy login' in your local terminal to authenticate, and the app will automatically pick up your login session.",
  };

  try {
    // 1. Detect credentials from env or truecallerpy authkey.json
    let installationId = process.env.TRUECALLER_INSTALLATION_ID || "";
    let countryCode = "IN";

    try {
      const homePath = os.homedir();
      const authKeyPath = path.join(homePath, ".config", "truecallerpy", "authkey.json");
      if (fs.existsSync(authKeyPath)) {
        const data = fs.readFileSync(authKeyPath, "utf-8");
        const parsed = JSON.parse(data);
        if (parsed.installationId) {
          installationId = parsed.installationId;
        }
        if (parsed.phones && parsed.phones[0] && parsed.phones[0].countryCode) {
          countryCode = parsed.phones[0].countryCode;
        }
      }
    } catch (e) {
      console.error("Error reading truecallerpy authkey:", e);
    }

    // 2. Query Truecaller API directly if installationId is resolved
    if (installationId) {
      const url = `https://search5-noneu.truecaller.com/v2/search?q=${normalized}&countryCode=${countryCode}&type=4&locAddr=&placement=SEARCHRESULTS,HISTORY,DETAILS&encoding=json`;
      const response = await fetch(url, {
        headers: {
          "content-type": "application/json; charset=UTF-8",
          "accept-encoding": "gzip",
          "user-agent": "Truecaller/11.75.5 (Android;10)",
          "Authorization": `Bearer ${installationId}`
        }
      });

      if (response.ok) {
        const parsed = await response.json();
        const firstRecord = parsed?.data?.[0];
        if (firstRecord) {
          truecallerData = {
            status: "SUCCESS" as const,
            name: firstRecord.name || "Unknown",
            carrier: firstRecord.phones?.[0]?.carrier || "Unknown",
            telecomCircle: firstRecord.addresses?.[0]?.city || "Unknown",
            spamScore: firstRecord.score ? Math.round(firstRecord.score * 100) : 0,
            note: `Successfully retrieved identity via local truecallerpy CLI integration. Badges: ${firstRecord.badges?.join(", ") || "None"}.`,
          };
        }
      }
    }
  } catch (err) {
    console.error("Truecaller lookup failed:", err);
  }

  return {
    phone: normalized,
    probableUpiIds: BANK_HANDLES.map((bank) => ({
      id: `${normalized}@${bank}`,
      confidence: "INFERRED",
      source: "Generated deterministic UPI handle based on known bank identifiers.",
    })),
    ncrp: {
      status: "NOT_PUBLICLY_QUERYABLE",
      note:
        "NCRP complaint databases are not publicly searchable by phone number without authorized government access. This tool does not claim hidden registry access.",
      sourceUrl: "https://cybercrime.gov.in",
    },
    truecaller: truecallerData,
  };
}
