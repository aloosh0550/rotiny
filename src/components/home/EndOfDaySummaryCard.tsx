"use client";

import { useState } from "react";
import { addDays, isSameDay } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { tasksRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { isDueOnDate } from "@/lib/time/recurrence";
import { useToast } from "@/components/ui/Toast";
import { useNow } from "@/lib/hooks/useNow";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";

export function EndOfDaySummaryCard() {
  const { t } = useTranslation();
  const { show } = useToast();
  const tasks = useTasks();
  const habits = useHabits();
  const completions = useCompletionsForDate(todayKey());
  const [carrying, setCarrying] = useState(false);
  const now = useNow();

  if (!tasks || !habits || !completions) return null;

  const todaysTasks = tasks.filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), now));
  const completedTasks = todaysTasks.filter((task) => task.status === "completed");
  const remainingTasks = todaysTasks.filter((task) => task.status === "pending");
  const dueHabits = habits.filter((h) => isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now));
  const completedHabits = dueHabits.filter((h) => completions.some((c) => c.habitId === h.id));

  const totalUnits = todaysTasks.length + dueHabits.length;
  const doneUnits = completedTasks.length + completedHabits.length;
  const rate = totalUnits > 0 ? doneUnits / totalUnits : 1;

  async function carryOver() {
    setCarrying(true);
    const tomorrow = addDays(now, 1);
    for (const task of remainingTasks) {
      const nextDue = new Date(task.dueAt ?? now);
      nextDue.setFullYear(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      await tasksRepository.update(task.id, { status: "carried_over" });
      await tasksRepository.create({
        ...task,
        id: generateId(),
        dueAt: nextDue.toISOString(),
        status: "pending",
        completedAt: null,
        originTaskId: task.id,
        sync: createSyncMeta(),
      });
    }
    setCarrying(false);
    show(t("common.saved"), { tone: "success" });
  }

  return (
    <section className="flex flex-col gap-2 px-4 md:px-0">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">{t("home.dailySummaryTitle")}</p>
          <span className="text-sm font-bold text-accent">{Math.round(rate * 100)}%</span>
        </div>
        <ProgressBar value={rate} tone="success" />
        <p className="text-xs text-text-tertiary">
          {t("home.tasksCompletedCount", { done: completedTasks.length, total: todaysTasks.length })}
        </p>
        {remainingTasks.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-xs text-text-secondary">{t("home.carryOverPrompt")}</span>
            <Button size="sm" variant="secondary" onClick={carryOver} loading={carrying}>
              {t("home.carryOverYes")}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
