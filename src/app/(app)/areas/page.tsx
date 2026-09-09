"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { AreaIcon } from "@/components/areas/AreaIcon";
import { AreaForm } from "@/components/areas/AreaForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLifeAreas } from "@/lib/hooks/useAreasGoals";
import { useGoals } from "@/lib/hooks/useAreasGoals";
import { useHabits } from "@/lib/hooks/useHabits";
import { useTasks } from "@/lib/hooks/useTasks";
import { lifeAreasRepository } from "@/lib/db/repositories";
import { ROUTES } from "@/lib/constants/routes";
import type { LifeArea } from "@/lib/types";

export default function AreasPage() {
  const { t } = useTranslation();
  const areasList = useLifeAreas();
  const goals = useGoals();
  const habits = useHabits();
  const tasks = useTasks();
  const [editing, setEditing] = useState<LifeArea | "new" | null>(null);

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={t("areas.pageTitle")} backHref={ROUTES.home} />
      <div className="flex flex-col gap-3 px-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text-secondary">{t("areas.overview")}</span>
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            {t("areas.addArea")}
          </Button>
        </div>

        {areasList === undefined ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : areasList.length === 0 ? (
          <EmptyState title={t("areas.empty")} />
        ) : (
          areasList.map((area, i) => {
            const areaGoals = (goals ?? []).filter((g) => g.lifeAreaId === area.id && !g.sync.deletedAt);
            const areaHabits = (habits ?? []).filter((h) => h.lifeAreaId === area.id);
            const areaTasks = (tasks ?? []).filter((tk) => tk.lifeAreaId === area.id);
            const doneGoals = areaGoals.filter((g) => g.status === "done").length;
            const ratio = areaGoals.length ? doneGoals / areaGoals.length : 0;

            return (
              <Card key={area.id} padding="md" className={area.enabled ? "" : "opacity-50"}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `color-mix(in srgb, var(--accent-${area.color}) 18%, transparent)` }}
                  >
                    <AreaIcon name={area.icon} className="size-5" />
                  </div>
                  <Link href={ROUTES.area(area.id)} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{area.name}</p>
                    <p className="truncate text-xs text-text-tertiary">
                      {t("areas.goalsCount", { count: areaGoals.length })} ·{" "}
                      {t("areas.habitsCount", { count: areaHabits.length })} ·{" "}
                      {t("areas.tasksCount", { count: areaTasks.length })}
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-col">
                    <button type="button" disabled={i === 0} onClick={() => void lifeAreasRepository.reorder(area.id, -1)} className="text-text-tertiary disabled:opacity-30">
                      <ChevronUp className="size-4" />
                    </button>
                    <button type="button" disabled={i === areasList.length - 1} onClick={() => void lifeAreasRepository.reorder(area.id, 1)} className="text-text-tertiary disabled:opacity-30">
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setEditing(area)} className="text-xs font-medium text-accent-fg">
                    {t("common.edit")}
                  </button>
                </div>
                {areaGoals.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <ProgressBar value={ratio} className="h-1.5 flex-1" tone={ratio === 1 ? "success" : "accent"} />
                    <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
                      {doneGoals} / {areaGoals.length}
                    </span>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? t("areas.addArea") : t("areas.editArea")}
      >
        {editing !== null && (
          <AreaForm
            area={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
