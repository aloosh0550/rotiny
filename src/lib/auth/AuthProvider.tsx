"use client";

/**
 * Auth context for Routini's cloud-first mode.
 *
 * - When Supabase is NOT configured (`isSupabaseConfigured()` false): this is a
 *   transparent pass-through. `configured` is false, `user` is null, the app runs
 *   in local-only mode exactly as before. Nothing is gated.
 * - When Supabase IS configured: it tracks the Supabase session, exposes sign-in
 *   / sign-out, and `configured` is true so the app can show a sign-in screen and
 *   start syncing.
 *
 * No secret is referenced here. Session persistence is handled by the Supabase
 * SDK (see `getSupabase`).
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabase } from "@/lib/supabase/client";

export interface AuthState {
  /** True when Supabase env is present — i.e. cloud mode is possible. */
  configured: boolean;
  /** True until the initial session check resolves. */
  loading: boolean;
  user: User | null;
  session: Session | null;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const noop = async () => ({ error: null });

const AuthContext = createContext<AuthState>({
  configured: false,
  loading: false,
  user: null,
  session: null,
  signInWithEmail: noop,
  signInWithGoogle: noop,
  signOut: async () => {},
});

const REDIRECT_PATH = "/auth/callback";

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!configured) return;
    let unsub: (() => void) | undefined;

    void (async () => {
      const supabase = await getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next ?? null);
      });
      unsub = () => listener.subscription.unsubscribe();
    })();

    return () => unsub?.();
  }, [configured]);

  const value = useMemo<AuthState>(() => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}${REDIRECT_PATH}` : undefined;

    return {
      configured,
      loading,
      user: session?.user ?? null,
      session,
      async signInWithEmail(email: string) {
        const supabase = await getSupabase();
        if (!supabase) return { error: "cloud-not-configured" };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        return { error: error?.message ?? null };
      },
      async signInWithGoogle() {
        const supabase = await getSupabase();
        if (!supabase) return { error: "cloud-not-configured" };
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        return { error: error?.message ?? null };
      },
      async signOut() {
        const supabase = await getSupabase();
        if (!supabase) return;
        await supabase.auth.signOut();
        setSession(null);
      },
    };
  }, [configured, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
