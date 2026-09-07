"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAssistant } from "@/lib/hooks/useAssistant";
import { useSuggestions } from "@/lib/hooks/useSuggestions";
import { isAiEndpointConfigured } from "@/lib/config/env";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

export default function AssistantPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { messages, status, available, savedMemory, send, reset } = useAssistant();
  const suggestions = useSuggestions();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void send(text);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col md:h-dvh">
      <SubpageHeader
        title={t("assistant.pageTitle")}
        backHref={ROUTES.home}
        action={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 text-xs font-medium text-text-tertiary"
            >
              <RotateCcw className="size-3.5" />
              {t("assistant.clear")}
            </button>
          ) : undefined
        }
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
        {available === false && (
          <EmptyState
            icon={<Sparkles />}
            title={t("assistant.offTitle")}
            subtitle={
              isAiEndpointConfigured() ? t("assistant.offBody") : t("assistant.unconfiguredBody")
            }
            action={
              <Button size="sm" variant="secondary" onClick={() => router.push(ROUTES.settingsAi)}>
                {t("assistant.openSettings")}
              </Button>
            }
          />
        )}

        {available !== false && messages.length === 0 && (
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-sm text-text-secondary">{t("assistant.greeting")}</p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && messages.length === 0 && (
          <section className="mt-4 flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold text-text-secondary">
              {t("assistant.suggestionsTitle")}
            </h2>
            {suggestions.map((s) =>
              s.actionRoute ? (
                <Link key={s.id} href={s.actionRoute}>
                  <Card interactive padding="sm" className="text-sm text-text-secondary">
                    {s.text}
                  </Card>
                </Link>
              ) : (
                <Card key={s.id} padding="sm" className="text-sm text-text-secondary">
                  {s.text}
                </Card>
              ),
            )}
          </section>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "self-end bg-accent text-accent-ink"
                  : "self-start bg-surface-sunken text-text-primary",
              )}
            >
              {m.content}
            </div>
          ))}
          {status === "thinking" && (
            <div className="self-start rounded-2xl bg-surface-sunken px-3.5 py-2.5 text-sm text-text-tertiary">
              {t("assistant.thinking")}
            </div>
          )}
          {savedMemory.map((mem, i) => (
            <p key={`mem-${i}`} className="self-start text-xs text-text-tertiary">
              {t("assistant.memorySaved", { text: mem })}
            </p>
          ))}
        </div>
      </div>

      {available !== false && (
        <div className="pb-safe border-t border-border bg-bg px-4 pt-3">
          <p className="mb-2 text-[11px] text-text-tertiary">{t("assistant.privacyNote")}</p>
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder={t("assistant.inputPlaceholder")}
              className="max-h-32 min-h-12 flex-1 resize-none rounded-md border border-border bg-bg-elevated px-3.5 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:shadow-focus"
            />
            <Button
              size="md"
              onClick={submit}
              disabled={!draft.trim() || status === "thinking"}
              aria-label={t("assistant.send")}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
