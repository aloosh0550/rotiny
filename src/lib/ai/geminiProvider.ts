/**
 * The Gemini provider. It NEVER holds a Gemini API key — the key lives only in
 * the server-side proxy (a Supabase Edge Function, see
 * `supabase/functions/ai-chat/`). This class just POSTs the turn + minimal
 * context to that endpoint with the user's Supabase JWT, and normalises errors
 * into `AIUnavailableError` so the UI can fall back quietly.
 *
 * Swapping providers later = a new file implementing `AIProvider` + a branch in
 * `registry.ts`. Nothing else in the app changes.
 */

import { aiEndpoint, aiFunctionUrl, isAiEndpointConfigured } from "@/lib/config/env";
import { buildSystemPrompt, renderContext } from "./personas";
import { AIUnavailableError } from "./errors";
import type {
  AIChatRequest,
  AIChatResponse,
  AIPlanRequest,
  AIPlanResponse,
  AIProvider,
} from "./types";

const TIMEOUT_MS = 25_000;

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";

  isConfigured(): boolean {
    return isAiEndpointConfigured();
  }

  async chat(
    req: AIChatRequest,
    opts: { accessToken: string | null },
  ): Promise<AIChatResponse> {
    const url = aiEndpoint();
    if (!url) throw new AIUnavailableError("unconfigured");

    const system = buildSystemPrompt(req.persona, req.locale);
    const contextBlock = req.context ? renderContext(req.context, req.locale) : null;

    const body = {
      provider: "gemini",
      system,
      context: contextBlock,
      locale: req.locale,
      // only role + content cross the wire; timestamps stay local
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      throw new AIUnavailableError(
        e instanceof DOMException && e.name === "AbortError" ? "timeout" : "network",
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) throw new AIUnavailableError("unauthorized");
    if (res.status === 501 || res.status === 424) throw new AIUnavailableError("unconfigured");
    if (!res.ok) throw new AIUnavailableError("server", `AI proxy ${res.status}`);

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new AIUnavailableError("server", "bad AI response");
    }

    const reply = (json as { reply?: unknown }).reply;
    if (typeof reply !== "string" || !reply.trim()) {
      throw new AIUnavailableError("server", "empty AI reply");
    }

    const rawMemory = (json as { memory?: unknown }).memory;
    const memory = Array.isArray(rawMemory)
      ? rawMemory
          .filter(
            (m): m is { kind: string; text: string } =>
              !!m && typeof (m as { text?: unknown }).text === "string",
          )
          .filter((m) => ["preference", "pattern", "fact"].includes(m.kind))
          .map((m) => ({ kind: m.kind as "preference" | "pattern" | "fact", text: m.text }))
      : undefined;

    return { reply: reply.trim(), memory: memory?.length ? memory : undefined };
  }

  async plan(
    req: AIPlanRequest,
    opts: { accessToken: string | null },
  ): Promise<AIPlanResponse> {
    const url = aiFunctionUrl("ai-plan");
    if (!url) throw new AIUnavailableError("unconfigured");

    const body = {
      provider: "gemini",
      today: req.today,
      energy: req.energy,
      locale: req.locale,
      // titles + ids only — no notes, no deadlines, no history
      candidates: req.candidates.map((c) => ({
        refId: c.refId,
        refType: c.refType,
        title: c.title,
        bucket: c.bucket,
        durationMinutes: c.durationMinutes,
        reason: c.reason,
      })),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      throw new AIUnavailableError(
        e instanceof DOMException && e.name === "AbortError" ? "timeout" : "network",
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) throw new AIUnavailableError("unauthorized");
    if (res.status === 501 || res.status === 424) throw new AIUnavailableError("unconfigured");
    if (!res.ok) throw new AIUnavailableError("server", `AI plan ${res.status}`);

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new AIUnavailableError("server", "bad AI plan response");
    }

    const order = (json as { order?: unknown }).order;
    if (!Array.isArray(order) || !order.every((x) => typeof x === "string")) {
      throw new AIUnavailableError("server", "AI plan missing order");
    }
    const rawReasons = (json as { reasons?: unknown }).reasons;
    let reasons: Record<string, string> | undefined;
    if (rawReasons && typeof rawReasons === "object") {
      reasons = {};
      for (const [k, v] of Object.entries(rawReasons as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) reasons[k] = v.trim().slice(0, 200);
      }
    }
    return { order: order as string[], reasons };
  }
}
