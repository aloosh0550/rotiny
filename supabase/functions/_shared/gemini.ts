// Shared Gemini client for Routini's Edge Functions.
//
// The API key lives ONLY in this project's secrets (GEMINI_API_KEY) — never in
// the repo or the client. The model can be changed without a code deploy via the
// optional GEMINI_MODEL secret; the default is the stable "flash-latest" alias so
// Google's frequent Flash retirements don't break the app (the client always has
// a deterministic fallback regardless).
//
// @ts-nocheck — Deno runtime types are not part of the app's tsconfig.

const DEFAULT_MODEL = "gemini-flash-latest";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 22_000;

export function geminiModel(): string {
  return (Deno.env.get("GEMINI_MODEL") ?? "").trim() || DEFAULT_MODEL;
}

export class GeminiError extends Error {
  status: number;
  /** a short machine code the client can map: rate_limited | model | safety | server */
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface GenArgs {
  apiKey: string;
  system: string;
  contents: unknown[];
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

/** One generateContent call. Throws GeminiError on any non-usable outcome. */
export async function geminiGenerate(args: GenArgs): Promise<string> {
  const url = `${API_ROOT}/${geminiModel()}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": args.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        contents: args.contents,
        generationConfig: {
          temperature: args.temperature ?? 0.7,
          maxOutputTokens: args.maxOutputTokens ?? 800,
          ...(args.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new GeminiError(504, "server", e?.name === "AbortError" ? "gemini timeout" : "gemini unreachable");
  }
  clearTimeout(timer);

  if (res.status === 429) throw new GeminiError(429, "rate_limited", "gemini rate limited");
  if (res.status === 404) throw new GeminiError(502, "model", `gemini model "${geminiModel()}" not found`);
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new GeminiError(502, "server", `gemini ${res.status}: ${body}`);
  }

  const data = await res.json().catch(() => null);
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) throw new GeminiError(502, "safety", `blocked: ${blockReason}`);

  const cand = data?.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") {
    throw new GeminiError(502, "safety", `finishReason ${finish}`);
  }

  const text = (cand?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new GeminiError(502, "server", "empty gemini response");
  return text;
}

/** Tolerant JSON parse — handles ```json fences and leading/trailing prose. */
export function parseJsonLoose<T = unknown>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/** Per-user, per-day soft budget. In-memory — resets on cold start; fine for a soft cap. */
export function makeBudget(perDay: number) {
  const seen = new Map<string, { day: string; n: number }>();
  return (userId: string): boolean => {
    const day = new Date().toISOString().slice(0, 10);
    const c = seen.get(userId);
    if (!c || c.day !== day) {
      seen.set(userId, { day, n: 1 });
      return false;
    }
    c.n += 1;
    return c.n > perDay;
  };
}
