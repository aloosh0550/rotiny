"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { GoalForm } from "@/components/goals/GoalForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useGoals } from "@/lib/hooks/useAreasGoals";
import { ROUTES } from "@/lib/constants/routes";
import type { GoalHorizon } from "@/lib/types";

const GROUPS: { h: GoalHorizon; k: "goals.horizonLong" | "goals.horizonMonth" | "goals.horizonWeek" }[] = [
  { h: "long", k: "goals.horizonLong" },
  { h: "month", k: "goals.horizonMonth" },
  { h: "week", k: "goals.horizonWeek" },
];

export default function GoalsPage() {
  const { t } = useTranslation();
  const goals = useGoals();
  const [adding, setAdding] = useState(false);

  const active = (goals ?? []).filter((g) => !g.sync.deletedAt);

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={t("goals.pageTitle")} backHref={ROUTES.home} />
      <div className="flex flex-col gap-4 px-4">
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)} className="self-start">
          <Plus className="size-4" />
          {t("goals.addGoal")}
        </Button>

        {goals === undefined ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : active.length === 0 ? (
          <EmptyState icon={<Target className="size-6" />} title={t("goals.empty")} subtitle={t("goals.emptySubtitle")} />
        ) : (
          GROUPS.map(({ h, k }) => {
            const list = active.filter((g) => g.horizon === h);
            if (list.length === 0) return null;
            return (
              <section key={h} className="flex flex-col gap-2">
                <h2 className="text-[13px] font-semibold text-text-secondary">{t(k)}</h2>
                {list.map((g) => (
                  <Link key={g.id} href={ROUTES.goal(g.id)}>
                    <Card interactive padding="sm" className="flex items-center gap-3">
                      <Target className="size-4 shrink-0 text-accent-fg" />
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-medium ${
                          g.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"
                        }`}
                        dir="auto"
                      >
                        {g.title}
                      </span>
                      {g.deadline && (
                        <span className="shrink-0 text-xs text-text-tertiary">{g.deadline}</span>
                      )}
                    </Card>
                  </Link>
                ))}
              </section>
            );
          })
        )}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title={t("goals.addGoal")}>
        {adding && <GoalForm onDone={() => setAdding(false)} />}
      </Sheet>
    </div>
  );
}
