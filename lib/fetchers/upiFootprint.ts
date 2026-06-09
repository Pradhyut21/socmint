import { UpiFootprint } from "../types";

const UPI_HANDLES = ["@paytm", "@okicici", "@okhdfcbank", "@okaxis", "@ybl", "@ibl", "@axl", "@upi", "@apl", "@rapl"];

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function fetchUpiFootprint(phone: string): Promise<UpiFootprint> {
  const normalized = normalizePhone(phone);

  return {
    phone: normalized,
    probableUpiIds: UPI_HANDLES.map((handle) => ({
      id: `${normalized}${handle}`,
      confidence: "INFERRED",
      source: "Generated from common Indian UPI handle patterns. Must be verified through lawful payment-provider workflow.",
    })),
    ncrp: {
      status: "NOT_PUBLICLY_QUERYABLE",
      note:
        "NCRP complaint databases are not publicly searchable by phone number without authorized government access. This tool does not claim hidden registry access.",
      sourceUrl: "https://cybercrime.gov.in",
    },
    truecaller: {
      status: "PUBLIC_DATA_UNAVAILABLE",
      note:
        "Truecaller identity/spam data is not fetched without an approved API key or user-authorized workflow. Use this panel as a lawful verification checklist.",
    },
  };
}
