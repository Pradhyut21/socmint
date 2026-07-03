import { NormalizedFinding } from "../../types";

export type EntityType = "username" | "email" | "phone" | "domain" | "ip" | "name" | "crypto" | "face";

export interface OsintProvider {
  id: string;
  name: string;
  supportedInputs: EntityType[];
  execute(input: string, onLog?: (log: string) => void): Promise<any>;
  normalize(raw: any, input: string): Promise<NormalizedFinding[]>;
  compliance: {
    supported: string[];
    restricted: string[];
    safeAlternative: string;
    socmintShieldIntegration: string;
  };
  capabilities: string[];
  installation: string;
  overview: string;
}

// Import individual providers
import { sherlockProvider } from "./sherlock";
import { maigretProvider } from "./maigret";
import { holeheProvider } from "./holehe";
import { phoneinfogaProvider } from "./phoneinfoga";
import { theharvesterProvider } from "./theharvester";
import { searchIntelProvider } from "./searchIntelProvider";

export const PROVIDERS: OsintProvider[] = [
  sherlockProvider,
  maigretProvider,
  holeheProvider,
  phoneinfogaProvider,
  theharvesterProvider,
  searchIntelProvider,
];

export function getProviderById(id: string): OsintProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function getProvidersForInput(type: EntityType): OsintProvider[] {
  return PROVIDERS.filter(p => p.supportedInputs.includes(type));
}
