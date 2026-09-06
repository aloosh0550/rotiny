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

/** True only when BOTH Supabase public vars are present. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export const env = {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  appUrl: APP_URL,
} as const;
