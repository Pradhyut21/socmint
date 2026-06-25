/**
 * Provider Registry — SOCMINT Shield
 *
 * Base types and registry for the provider adapter architecture.
 * All investigation modules should implement InvestigationProvider.
 * This avoids tight coupling between liveSocmint.ts and new providers.
 */

import type { NormalizedEvidence } from "../types";

// ── Provider capability declaration ────────────────────────────────────────

export type ProviderEntityType =
  | "username" | "phone" | "email" | "domain" | "ip" | "company"
  | "name" | "crypto" | "face" | "upi";

export type ProviderTier = 1 | 2 | 3;
/**
 * Tier 1 = official public API (most reliable)
 * Tier 2 = public site HTTP probe
 * Tier 3 = aggregated/search-based lookup
 */

export interface ProviderCapability {
  handles: ProviderEntityType[];
  tier: ProviderTier;
  lawful: boolean;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  dataClasses: string[];   // e.g. ["profile", "email", "phone", "posts"]
  region?: "india" | "global";
  description: string;
}

// ── Provider interface ──────────────────────────────────────────────────────

export interface ProviderResult<TRaw = unknown> {
  providerName: string;
  success: boolean;
  evidence: NormalizedEvidence[];
  raw?: TRaw;
  error?: string;
  capturedAt: string;
}

export interface InvestigationProvider<TRaw = unknown> {
  name: string;
  capability: ProviderCapability;
  investigate(query: string, entityType: ProviderEntityType): Promise<ProviderResult<TRaw>>;
}

// ── Simple registry ─────────────────────────────────────────────────────────

const registry = new Map<string, InvestigationProvider>();

export function registerProvider(provider: InvestigationProvider): void {
  registry.set(provider.name, provider);
}

export function getProvider(name: string): InvestigationProvider | undefined {
  return registry.get(name);
}

export function getProvidersByEntity(entityType: ProviderEntityType): InvestigationProvider[] {
  return [...registry.values()].filter(p => p.capability.handles.includes(entityType));
}

export function listProviders(): { name: string; capability: ProviderCapability }[] {
  return [...registry.values()].map(p => ({ name: p.name, capability: p.capability }));
}

/**
 * Run all registered providers that can handle the given entity type.
 * Returns results from all providers (success + failure).
 */
export async function runProviders(
  query: string,
  entityType: ProviderEntityType
): Promise<ProviderResult[]> {
  const providers = getProvidersByEntity(entityType);
  return Promise.all(
    providers.map(p =>
      p.investigate(query, entityType).catch(err => ({
        providerName: p.name,
        success: false,
        evidence: [],
        error: String(err),
        capturedAt: new Date().toISOString(),
      }))
    )
  );
}
