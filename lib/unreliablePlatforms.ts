export interface UnreliablePlatform {
  id: string;
  reason: string;
}

export const UNRELIABLE_PLATFORMS: UnreliablePlatform[] = [
  { id: "facebook", reason: "Generic profile-shell page served regardless of account existence" },
  { id: "pinterest", reason: "Generic profile shell served regardless of account existence (confirmed via control test)" },
  { id: "steam", reason: "Generic community error page served regardless of account existence" },
  { id: "tiktok", reason: "Generic profile page served regardless of account existence (confirmed via control test)" },
  { id: "threads", reason: "Generic profile shell served regardless of account existence (confirmed via control test)" },
  { id: "picsart", reason: "Generic profile shell served regardless of account existence (confirmed via control test)" },
  { id: "appledevelopers", reason: "Security verification wall served regardless of account existence" },
  { id: "stackoverflow", reason: "Endpoint deprecated - cannot verify by handle" }
];
