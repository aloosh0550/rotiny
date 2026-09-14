/**
 * The `(app)` route group's auth/onboarding gate, extracted as a pure
 * function so it's testable without rendering React. Behavior is byte-for-byte
 * identical to what `(app)/layout.tsx` computed inline before this extraction
 * — this file changes nothing about what the app does, only makes the exact
 * same decision independently verifiable.
 *
 * Cloud-first design (see `AuthProvider`): when Supabase is NOT configured,
 * `configured` is false and this gate never requires sign-in — the app runs
 * fully local-only, by design. This is intentional, not a bypass bug; see
 * `AuthProvider.tsx`'s header comment. When Supabase IS configured, sign-in
 * is required before anything else (checked ahead of onboarding).
 */

export interface AuthGateInput {
  /** Supabase env is present — cloud mode is possible at all. */
  configured: boolean;
  /** The initial session check hasn't resolved yet. */
  authLoading: boolean;
  /** The signed-in user, or null. */
  user: unknown | null;
  /** This device's initial cloud pull for the current account has completed. */
  syncReady: boolean;
  /** The local settings row exists. */
  hasSettings: boolean;
  /** The onboarding flow has been completed on this device. */
  onboardingCompleted: boolean;
}

export interface AuthGateResult {
  /** No valid session while cloud is configured — must sign in first. */
  needsSignIn: boolean;
  /** Signed in, cloud configured, but the first pull hasn't landed yet. */
  cloudSettling: boolean;
  /** Past sign-in/settling, but this device hasn't finished onboarding. */
  needsOnboarding: boolean;
  /** Render a blank placeholder instead of content (loading / gating). */
  showBlank: boolean;
  /** Render the real app shell. */
  showApp: boolean;
}

export function computeAuthGate(input: AuthGateInput): AuthGateResult {
  const { configured, authLoading, user, syncReady, hasSettings, onboardingCompleted } = input;

  const needsSignIn = configured && !authLoading && !user;
  const cloudSettling = configured && !!user && !syncReady;
  const needsOnboarding = !needsSignIn && !cloudSettling && hasSettings && !onboardingCompleted;

  const showBlank =
    (configured && authLoading) || needsSignIn || cloudSettling || !hasSettings || !onboardingCompleted;

  return {
    needsSignIn,
    cloudSettling,
    needsOnboarding,
    showBlank,
    showApp: !showBlank,
  };
}
