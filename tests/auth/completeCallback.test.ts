import { describe, expect, it, vi } from "vitest";
import { completeAuthCallback, type CallbackSupabaseClient } from "@/lib/auth/completeCallback";

const noSleep = () => Promise.resolve(); // tests don't wait on real timers

function fakeClient(overrides: Partial<CallbackSupabaseClient["auth"]> = {}): CallbackSupabaseClient {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      ...overrides,
    },
  };
}

describe("completeAuthCallback — OAuth/magic-link return, must always resolve, never hang", () => {
  it("a valid code that exchanges into a session -> success, on the first poll", async () => {
    const client = fakeClient({ getSession: vi.fn().mockResolvedValue({ data: { session: { id: "s1" } } }) });
    const result = await completeAuthCallback(client, "https://rotiny.vercel.app/auth/callback?code=real123", {
      sleep: noSleep,
    });
    expect(result).toBe("success");
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      "https://rotiny.vercel.app/auth/callback?code=real123",
    );
  });

  it("an invalid/expired code that never produces a session -> failed, not stuck forever", async () => {
    const client = fakeClient(); // getSession always resolves to no session
    const result = await completeAuthCallback(client, "https://rotiny.vercel.app/auth/callback?code=fake123", {
      sleep: noSleep,
      maxAttempts: 3,
    });
    expect(result).toBe("failed");
    expect(client.auth.getSession).toHaveBeenCalledTimes(3);
  });

  it("no code param at all (missing code) -> skips the exchange, polls, then fails", async () => {
    const client = fakeClient();
    const result = await completeAuthCallback(client, "https://rotiny.vercel.app/auth/callback", {
      sleep: noSleep,
      maxAttempts: 2,
    });
    expect(result).toBe("failed");
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchangeCodeForSession throwing (not just resolving with an error) -> failed, never an unhandled rejection", async () => {
    const client = fakeClient({ exchangeCodeForSession: vi.fn().mockRejectedValue(new Error("network down")) });
    const result = await completeAuthCallback(client, "https://rotiny.vercel.app/auth/callback?code=x", {
      sleep: noSleep,
      maxAttempts: 2,
    });
    expect(result).toBe("failed");
  });

  it("getSession itself throwing mid-poll -> failed, the page must still show something instead of hanging", async () => {
    const client = fakeClient({ getSession: vi.fn().mockRejectedValue(new Error("boom")) });
    const result = await completeAuthCallback(client, "https://rotiny.vercel.app/auth/callback?code=x", {
      sleep: noSleep,
    });
    expect(result).toBe("failed");
  });

  it("a malformed URL -> failed immediately, not a thrown exception the caller must catch", async () => {
    const client = fakeClient();
    const result = await completeAuthCallback(client, "not a url at all", { sleep: noSleep });
    expect(result).toBe("failed");
  });

  it("stops polling early when cancelled (e.g. the component unmounted), still resolving", async () => {
    const client = fakeClient();
    const result = await completeAuthCallback(client, "https://rotiny.vercel.app/auth/callback?code=x", {
      sleep: noSleep,
      maxAttempts: 40,
      isCancelled: () => true,
    });
    expect(result).toBe("failed");
    expect(client.auth.getSession).not.toHaveBeenCalled();
  });
});
