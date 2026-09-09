import { describe, expect, it } from "vitest";
import { resolveDeepLink } from "@/lib/services/deepLink/DeepLinkService";

describe("resolveDeepLink", () => {
  it("routini://home", () => {
    expect(resolveDeepLink("routini://home")?.path).toBe("/");
  });
  it("routini://task/abc → task detail query route", () => {
    expect(resolveDeepLink("routini://task/abc")?.path).toBe("/tasks/detail?id=abc");
  });
  it("routini://task/abc?complete=1 → completeTask action", () => {
    const r = resolveDeepLink("routini://task/abc?complete=1");
    expect(r?.path).toBe("/tasks/detail?id=abc");
    expect(r?.action).toBe("completeTask");
    expect(r?.actionId).toBe("abc");
  });
  it("routini://auth/callback?code=abc → auth callback page with the query", () => {
    expect(resolveDeepLink("routini://auth/callback?code=abc")?.path).toBe(
      "/auth/callback?code=abc",
    );
  });
  it("routini://appointment/xyz", () => {
    expect(resolveDeepLink("routini://appointment/xyz")?.path).toBe("/appointments/detail?id=xyz");
  });
  it("routini://habit/h1", () => {
    expect(resolveDeepLink("routini://habit/h1")?.path).toBe("/habits/detail?id=h1");
  });
  it("routini://adhkar/morning → adhkar with category", () => {
    expect(resolveDeepLink("routini://adhkar/morning")?.path).toBe("/adhkar?category=morning");
  });
  it("routini://add → smart add action", () => {
    const r = resolveDeepLink("routini://add");
    expect(r?.action).toBe("openSmartAdd");
    expect(r?.path).toContain("add-smart=1");
  });
  it("routini://search?q=ahmad forwards the query", () => {
    expect(resolveDeepLink("routini://search?q=ahmad")?.path).toBe("/search?q=ahmad");
  });
  it("https link with matching path", () => {
    expect(resolveDeepLink("https://routini.app/tasks/detail?id=5")?.path).toBe("/tasks/detail?id=5");
  });
  it("unknown host → null", () => {
    expect(resolveDeepLink("routini://nonsense/1")).toBeNull();
  });
  it("empty → null", () => {
    expect(resolveDeepLink("")).toBeNull();
  });
});
