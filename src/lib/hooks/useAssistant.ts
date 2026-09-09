"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAuth } from "@/lib/auth/AuthProvider";
import { aiConversationsRepository, aiMemoryRepository } from "@/lib/db/repositories";
import { getAIProvider } from "@/lib/ai/registry";
import { buildAIContext } from "@/lib/ai/context";
import { resolveProposedActions } from "@/lib/ai/actions";
import {
  processActions,
  confirmAction,
  rejectAction,
  type ProcessedAction,
} from "@/lib/ai/pipeline";
import { AIUnavailableError } from "@/lib/ai/errors";
import type { AIRefMap } from "@/lib/ai/types";
import type { AiMessage } from "@/lib/types";

export type AssistantStatus = "idle" | "thinking" | "unavailable";

export interface UseAssistant {
  messages: AiMessage[];
  status: AssistantStatus;
  /** null until settings load; false when AI is off or unconfigured. */
  available: boolean | null;
  /** last turn failed and the app fell back to a calm message */
  lastError: AIUnavailableError["reason"] | null;
  /** memory lines saved on the most recent turn (for a small notice) */
  savedMemory: string[];
  /** actions the assistant proposed on the most recent turn, after the pipeline */
  proposedActions: ProcessedAction[];
  send: (text: string) => Promise<void>;
  confirmProposed: (logId: string) => Promise<"applied" | "failed" | "gone">;
  rejectProposed: (logId: string) => Promise<void>;
  reset: () => void;
}

export function useAssistant(): UseAssistant {
  const { locale } = useTranslation();
  const settings = useSettings();
  const { session } = useAuth();

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<AIUnavailableError["reason"] | null>(null);
  const [savedMemory, setSavedMemory] = useState<string[]>([]);
  const [proposedActions, setProposedActions] = useState<ProcessedAction[]>([]);
  const convIdRef = useRef<string | null>(null);

  const ai = settings?.ai;
  const available = ai ? getAIProvider(ai) !== null : null;
  const status: AssistantStatus =
    available === false ? "unavailable" : busy ? "thinking" : "idle";

  const reset = useCallback(() => {
    setMessages([]);
    setLastError(null);
    setSavedMemory([]);
    setProposedActions([]);
    setBusy(false);
    convIdRef.current = null;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || !ai || busy) return;

      const provider = getAIProvider(ai);
      const userMsg: AiMessage = { role: "user", content: body, ts: new Date().toISOString() };
      const history = [...messages, userMsg];
      setMessages(history);
      setLastError(null);
      setSavedMemory([]);
      setProposedActions([]);

      // persist the user's turn immediately (works even if AI then fails)
      try {
        if (convIdRef.current) {
          await aiConversationsRepository.appendMessages(convIdRef.current, [userMsg]);
        } else {
          const conv = await aiConversationsRepository.createWith(userMsg);
          convIdRef.current = conv.id;
        }
      } catch {
        /* offline persistence best-effort */
      }

      if (!provider) {
        return;
      }

      setBusy(true);
      try {
        let refMap: AIRefMap = {};
        let context = undefined;
        if (ai.shareContext) {
          const built = await buildAIContext({ includeMemory: ai.memoryEnabled }).catch(() => null);
          if (built) {
            context = built.context;
            refMap = built.refMap;
          }
        }

        const res = await provider.chat(
          {
            messages: history,
            persona: { name: ai.assistantName, personality: ai.personality },
            context,
            locale,
          },
          { accessToken: session?.access_token ?? null },
        );

        const reply: AiMessage = {
          role: "assistant",
          content: res.reply,
          ts: new Date().toISOString(),
        };
        setMessages((m) => [...m, reply]);
        if (convIdRef.current) {
          await aiConversationsRepository.appendMessages(convIdRef.current, [reply]).catch(() => {});
        }

        if (ai.memoryEnabled && res.memory?.length) {
          const saved: string[] = [];
          for (const mem of res.memory.slice(0, 2)) {
            try {
              await aiMemoryRepository.add(mem.kind, mem.text, "assistant");
              saved.push(mem.text);
            } catch {
              /* ignore */
            }
          }
          setSavedMemory(saved);
        }

        // Proposed actions → resolve refs → the same Zod + policy + pipeline path.
        // The model can only ever *propose*; the pipeline decides + applies.
        if (res.proposedActions?.length) {
          const resolved = resolveProposedActions(res.proposedActions, refMap);
          if (resolved.length) {
            const processed = await processActions(resolved, {
              autonomy: ai.autonomy,
              source: "assistant",
            }).catch(() => [] as ProcessedAction[]);
            setProposedActions(processed.filter((p) => p.outcome !== "rejected"));
          }
        }
        setBusy(false);
      } catch (e) {
        const reason = e instanceof AIUnavailableError ? e.reason : "server";
        setLastError(reason);
        const en =
          reason === "rate-limited"
            ? "You've reached today's assistant limit — it'll be back tomorrow. The rest of the app keeps working."
            : "I can't reach the assistant right now — everything else keeps working. Try again in a bit.";
        const ar =
          reason === "rate-limited"
            ? "وصلت إلى حدّ المساعد لهذا اليوم — يعود غدًا. بقية التطبيق تعمل كالمعتاد."
            : "لا أستطيع الوصول إلى المساعد الآن — بقية التطبيق تعمل كالمعتاد. جرّب بعد قليل.";
        const fallback: AiMessage = {
          role: "assistant",
          content: locale === "en" ? en : ar,
          ts: new Date().toISOString(),
        };
        setMessages((m) => [...m, fallback]);
        setBusy(false);
      }
    },
    [ai, busy, messages, locale, session],
  );

  const confirmProposed = useCallback(async (logId: string) => {
    const r = await confirmAction(logId);
    setProposedActions((list) =>
      list.map((p) => (p.logId === logId ? { ...p, outcome: r === "applied" ? "applied" : "failed" } : p)),
    );
    return r;
  }, []);

  const rejectProposed = useCallback(async (logId: string) => {
    await rejectAction(logId);
    setProposedActions((list) => list.filter((p) => p.logId !== logId));
  }, []);

  return {
    messages,
    status,
    available,
    lastError,
    savedMemory,
    proposedActions,
    send,
    confirmProposed,
    rejectProposed,
    reset,
  };
}
