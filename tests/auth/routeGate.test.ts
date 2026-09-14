import { describe, expect, it } from "vitest";
import { computeAuthGate } from "@/lib/auth/routeGate";

// A device that already finished onboarding — isolates the cases below to
// just the auth/sync dimension, which is what this investigation is about.
const ONBOARDED = { hasSettings: true, onboardingCompleted: true };

describe("computeAuthGate — the (app) route group's sign-in/onboarding decision", () => {
  it("cloud configured, brand-new visitor (no session yet, auth check still resolving) → blank, then sign-in once it resolves", () => {
    const whileLoading = computeAuthGate({
      configured: true,
      authLoading: true,
      user: null,
      syncReady: false,
      ...ONBOARDED,
    });
    expect(whileLoading.showApp).toBe(false);
    expect(whileLoading.needsSignIn).toBe(false); // not yet — still loading, don't flash sign-in then yank it away

    const resolved = computeAuthGate({
      configured: true,
      authLoading: false,
      user: null,
      syncReady: false,
      ...ONBOARDED,
    });
    expect(resolved.needsSignIn).toBe(true);
    expect(resolved.showApp).toBe(false);
  });

  it("cloud configured, user has a valid session → the app renders, sign-in is never requested", () => {
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: { id: "u1" },
      syncReady: true, // first cloud pull already landed
      ...ONBOARDED,
    });
    expect(gate.needsSignIn).toBe(false);
    expect(gate.cloudSettling).toBe(false);
    expect(gate.showApp).toBe(true);
  });

  it("cloud configured, signed in, but the first sync pull hasn't landed yet → blank (not the app, not sign-in) — avoids a flash of onboarding for a returning user", () => {
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: { id: "u1" },
      syncReady: false,
      ...ONBOARDED,
    });
    expect(gate.needsSignIn).toBe(false);
    expect(gate.cloudSettling).toBe(true);
    expect(gate.showApp).toBe(false);
  });

  it("sign-out then reopen: no session anymore → sign-in is required again, never silently re-admitted", () => {
    // simulates AuthProvider.signOut() having cleared the session, then a
    // fresh app load re-evaluating the gate exactly as a first-time visitor
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: null,
      syncReady: false,
      ...ONBOARDED,
    });
    expect(gate.needsSignIn).toBe(true);
    expect(gate.showApp).toBe(false);
  });

  it("page refresh while signed in: the Supabase SDK's own session restore means user is present again once auth resolves → stays in the app, no interruption", () => {
    // "loading" briefly true on first paint, restored to a valid user once
    // getSession() resolves — mirrors AuthProvider's real sequence.
    const midRefresh = computeAuthGate({
      configured: true,
      authLoading: true,
      user: null,
      syncReady: false,
      ...ONBOARDED,
    });
    expect(midRefresh.showApp).toBe(false); // blank while resolving, not booted to sign-in

    const afterRestore = computeAuthGate({
      configured: true,
      authLoading: false,
      user: { id: "u1" },
      syncReady: true,
      ...ONBOARDED,
    });
    expect(afterRestore.needsSignIn).toBe(false);
    expect(afterRestore.showApp).toBe(true);
  });

  it("cloud NOT configured (local-only mode — intentional, documented in AuthProvider): never requires sign-in, runs the app straight through", () => {
    const gate = computeAuthGate({
      configured: false,
      authLoading: false,
      user: null,
      syncReady: false,
      ...ONBOARDED,
    });
    expect(gate.needsSignIn).toBe(false);
    expect(gate.cloudSettling).toBe(false);
    expect(gate.showApp).toBe(true);
  });

  it("sign-in takes priority over onboarding: a signed-out visitor on a device that never onboarded is sent to sign-in first, not onboarding", () => {
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: null,
      syncReady: false,
      hasSettings: false,
      onboardingCompleted: false,
    });
    expect(gate.needsSignIn).toBe(true);
    expect(gate.needsOnboarding).toBe(false);
  });

  it("past sign-in, cloud settled, but onboarding not done on this device → onboarding is requested", () => {
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: { id: "u1" },
      syncReady: true,
      hasSettings: true,
      onboardingCompleted: false,
    });
    expect(gate.needsSignIn).toBe(false);
    expect(gate.cloudSettling).toBe(false);
    expect(gate.needsOnboarding).toBe(true);
    expect(gate.showApp).toBe(false);
  });
});
