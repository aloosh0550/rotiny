/**
 * Where Supabase should send the browser back to after OAuth / a magic-link
 * click, extracted as a pure function so it's testable without a DOM.
 *
 * Deliberately NOT a static env var (no `NEXT_PUBLIC_SITE_URL`): it reads the
 * *actual* origin serving the page at call time, so Production gets
 * `https://rotiny.vercel.app`, a Vercel preview deployment gets its own
 * preview URL, and local dev gets `http://localhost:3000` — all correctly,
 * with zero per-environment configuration and zero risk of a stale/hardcoded
 * domain. This was already the app's behavior before this file existed
 * (previously inlined in `AuthProvider`); extracting it changes nothing
 * about what gets sent to Supabase, only makes it independently verifiable.
 *
 * If Supabase still redirects to the wrong host despite this, the client
 * request was correct and the mismatch is in the Supabase project's own Auth
 * settings (Site URL / Redirect URLs allowlist) — see
 * `docs/AUTH_REDIRECT_SUPABASE_SETUP.md`.
 */

const CALLBACK_PATH = "/auth/callback";
export const NATIVE_CALLBACK_URL = "routini://auth/callback";

export interface RedirectUrlInput {
  /** True inside the Capacitor Android/iOS shell. */
  isNative: boolean;
  /** The page's current origin (`window.location.origin`), or undefined during SSR. */
  origin: string | undefined;
}

/**
 * @returns the exact `redirectTo` value to pass to `signInWithOAuth` /
 * `signInWithOtp`, or `undefined` when there is no origin to build one from
 * (SSR — this only ever runs client-side in practice, since sign-in is only
 * triggered by a button click, but the type stays honest about it).
 */
export function computeAuthRedirectUrl({ isNative, origin }: RedirectUrlInput): string | undefined {
  if (isNative) return NATIVE_CALLBACK_URL;
  if (!origin) return undefined;
  return `${origin}${CALLBACK_PATH}`;
}
