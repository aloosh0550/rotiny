"use client";

import { useMemo, useState } from "react";
import { Clock, MoveRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLocalPlan } from "@/lib/hooks/useLocalPlan";
import { useNow } from "@/lib/hooks/useNow";
import { tasksRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { formatDuration } from "@/lib/time/dateUtils";
import type { PlanItem } from "@/lib/planner/localPlanner";

/**
 * "أنا متأخر" — deterministic triage. Given the time left in the day, show what
 * realistically fits (priority order) and offer to push the rest to tomorrow.
 * Never auto-deletes; appointments/habits are only surfaced, not moved.
 */
export function LateMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const plan = useLocalPlan();
  const now = useNow(60_000);
  const [moved, setMoved] = useState<Set<string>>(new Set());

  const { fits, overflow, minutesLeft } = useMemo(() => {
    const dayEnd = new Date(now);
    dayEnd.setHours(22, 0, 0, 0);
    let budget = Math.max(0, (dayEnd.getTime() - now.getTime()) / 60_000);
    const fits: PlanItem[] = [];
    const overflow: PlanItem[] = [];
    for (const item of plan?.remaining ?? []) {
      if (item.type === "appointment") {
        fits.push(item);
        budget -= item.durationMinutes;
        continue;
      }
      if (budget - item.durationMinutes >= 0) {
        fits.push(item);
        budget -= item.durationMinutes;
      } else {
        overflow.push(item);
      }
    }
    return { fits, overflow, minutesLeft: Math.round(Math.max(0, (dayEnd.getTime() - now.getTime()) / 60_000)) };
  }, [plan, now]);

  async function moveToTomorrow(item: PlanItem) {
    if (item.type !== "task") return;
    const task = await tasksRepository.getById(item.id);
    if (!task) return;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const time = task.hasTime && task.dueAt ? task.dueAt.slice(11, 16) : "09:00";
    const dueAt = new Date(
      `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(
        tomorrow.getDate(),
      ).padStart(2, "0")}T${time}:00`,
    ).toISOString();
    const updated = await tasksRepository.update(item.id, { dueAt });
    await onEntityMutated({ type: "task", op: "update", entity: updated });
    setMoved((s) => new Set(s).add(item.id));
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("plan.lateTitle")}>
      <div className="flex flex-col gap-4 pb-2">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="size-4 text-accent-fg" />
          {t("plan.lateTimeLeft", { time: formatDuration(minutesLeft, locale) })}
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-text-secondary">
            {t("plan.lateFocus")}
          </span>
          {fits.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t("plan.lateNothing")}</p>
          ) : (
            fits.slice(0, 6).map((i) => (
              <div key={`${i.type}-${i.id}`} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 rounded-full bg-accent" />
                <span className="min-w-0 flex-1 truncate text-text-primary">{i.title}</span>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {formatDuration(i.durationMinutes, locale)}
                </span>
              </div>
            ))
          )}
        </div>

        {overflow.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-text-secondary">
              {t("plan.lateMoveRest")}
            </span>
            {overflow.map((i) => (
              <div
                key={`${i.type}-${i.id}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{i.title}</span>
                {i.type === "task" ? (
                  <Button
                    size="sm"
                    variant={moved.has(i.id) ? "ghost" : "secondary"}
                    disabled={moved.has(i.id)}
                    onClick={() => void moveToTomorrow(i)}
                  >
                    <MoveRight className="size-3.5" />
                    {moved.has(i.id) ? t("plan.lateMoved") : t("plan.lateMoveTomorrow")}
                  </Button>
                ) : (
                  <span className="text-xs text-text-tertiary">{t("plan.lateStays")}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <Button variant="secondary" fullWidth onClick={onClose}>
          {t("common.done")}
        </Button>
      </div>
    </Sheet>
  );
}
