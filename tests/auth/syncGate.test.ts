import { describe, expect, it } from "vitest";
import { computeSyncAction } from "@/lib/auth/syncGate";
import { computeAuthGate } from "@/lib/auth/routeGate";

describe("computeSyncAction — must never wipe local data while the session is still being checked", () => {
  it("cloud not configured -> idle, regardless of user/loading", () => {
    expect(computeSyncAction({ configured: false, loading: false, user: null })).toBe("idle");
    expect(computeSyncAction({ configured: false, loading: true, user: { id: "u1" } })).toBe("idle");
  });

  it("THE BUG this fixes: while the initial session check is still loading and no user is known yet, this must be idle, not wipe", () => {
    // Before the fix, `user === null` during loading was treated as "signed
    // out" and fired wipeLocal() — racing DbBootstrap's ensureDefaults() for
    // the local `settings` row. Reproduced live on Production: the row
    // existed briefly after page load, then was permanently gone.
    const action = computeSyncAction({ configured: true, loading: true, user: null });
    expect(action).toBe("idle");
    expect(action).not.toBe("wipe");
  });

  it("loading resolved, a real session exists -> start", () => {
    expect(computeSyncAction({ configured: true, loading: false, user: { id: "u1" } })).toBe("start");
  });

  it("loading resolved, genuinely no session -> wipe (the real sign-out case, still works)", () => {
    expect(computeSyncAction({ configured: true, loading: false, user: null })).toBe("wipe");
  });
});

describe("the permanent-blank-screen dead end this bug produced, proven against the real route gate", () => {
  it("once `settings` is wiped and nothing recreates it, the route gate can NEVER redirect to onboarding and NEVER renders the app — this is the exact stuck state observed live", () => {
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: { id: "u1" },
      syncReady: true,
      hasSettings: false, // wiped by the race, never recreated (no cloud settings for a brand-new sign-up)
      onboardingCompleted: false,
    });
    expect(gate.needsOnboarding).toBe(false); // the escape hatch requires hasSettings — it can't fire
    expect(gate.showApp).toBe(false); // and the app itself won't render either
    // there is no combination of the OTHER inputs that unsticks this — hasSettings
    // is the only way out, and by definition it's the thing that's missing.
  });

  it("once `settings` genuinely exists again (the fix's effect), the same user proceeds normally", () => {
    const gate = computeAuthGate({
      configured: true,
      authLoading: false,
      user: { id: "u1" },
      syncReady: true,
      hasSettings: true,
      onboardingCompleted: false,
    });
    expect(gate.needsOnboarding).toBe(true);
  });
});
