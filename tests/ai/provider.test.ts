import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  aiEndpoint: () => "https://example.test/functions/v1/ai-chat",
  aiFunctionUrl: (fn: string) => `https://example.test/functions/v1/${fn}`,
  isAiEndpointConfigured: () => true,
  isSupabaseConfigured: () => true,
  env: {},
}));

import { GeminiProvider } from "@/lib/ai/geminiProvider";
import { AIUnavailableError } from "@/lib/ai/errors";
import { getAIProvider, isAssistantAvailable } from "@/lib/ai/registry";
import type { AiSettings } from "@/lib/types";
import type { AIChatRequest, AIPlanRequest } from "@/lib/ai/types";

const req: AIChatRequest = {
  messages: [{ role: "user", content: "رتب يومي", ts: "2026-09-07T09:00:00Z" }],
  persona: { name: "رفيق", personality: "supportive" },
  locale: "ar",
};

const AI: AiSettings = {
  enabled: true,
  provider: "gemini",
  assistantName: "رفيق",
  personality: "supportive",
  autonomy: "conservative",
  memoryEnabled: true,
  shareContext: true,
};

describe("GeminiProvider", () => {
  const provider = new GeminiProvider();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is configured when an endpoint resolves", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("posts to the endpoint with the bearer token and returns the reply", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ reply: "لنبدأ بأهم مهمة." }), { status: 200 }),
    );
    const res = await provider.chat(req, { accessToken: "jwt-123" });
    expect(res.reply).toBe("لنبدأ بأهم مهمة.");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.test/functions/v1/ai-chat");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer jwt-123");
    const body = JSON.parse(init.body as string);
    // only role + content cross the wire — no timestamps
    expect(body.messages).toEqual([{ role: "user", content: "رتب يومي" }]);
  });

  it("maps 401 to an unauthorized AIUnavailableError", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 401 }));
    await expect(provider.chat(req, { accessToken: null })).rejects.toMatchObject({
      name: "AIUnavailableError",
      reason: "unauthorized",
    });
  });

  it("maps 501 (key not set server-side) to unconfigured", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 501 }));
    await expect(provider.chat(req, { accessToken: null })).rejects.toMatchObject({
      reason: "unconfigured",
    });
  });

  it("maps 429 to a rate-limited error", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 429 }));
    await expect(provider.chat(req, { accessToken: null })).rejects.toMatchObject({
      reason: "rate-limited",
    });
  });

  it("maps a network failure to a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(provider.chat(req, { accessToken: null })).rejects.toBeInstanceOf(
      AIUnavailableError,
    );
  });

  it("rejects an empty reply", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ reply: "  " }), { status: 200 }));
    await expect(provider.chat(req, { accessToken: null })).rejects.toMatchObject({
      reason: "server",
    });
  });

  it("passes through validated memory proposals", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          reply: "تمام",
          memory: [
            { kind: "preference", text: "يفضّل الرياضة صباحًا" },
            { kind: "bogus", text: "x" },
            { text: "no kind" },
          ],
        }),
        { status: 200 },
      ),
    );
    const res = await provider.chat(req, { accessToken: null });
    expect(res.memory).toEqual([{ kind: "preference", text: "يفضّل الرياضة صباحًا" }]);
  });

  it("passes proposedActions through verbatim (client resolves + re-validates)", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          reply: "حسنًا",
          proposedActions: [
            { kind: "deferTaskToTomorrow", ref: "t2", reason: "لا يتّسع الوقت" },
            "not an object",
          ],
        }),
        { status: 200 },
      ),
    );
    const res = await provider.chat(req, { accessToken: null });
    expect(res.proposedActions).toEqual([
      { kind: "deferTaskToTomorrow", ref: "t2", reason: "لا يتّسع الوقت" },
    ]);
  });

  it("omits proposedActions when the server sends none", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ reply: "أهلًا" }), { status: 200 }));
    const res = await provider.chat(req, { accessToken: null });
    expect(res.proposedActions).toBeUndefined();
  });

  describe("plan()", () => {
    const planReq: AIPlanRequest = {
      today: "2026-09-07",
      energy: "good",
      locale: "ar",
      candidates: [
        { refType: "task", refId: "a", title: "أ", bucket: "morning", durationMinutes: 30, reason: "r", score: 1 },
        { refType: "task", refId: "b", title: "ب", bucket: "morning", durationMinutes: 30, reason: "r", score: 2 },
      ],
    };

    it("hits the ai-plan endpoint and returns a validated order + reasons", async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ order: ["b", "a"], reasons: { a: "ابدأ بها" } }), { status: 200 }),
      );
      const res = await provider.plan(planReq, { accessToken: "jwt" });
      expect(fetchMock.mock.calls[0][0]).toBe("https://example.test/functions/v1/ai-plan");
      expect(res.order).toEqual(["b", "a"]);
      expect(res.reasons).toEqual({ a: "ابدأ بها" });
      // never sends notes/deadlines/history
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(Object.keys(body.candidates[0]).sort()).toEqual(
        ["bucket", "durationMinutes", "reason", "refId", "refType", "title"].sort(),
      );
    });

    it("rejects a response with no usable order", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ reasons: {} }), { status: 200 }));
      await expect(provider.plan(planReq, { accessToken: null })).rejects.toMatchObject({
        reason: "server",
      });
    });

    it("maps 429 / 401 the same way as chat", async () => {
      fetchMock.mockResolvedValue(new Response("{}", { status: 429 }));
      await expect(provider.plan(planReq, { accessToken: null })).rejects.toMatchObject({
        reason: "rate-limited",
      });
      fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
      await expect(provider.plan(planReq, { accessToken: null })).rejects.toMatchObject({
        reason: "unauthorized",
      });
    });
  });
});

describe("registry", () => {
  it("returns null when AI is disabled", () => {
    expect(getAIProvider({ ...AI, enabled: false })).toBeNull();
    expect(isAssistantAvailable({ ...AI, enabled: false })).toBe(false);
  });

  it("returns null for provider 'none'", () => {
    expect(getAIProvider({ ...AI, provider: "none" })).toBeNull();
  });

  it("returns the Gemini provider when enabled + configured", () => {
    expect(getAIProvider(AI)?.id).toBe("gemini");
  });
});
