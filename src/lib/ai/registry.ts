import type { AiSettings } from "@/lib/types";
import { GeminiProvider } from "./geminiProvider";
import type { AIProvider } from "./types";

/**
 * The one place provider selection happens. Returns `null` whenever AI is off,
 * the provider is "none", or the chosen provider isn't configured — callers
 * treat `null` as "assistant unavailable, everything else works".
 */
export function getAIProvider(ai: AiSettings): AIProvider | null {
  if (!ai.enabled) return null;
  switch (ai.provider) {
    case "gemini": {
      const p = new GeminiProvider();
      return p.isConfigured() ? p : null;
    }
    default:
      return null;
  }
}

/** True when a provider could serve a request right now. */
export function isAssistantAvailable(ai: AiSettings): boolean {
  return getAIProvider(ai) !== null;
}
