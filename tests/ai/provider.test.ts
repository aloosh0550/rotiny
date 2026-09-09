import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  aiEndpoint: () => "https://example.test/functions/v1/ai-chat",
  isAiEndpointConfigured: () => true,
  isSupabaseConfigured: () => true,
  env: {},
}));

import { GeminiProvider } from "@/lib/ai/geminiProvider";
import { AIUnavailableError } from "@/lib/ai/errors";
import { getAIProvider, isAssistantAvailable } from "@/lib/ai/registry";
import type { AiSettings } from "@/lib/types";
import type { AIChatRequest } from "@/lib/ai/types";

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
