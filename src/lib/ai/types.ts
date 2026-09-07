import type { AiMessage, AiPersonality } from "@/lib/types";

/**
 * The minimal, PII-aware snapshot of the user's day that may be attached to a
 * chat turn — only when `settings.ai.shareContext` is on, and never more than
 * this. No row ids, no notes, no history beyond today. Everything here is data
 * the user already sees on their own Home screen.
 */
export interface AIContext {
  /** local date, YYYY-MM-DD */
  today: string;
  /** "high" | "good" | "medium" | "low" | null */
  energy: string | null;
  tasks: { title: string; status: string; priority: string }[];
  plan: { bucket: string; title: string; done: boolean }[];
  habits: { title: string; doneToday: boolean }[];
  goals: { title: string; horizon: string }[];
  /** enabled AI-memory lines, verbatim */
  memory: string[];
}

export interface AIPersona {
  name: string;
  personality: AiPersonality;
}

export interface AIChatRequest {
  /** full turn history for this conversation, oldest first */
  messages: AiMessage[];
  persona: AIPersona;
  /** omitted entirely when the user has context-sharing off */
  context?: AIContext;
  /** locale hint for the reply language */
  locale: "ar" | "en";
}

export interface AIChatResponse {
  reply: string;
  /**
   * Optional memory the server proposes storing. Only ever applied when
   * `settings.ai.memoryEnabled` is on; always surfaced to the user afterwards.
   */
  memory?: { kind: "preference" | "pattern" | "fact"; text: string }[];
}

export interface AIProvider {
  readonly id: string;
  /** endpoint reachable + provider selected. Not a guarantee the call succeeds. */
  isConfigured(): boolean;
  chat(req: AIChatRequest, opts: { accessToken: string | null }): Promise<AIChatResponse>;
}
