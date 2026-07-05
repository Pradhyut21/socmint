import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RiskLevel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskColor(level: RiskLevel | string) {
  switch (level) {
    case "CRITICAL": return "bg-stamp text-primary-foreground";
    case "HIGH": return "bg-stamp/90 text-primary-foreground";
    case "MEDIUM": return "bg-warn text-ink";
    case "LOW": return "bg-evidence/80 text-primary-foreground";
    default: return "bg-slate-500 text-white";
  }
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 6000,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => {
    try { controller.abort(); } catch {}
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const originalText = response.text.bind(response);
    response.text = async () => {
      try {
        return await originalText();
      } finally {
        clearTimeout(id);
      }
    };

    const originalJson = response.json.bind(response);
    response.json = async () => {
      try {
        return await originalJson();
      } finally {
        clearTimeout(id);
      }
    };

    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

