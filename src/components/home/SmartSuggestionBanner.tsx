"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useTasks } from "@/lib/hooks/useTasks";
import { useNow } from "@/lib/hooks/useNow";
import { ROUTES } from "@/lib/constants/routes";
import { isSameDay } from "date-fns";

export function SmartSuggestionBanner() {
  const { t } = useTranslation();
  const appointments = useAppointments();
  const tasks = useTasks();
  const now = useNow();

  if (!appointments || !tasks) return null;
  const overdueCount = tasks.filter(
    (t2) => t2.status === "pending" && t2.dueAt && new Date(t2.dueAt).getTime() < now.getTime(),
  ).length;

  if (overdueCount > 0) {
    return (
      <Link href={ROUTES.tasks} className="mx-4 block">
        <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <span className="text-xs font-medium text-warning">
            {t("home.overdueSuggestion", { count: overdueCount })}
          </span>
        </div>
      </Link>
    );
  }

  const todaysAppointments = appointments.filter((a) => isSameDay(new Date(a.startAt), now));
  const pendingTasks = tasks.filter((t2) => t2.status === "pending");
  const importantToday = pendingTasks.some((t2) => t2.priority === "important");

  if (todaysAppointments.length === 0 && !importantToday) {
    return (
      <div className="mx-4 flex items-center gap-2.5 rounded-lg border border-accent-purple/20 bg-accent-purple/5 px-3.5 py-2.5">
        <Sparkles className="size-4 shrink-0 text-accent-purple" />
        <span className="text-xs font-medium text-text-secondary">{t("home.emptyDayTitle")}</span>
      </div>
    );
  }

  return null;
}
