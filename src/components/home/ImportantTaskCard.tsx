"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { tasksRepository } from "@/lib/db/repositories";
import { ROUTES } from "@/lib/constants/routes";
import { PRIORITY_ORDER } from "@/lib/types";
import { formatTime } from "@/lib/time/dateUtils";

export function ImportantTaskCard() {
  const { t, locale } = useTranslation();
  const tasks = useTasks();

  const pending = tasks?.filter((task) => task.status === "pending");
  const top = pending
    ?.slice()
    .sort((a, b) => {
      const pDiff = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      if (pDiff !== 0) return pDiff;
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return 0;
    })[0];

  return (
    <section className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold text-text-secondary">{t("home.importantTask")}</h3>
      {!tasks ? (
        <Card className="h-20 animate-pulse" />
      ) : top ? (
        <Link href={ROUTES.task(top.id)}>
          <Card interactive className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void tasksRepository.update(top.id, {
                  status: "completed",
                  completedAt: new Date().toISOString(),
                });
              }}
              className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border-strong hover:border-accent-purple"
              aria-label={t("tasks.markComplete")}
            >
              <Check className="size-3.5 text-transparent" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{top.title}</p>
              {top.dueAt && (
                <p className="text-xs text-text-tertiary">{formatTime(top.dueAt, locale)}</p>
              )}
            </div>
            <PriorityDot priority={top.priority} />
          </Card>
        </Link>
      ) : (
        <EmptyState title={t("home.noImportantTasks")} />
      )}
    </section>
  );
}
