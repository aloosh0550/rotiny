"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAiActionHistory } from "@/lib/hooks/useAiActionHistory";
import { formatRelativeTime } from "@/lib/time/dateUtils";
import type { AiActionLog } from "@/lib/types";
import type { TranslationKey } from "@/lib/i18n/paths";

const STATUS_KEY: Record<string, { key: TranslationKey; tone: string }> = {
  proposed: { key: "assistantSettings.histProposed", tone: "text-accent-fg" },
  applied: { key: "assistantSettings.histApplied", tone: "text-success" },
  rejected: { key: "assistantSettings.histRejected", tone: "text-text-tertiary" },
  failed: { key: "assistantSettings.histFailed", tone: "text-warning" },
};
const SOURCE_KEY: Record<string, TranslationKey> = {
  planner: "assistantSettings.histSourcePlanner",
  reschedule: "assistantSettings.histSourceReschedule",
  assistant: "assistantSettings.histSourceAssistant",
};

function line(a: AiActionLog): string {
  // the deterministic reason is the human-readable summary; kind is the fallback
  return a.reason?.trim() || a.kind;
}

export function AiActionHistory() {
  const { t, locale } = useTranslation();
  const { items, clear } = useAiActionHistory(50);

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-text-secondary">
          {t("assistantSettings.history")}
        </h3>
        <p className="text-xs text-text-tertiary">{t("assistantSettings.historyHint")}</p>
      </div>

      {items === undefined ? (
        <div className="h-16 skeleton rounded-lg" />
      ) : items.length === 0 ? (
        <p className="px-1 text-xs text-text-tertiary">{t("assistantSettings.historyEmpty")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {items.map((a) => {
              const st = STATUS_KEY[a.status] ?? STATUS_KEY.proposed;
              return (
                <Card key={a.id} padding="sm" className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {line(a)}
                    </span>
                    <span className={`shrink-0 text-[11px] font-medium ${st.tone}`}>
                      {t(st.key)}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-tertiary">
                    {t(SOURCE_KEY[a.source] ?? "assistantSettings.histSourcePlanner")} ·{" "}
                    {formatRelativeTime(new Date(a.sync.createdAt), locale)}
                  </span>
                </Card>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="self-start text-danger"
            onClick={() => void clear()}
          >
            {t("assistantSettings.historyClear")}
          </Button>
        </>
      )}
    </section>
  );
}
