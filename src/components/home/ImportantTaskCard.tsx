"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { Checkbox } from "@/components/ui/Checkbox";
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
    <section className="flex flex-col gap-2 px-4 md:px-0">
      <h3 className="text-[13px] font-semibold text-text-secondary">{t("home.importantTask")}</h3>
      {!tasks ? (
        <div className="h-[68px] skeleton rounded-lg" />
      ) : top ? (
        <Card interactive className="flex items-center gap-3 p-0">
          <div className="ps-4">
            <Checkbox
              size="md"
              checked={false}
              label={t("tasks.markComplete")}
              onCheckedChange={() =>
                void tasksRepository.update(top.id, {
                  status: "completed",
                  completedAt: new Date().toISOString(),
                })
              }
            />
          </div>
          <Link href={ROUTES.task(top.id)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pe-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{top.title}</p>
              {top.dueAt && (
                <p className="text-xs text-text-tertiary">{formatTime(top.dueAt, locale)}</p>
              )}
            </div>
            <PriorityDot priority={top.priority} />
          </Link>
        </Card>
      ) : (
        <EmptyState compact icon={<ListTodo />} title={t("home.noImportantTasks")} />
      )}
    </section>
  );
}
