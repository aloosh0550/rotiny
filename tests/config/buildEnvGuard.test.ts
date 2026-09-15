import { describe, expect, it } from "vitest";
import { evaluateBuildEnv } from "../../scripts/check-env.mjs";

type Result = {
  ok: boolean;
  level: "info" | "warn" | "error";
  missing: string[];
  message: string;
};
const evaluate = evaluateBuildEnv as (
  env: Record<string, string | undefined>,
  setInFiles?: Set<string>,
) => Result;

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const CONFIGURED = { [URL_VAR]: "https://example.supabase.co", [KEY_VAR]: "anon-placeholder" };

describe("build env guard — Production must never silently ship local-only", () => {
  it("BLOCKS a Vercel production build when both Supabase public vars are missing", () => {
    const r = evaluate({ VERCEL_ENV: "production" });
    expect(r.ok).toBe(false);
    expect(r.level).toBe("error");
    expect(r.missing).toEqual([URL_VAR, KEY_VAR]);
    // names are reported so the fix is obvious; values are never involved
    expect(r.message).toContain(URL_VAR);
    expect(r.message).toContain("Production");
  });

  it("BLOCKS a Vercel production build when only one of the two is set (the typo case)", () => {
    const r = evaluate({ VERCEL_ENV: "production", [URL_VAR]: "https://example.supabase.co" });
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual([KEY_VAR]);
  });

  it("treats whitespace-only values as missing (a blank Vercel field must not pass)", () => {
    const r = evaluate({ VERCEL_ENV: "production", [URL_VAR]: "   ", [KEY_VAR]: "\t" });
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual([URL_VAR, KEY_VAR]);
  });

  it("ALLOWS a Vercel production build once both vars are present", () => {
    const r = evaluate({ VERCEL_ENV: "production", ...CONFIGURED });
    expect(r.ok).toBe(true);
    expect(r.level).toBe("info");
    expect(r.missing).toEqual([]);
  });

  it("ALLOWS a local build with no vars at all — offline/local-only development must keep working", () => {
    const r = evaluate({});
    expect(r.ok).toBe(true);
    expect(r.level).toBe("warn");
    expect(r.message).toContain("local-only");
  });

  it("ALLOWS a Vercel PREVIEW build without the vars (only production is gated)", () => {
    const r = evaluate({ VERCEL_ENV: "preview" });
    expect(r.ok).toBe(true);
    expect(r.level).toBe("warn");
  });

  it("ALLOWS a deliberate local-only production build via the explicit acknowledgement flag", () => {
    const r = evaluate({ VERCEL_ENV: "production", ROUTINI_ALLOW_LOCAL_ONLY_BUILD: "1" });
    expect(r.ok).toBe(true);
    expect(r.level).toBe("warn");
  });

  it("warns about a partially-configured local build, since cloud mode needs both", () => {
    const r = evaluate({ [URL_VAR]: "https://example.supabase.co" });
    expect(r.ok).toBe(true);
    expect(r.level).toBe("warn");
    expect(r.message).toContain("usually a typo");
  });

  it("counts vars supplied by a local .env file — a configured checkout must not warn", () => {
    // Node doesn't load .env.local (only Next.js does), so the guard consults
    // the files too; otherwise every local `npm run build` would cry wolf.
    const r = evaluate({}, new Set([URL_VAR, KEY_VAR]));
    expect(r.ok).toBe(true);
    expect(r.level).toBe("info");
    expect(r.missing).toEqual([]);
  });

  it("a Vercel production build is satisfied by real env vars even with no .env files present", () => {
    const r = evaluate({ VERCEL_ENV: "production", ...CONFIGURED }, new Set());
    expect(r.ok).toBe(true);
    expect(r.level).toBe("info");
  });
});
