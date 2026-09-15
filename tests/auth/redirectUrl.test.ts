import { describe, expect, it } from "vitest";
import { computeAuthRedirectUrl, NATIVE_CALLBACK_URL } from "@/lib/auth/redirectUrl";

describe("computeAuthRedirectUrl — where Supabase sends the browser back after sign-in", () => {
  it("Production origin -> the Production callback, never localhost", () => {
    const url = computeAuthRedirectUrl({ isNative: false, origin: "https://rotiny.vercel.app" });
    expect(url).toBe("https://rotiny.vercel.app/auth/callback");
    expect(url).not.toContain("localhost");
  });

  it("local development origin -> localhost callback (dev must keep working)", () => {
    const url = computeAuthRedirectUrl({ isNative: false, origin: "http://localhost:3000" });
    expect(url).toBe("http://localhost:3000/auth/callback");
  });

  it("a Vercel preview deployment's own origin -> that same preview's callback, not Production and not localhost", () => {
    const previewOrigin = "https://rotiny-git-redesign-routini-v2-aloosh0550.vercel.app";
    const url = computeAuthRedirectUrl({ isNative: false, origin: previewOrigin });
    expect(url).toBe(`${previewOrigin}/auth/callback`);
    expect(url).not.toBe("https://rotiny.vercel.app/auth/callback");
    expect(url).not.toContain("localhost");
  });

  it("native (Capacitor) platform -> the app's custom URL scheme, regardless of any web origin", () => {
    const url = computeAuthRedirectUrl({ isNative: true, origin: "https://rotiny.vercel.app" });
    expect(url).toBe(NATIVE_CALLBACK_URL);
    expect(url).toBe("routini://auth/callback");
  });

  it("no origin available (SSR) -> undefined rather than guessing a host", () => {
    expect(computeAuthRedirectUrl({ isNative: false, origin: undefined })).toBeUndefined();
  });

  it("never fabricates a redirect for one origin using another origin's host", () => {
    // guards against a regression where the path is appended to a
    // differently-hardcoded base instead of the actual current origin
    const prod = computeAuthRedirectUrl({ isNative: false, origin: "https://rotiny.vercel.app" });
    const local = computeAuthRedirectUrl({ isNative: false, origin: "http://localhost:3000" });
    expect(prod).not.toBe(local);
    expect(new URL(prod!).host).toBe("rotiny.vercel.app");
    expect(new URL(local!).host).toBe("localhost:3000");
  });
});
