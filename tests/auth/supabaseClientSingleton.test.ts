import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  isSupabaseConfigured: () => true,
  env: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-placeholder" },
}));

const createClient = vi.fn(() => ({ __fakeClient: true, auth: {} }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("getSupabase() — must never construct more than one client, even under concurrent callers", () => {
  beforeEach(() => {
    createClient.mockClear();
    vi.resetModules();
  });
  afterEach(() => vi.resetModules());

  it("calling it from several places at once (AuthProvider + the callback page + SyncProvider, in real usage) creates exactly one client", async () => {
    const { getSupabase } = await import("@/lib/supabase/client");

    // simulates the real /auth/callback race: several mounted providers all
    // call getSupabase() in the same tick, before any of them has resolved.
    const [a, b, c] = await Promise.all([getSupabase(), getSupabase(), getSupabase()]);

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("calling it again after the first resolves still returns the same instance (no re-creation)", async () => {
    const { getSupabase } = await import("@/lib/supabase/client");

    const first = await getSupabase();
    const second = await getSupabase();

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });
});
