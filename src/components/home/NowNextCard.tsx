"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, ListTodo, Repeat2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLocalPlan } from "@/lib/hooks/useLocalPlan";
import { ROUTES } from "@/lib/constants/routes";
import { formatTime, formatDuration } from "@/lib/time/dateUtils";
import type { PlanItem } from "@/lib/planner/localPlanner";

function hrefFor(item: PlanItem): string {
  if (item.type === "appointment") return ROUTES.appointment(item.id);
  if (item.type === "habit") return ROUTES.habit(item.id);
  return ROUTES.task(item.id);
}

function IconFor({ type }: { type: PlanItem["type"] }) {
  const cls = "size-4 text-accent-fg";
  if (type === "appointment") return <CalendarClock className={cls} />;
  if (type === "habit") return <Repeat2 className={cls} />;
  return <ListTodo className={cls} />;
}

export function NowNextCard() {
  const { t, locale } = useTranslation();
  const plan = useLocalPlan();

  if (!plan) {
    return <div className="mx-4 h-[104px] skeleton rounded-2xl md:mx-0" />;
  }

  if (!plan.now) {
    return (
      <Card className="mx-4 flex items-center gap-3 md:mx-0">
        <CheckCircle2 className="size-5 shrink-0 text-accent-fg" />
        <p className="text-sm text-text-secondary">{t("home.nowClearDay")}</p>
      </Card>
    );
  }

  const now = plan.now;
  const next = plan.next;

  return (
    <section className="mx-4 flex flex-col gap-2 md:mx-0">
      <Card interactive className="flex flex-col gap-3 p-0">
        <Link href={hrefFor(now)} className="flex flex-col gap-2 p-4">
          <div className="flex items-center gap-2">
            <IconFor type={now.type} />
            <span className="text-[13px] font-bold uppercase tracking-wide text-accent-fg">
              {t("home.nowTitle")}
            </span>
            {now.at && (
              <span className="text-xs text-text-tertiary">· {formatTime(now.at, locale)}</span>
            )}
          </div>
          <p className="text-base font-bold leading-snug text-text-primary line-clamp-2">
            {now.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>{now.reason}</span>
            <span>·</span>
            <span>{formatDuration(now.durationMinutes, locale)}</span>
          </div>
        </Link>

        {next && (
          <Link
            href={hrefFor(next)}
            className="flex items-center gap-2 border-t border-border px-4 py-2.5"
          >
            <span className="text-[11px] font-semibold text-text-tertiary">
              {t("home.nextTitle")}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{next.title}</span>
            {next.at && (
              <span className="shrink-0 text-xs text-text-tertiary">
                {formatTime(next.at, locale)}
              </span>
            )}
            <ArrowLeft className="size-3.5 shrink-0 text-text-tertiary rtl:rotate-0 ltr:rotate-180" />
          </Link>
        )}
      </Card>

      {plan.overload.over && (
        <Link
          href={ROUTES.plan}
          className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-2 text-xs font-medium text-warning"
        >
          {t("home.nowOverload")}
        </Link>
      )}
    </section>
  );
}
