"use client";

import { Check, ChevronsUpDown, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits } from "@/lib/hooks/useHabits";
import type { ProcessedAction } from "@/lib/ai/pipeline";
import type { TranslationKey } from "@/lib/i18n/paths";

const BUCKET_LABEL: Record<string, { ar: string; en: string }> = {
  morning: { ar: "الصباح", en: "the morning" },
  afternoon: { ar: "الظهر", en: "the afternoon" },
  evening: { ar: "المساء", en: "the evening" },
};

const KIND_KEY: Record<string, TranslationKey> = {
  deferTaskToTomorrow: "assistant.actKindDefer",
  lowerTaskPriority: "assistant.actKindLower",
  markPlanItemDone: "assistant.actKindDone",
  moveItemToBucket: "assistant.actKindMove",
  reorderPlanItem: "assistant.actKindReorder",
};

/**
 * One action the assistant proposed, after the pipeline. Shows what will happen,
 * why, and the affected item — with Apply / Dismiss (or "applied" when the
 * autonomy setting auto-applied it). The pipeline already decided; this only
 * renders that outcome + lets the user confirm a "proposed" one.
 */
export function ProposedActionCard({
  action,
  onConfirm,
  onReject,
}: {
  action: ProcessedAction;
  onConfirm: (logId: string) => void;
  onReject: (logId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const tasks = useTasks() ?? [];
  const habits = useHabits() ?? [];

  const p = action.params as {
    taskId?: string;
    refId?: string;
    refType?: string;
    bucket?: string;
  };
  const id = p.taskId ?? p.refId ?? "";
  const title =
    tasks.find((x) => x.id === id)?.title ?? habits.find((x) => x.id === id)?.title ?? "";

  const bucket = p.bucket ? (BUCKET_LABEL[p.bucket]?.[locale] ?? p.bucket) : "";
  const whatKey = KIND_KEY[action.kind];
  const what = whatKey ? t(whatKey, { title, bucket }) : action.kind;

  const done = action.outcome === "applied";
  const failed = action.outcome === "failed";

  return (
    <Card padding="sm" className="flex flex-col gap-2 border-accent/25 bg-accent-soft/40">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-accent-fg">
        <Sparkles className="size-3.5" />
        {t("assistant.proposedTitle")}
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-text-tertiary">{t("assistant.proposedWhat")}:</dt>
          <dd className="text-text-primary">{what}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-text-tertiary">{t("assistant.proposedWhy")}:</dt>
          <dd className="text-text-secondary">{action.reason}</dd>
        </div>
        {title && (
          <div className="flex gap-1.5">
            <dt className="shrink-0 text-text-tertiary">{t("assistant.proposedAffected")}:</dt>
            <dd className="text-text-secondary">{title}</dd>
          </div>
        )}
      </dl>

      {done ? (
        <p className="flex items-center gap-1 text-xs text-success">
          <Check className="size-3.5" />
          {action.decision === "auto"
            ? t("assistant.proposedAutoApplied")
            : t("assistant.proposedApplied")}
        </p>
      ) : failed ? (
        <p className="text-xs text-text-tertiary">{t("assistant.proposedFailed")}</p>
      ) : action.logId ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onConfirm(action.logId!)}>
            <Check className="size-3.5" />
            {t("assistant.proposedApply")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onReject(action.logId!)}>
            <X className="size-3.5" />
            {t("assistant.proposedDismiss")}
          </Button>
          {action.kind === "reorderPlanItem" && (
            <ChevronsUpDown className="ms-auto size-4 self-center text-text-tertiary" />
          )}
        </div>
      ) : null}
    </Card>
  );
}
