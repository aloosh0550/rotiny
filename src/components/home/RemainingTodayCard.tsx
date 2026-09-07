"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLocalPlan } from "@/lib/hooks/useLocalPlan";
import { ROUTES } from "@/lib/constants/routes";
import { formatTime } from "@/lib/time/dateUtils";
import type { PlanItem } from "@/lib/planner/localPlanner";

function hrefFor(i: PlanItem): string {
  if (i.type === "appointment") return ROUTES.appointment(i.id);
  if (i.type === "habit") return ROUTES.habit(i.id);
  return ROUTES.task(i.id);
}

/** The rest of today after "الآن" / "التالي" — a short, calm list. */
export function RemainingTodayCard() {
  const { t, locale } = useTranslation();
  const plan = useLocalPlan();

  if (!plan) return <div className="mx-4 h-24 skeleton rounded-2xl md:mx-0" />;

  const rest = plan.remaining.filter((i) => i.id !== plan.now?.id && i.id !== plan.next?.id);

  if (rest.length === 0) {
    return (
      <section className="mx-4 flex flex-col gap-2 md:mx-0">
        <h3 className="text-[13px] font-semibold text-text-secondary">{t("home.remainingTitle")}</h3>
        <Card className="flex items-center gap-2.5">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          <p className="text-sm text-text-secondary">{t("home.remainingClear")}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-4 flex flex-col gap-2 md:mx-0">
      <h3 className="text-[13px] font-semibold text-text-secondary">
        {t("home.remainingTitle")}
        <span className="ms-1.5 font-normal text-text-tertiary">({rest.length})</span>
      </h3>
      <Card className="flex flex-col divide-y divide-border p-0">
        {rest.slice(0, 5).map((i) => (
          <Link
            key={`${i.type}-${i.id}`}
            href={hrefFor(i)}
            className="flex items-center gap-2.5 px-3.5 py-2.5"
          >
            <CircleDashed className="size-4 shrink-0 text-text-tertiary" />
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{i.title}</span>
            {i.at && (
              <span className="shrink-0 text-xs text-text-tertiary">{formatTime(i.at, locale)}</span>
            )}
          </Link>
        ))}
      </Card>
      {rest.length > 5 && (
        <Link href={ROUTES.plan} className="px-1 text-xs font-medium text-accent-fg">
          {t("home.remainingSeeAll")}
        </Link>
      )}
    </section>
  );
}
