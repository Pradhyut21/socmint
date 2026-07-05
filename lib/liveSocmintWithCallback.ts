import { SuspectProfile, PlatformAccount, DossierInput } from "./types";
import { investigatePublicSubject, investigateMultiField } from "./liveSocmint";

export type ProgressCallback = (update: {
  type: "status" | "account_found" | "progress";
  message?: string;
  account?: PlatformAccount;
  checked?: number;
  total?: number;
}) => void;

// Store the active callback globally (simple approach for now)
let globalCallback: ProgressCallback | null = null;

export function setProgressCallback(callback: ProgressCallback | null) {
  globalCallback = callback;
  console.log("[CALLBACK] Global callback", callback ? "SET ✅" : "CLEARED ❌");
}

export function reportProgress(update: Parameters<ProgressCallback>[0]) {
  console.log("[REPORT_PROGRESS] ===== CALLED =====");
  console.log("[REPORT_PROGRESS] Type:", update.type);
  console.log("[REPORT_PROGRESS] Message:", update.message);
  if (update.account) {
    console.log("[REPORT_PROGRESS] Account Platform:", update.account.platform);
    console.log("[REPORT_PROGRESS] Account Username:", update.account.username);
    console.log("[REPORT_PROGRESS] Account profilePicUrl:", update.account.profilePicUrl);
    console.log("[REPORT_PROGRESS] Full account object:", JSON.stringify(update.account, null, 2));
  }
  
  if (globalCallback) {
    console.log("[REPORT_PROGRESS] ✅ Callback exists, invoking now...");
    try {
      globalCallback(update);
      console.log("[REPORT_PROGRESS] ✅ Callback invoked successfully");
    } catch (err) {
      console.error("[REPORT_PROGRESS] ❌ Callback invocation error:", err);
    }
  } else {
    console.log("[REPORT_PROGRESS] ❌ No callback set! Progress will not be reported.");
  }
  console.log("[REPORT_PROGRESS] ===== END =====");
}

export async function investigateWithCallback(
  query: string,
  type: string,
  githubToken?: string,
  quickScan: boolean = true,
  onProgress?: ProgressCallback,
  extraContext?: string,
  dossier?: DossierInput
): Promise<SuspectProfile> {
  // Set the global callback
  if (onProgress) {
    setProgressCallback(onProgress);
  }

  try {
    // Send initial status
    reportProgress({ type: "status", message: "Initializing investigation..." });

    // Run the standard or multi-field investigation
    let profile: SuspectProfile;
    if (type === "dossier" && dossier) {
      console.log("[CALLBACK] Initiating multi-field dossier investigation with callback");
      profile = await investigateMultiField(dossier);
    } else {
      profile = await investigatePublicSubject(query, type, githubToken, quickScan, extraContext);
    }

    // Clear callback
    setProgressCallback(null);

    return profile;
  } catch (error) {
    setProgressCallback(null);
    throw error;
  }
}
