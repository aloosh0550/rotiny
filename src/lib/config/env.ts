/**
 * Typed, centralised access to the (few) public environment variables Routini
 * uses. Only `NEXT_PUBLIC_*` values are readable in the client bundle — there are
 * no secrets here by design (see `.env.example`).
 *
 * Cloud features are *opt-in by configuration*: when the Supabase vars are absent
 * the app runs exactly as before (local IndexedDB only). `isSupabaseConfigured()`
 * is the single switch the rest of the code checks.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
// Optional. The URL of the server-side AI proxy (a Supabase Edge Function). The
// AI provider key lives ONLY in that function's secrets — never in the client.
// When unset we derive `${SUPABASE_URL}/functions/v1/ai-chat` if Supabase is set.
const AI_ENDPOINT = process.env.NEXT_PUBLIC_AI_ENDPOINT?.trim() || "";

/** True only when BOTH Supabase public vars are present. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/** The resolved AI proxy endpoint, or "" when neither it nor Supabase is set. */
export function aiEndpoint(): string {
  if (AI_ENDPOINT) return AI_ENDPOINT;
  if (SUPABASE_URL) return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/ai-chat`;
  return "";
}

/** True when an AI proxy endpoint can be resolved. Does not mean AI is enabled. */
export function isAiEndpointConfigured(): boolean {
  return aiEndpoint().length > 0;
}

export const env = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  appUrl: APP_URL,
  aiEndpoint: AI_ENDPOINT,
} as const;
