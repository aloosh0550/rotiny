import { describe, expect, it } from "vitest";
import { buildCsp, CSP_META } from "@/lib/security/csp";

function directives(csp: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of csp.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [name, ...vals] = part.split(/\s+/);
    out[name] = vals;
  }
  return out;
}

describe("Content-Security-Policy", () => {
  const d = directives(CSP_META);

  it("has a restrictive default-src and object-src", () => {
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    expect(d["frame-src"]).toEqual(["'none'"]);
  });

  it("never allows 'unsafe-eval' or a wildcard source", () => {
    expect(CSP_META).not.toContain("'unsafe-eval'");
    expect(CSP_META).not.toMatch(/(script|connect|default|img|style|font)-src[^;]*\s\*(\s|;|$)/);
    expect(CSP_META).not.toContain("http:");
  });

  it("locks connect-src to this origin + Supabase only (Gemini is server-side)", () => {
    expect(new Set(d["connect-src"])).toEqual(
      new Set(["'self'", "https://*.supabase.co", "wss://*.supabase.co"]),
    );
    expect(CSP_META).not.toContain("generativelanguage");
    expect(CSP_META).not.toContain("googleapis.com");
  });

  it("keeps the worker + manifest + font sources local", () => {
    expect(d["worker-src"]).toEqual(["'self'"]);
    expect(d["manifest-src"]).toEqual(["'self'"]);
    expect(d["font-src"]).toEqual(["'self'"]);
  });

  it("does NOT put frame-ancestors in the meta policy (ignored there; header-only)", () => {
    // clickjacking is covered by X-Frame-Options + the CSP HTTP header in vercel.json
    expect(CSP_META).not.toContain("frame-ancestors");
  });

  it("upgrades insecure requests", () => {
    expect(CSP_META).toContain("upgrade-insecure-requests");
  });

  it("buildCsp merges overrides without dropping the safe defaults", () => {
    const csp = buildCsp({ "connect-src": ["'self'", "https://example.test"] });
    expect(csp).toContain("connect-src 'self' https://example.test");
    expect(csp).toContain("object-src 'none'");
  });
});
