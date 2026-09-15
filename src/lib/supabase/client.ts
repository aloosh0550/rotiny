"use client";

/**
 * The browser/app Supabase client. Cloud-first: Supabase Postgres is the source
 * of truth; this client talks to it directly, protected by Row-Level Security
 * (the anon key is public by design).
 *
 * Returns `null` when Supabase is not configured (no env vars) — callers must
 * handle that and fall back to local-only behaviour. This keeps the app working
 * with zero backend until the owner wires a project.
 *
 * No secret is ever referenced here. The service-role key must NEVER reach the
 * client and is not importable from this module.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/config/env";

// A single in-flight *promise*, not just a resolved value. Several places
// mount at once (AuthProvider, SyncProvider, and — on /auth/callback
// specifically — the callback page itself all call this on mount), and the
// old guard `if (cached) return cached;` only became true AFTER the first
// caller's `await import(...)` resolved. Two callers racing before that could
// both see no cached client and each construct their own `createClient()`
// against the SAME storage key — exactly the "Multiple GoTrueClient
// instances detected" warning Supabase logs, observed live on the /auth
// callback page. Caching the promise closes the race: every caller, no
// matter how many fire in the same tick, awaits the one construction.
let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Lazily create (once) and return the Supabase client, or `null` when the
 * project isn't configured. The `@supabase/supabase-js` module is imported
 * dynamically so it never enters the bundle for a local-only build.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      return createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      });
    })();
  }
  return clientPromise;
}

/** Synchronous check for render-time branching. Does not create the client. */
export const cloudEnabled = isSupabaseConfigured;
