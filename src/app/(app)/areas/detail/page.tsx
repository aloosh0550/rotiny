"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ListChecks, Repeat2, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { AreaIcon } from "@/components/areas/AreaIcon";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLifeArea, useGoals } from "@/lib/hooks/useAreasGoals";
import { useHabits } from "@/lib/hooks/useHabits";
import { useTasks } from "@/lib/hooks/useTasks";
import { ROUTES } from "@/lib/constants/routes";

function AreaDetail() {
  const { t } = useTranslation();
  const id = useSearchParams().get("id") ?? undefined;
  const area = useLifeArea(id);
  const goals = useGoals();
  const habits = useHabits();
  const tasks = useTasks();

  if (area === undefined) return <div className="mx-4 mt-6 h-40 skeleton rounded-2xl" />;
  if (!area) {
    return (
      <div className="px-4 py-10">
        <EmptyState title={t("areas.empty")} />
      </div>
    );
  }

  const areaGoals = (goals ?? []).filter((g) => g.lifeAreaId === area.id && !g.sync.deletedAt);
  const areaHabits = (habits ?? []).filter((h) => h.lifeAreaId === area.id);
  const areaTasks = (tasks ?? []).filter((tk) => tk.lifeAreaId === area.id && tk.status !== "completed");
  const nothing = !areaGoals.length && !areaHabits.length && !areaTasks.length;

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={area.name} backHref={ROUTES.areas} />
      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, var(--accent-${area.color}) 18%, transparent)` }}
          >
            <AreaIcon name={area.icon} className="size-6" />
          </div>
          <p className="text-xs text-text-tertiary">
            {t("areas.goalsCount", { count: areaGoals.length })} ·{" "}
            {t("areas.habitsCount", { count: areaHabits.length })} ·{" "}
            {t("areas.tasksCount", { count: areaTasks.length })}
          </p>
        </div>

        {nothing && <EmptyState title={t("areas.noneInArea")} />}

        {areaGoals.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
              <Target className="size-3.5" /> {t("goals.pageTitle")}
            </h2>
            {areaGoals.map((g) => (
              <Link key={g.id} href={ROUTES.goal(g.id)}>
                <Card interactive padding="sm" className="text-sm text-text-primary">
                  <span className={g.status === "done" ? "text-text-tertiary line-through" : ""}>{g.title}</span>
                </Card>
              </Link>
            ))}
          </section>
        )}

        {areaHabits.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
              <Repeat2 className="size-3.5" /> {t("nav.habits")}
            </h2>
            {areaHabits.map((h) => (
              <Link key={h.id} href={ROUTES.habit(h.id)}>
                <Card interactive padding="sm" className="text-sm text-text-primary">
                  {h.title}
                </Card>
              </Link>
            ))}
          </section>
        )}

        {areaTasks.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
              <ListChecks className="size-3.5" /> {t("nav.tasks")}
            </h2>
            {areaTasks.map((tk) => (
              <Link key={tk.id} href={ROUTES.task(tk.id)}>
                <Card interactive padding="sm" className="text-sm text-text-primary">
                  {tk.title}
                </Card>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export default function AreaDetailPage() {
  return (
    <Suspense fallback={null}>
      <AreaDetail />
    </Suspense>
  );
}
