"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ListChecks, Pencil, Plus, Repeat2, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { GoalForm } from "@/components/goals/GoalForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useGoal, useGoalMilestones, useGoalProgress } from "@/lib/hooks/useAreasGoals";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits } from "@/lib/hooks/useHabits";
import { goalsRepository, goalMilestonesRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { ROUTES } from "@/lib/constants/routes";

function GoalDetail() {
  const { t } = useTranslation();
  const id = useSearchParams().get("id") ?? undefined;
  const goal = useGoal(id);
  const milestones = useGoalMilestones(id);
  const progress = useGoalProgress(id);
  const tasks = useTasks();
  const habits = useHabits();
  const [editing, setEditing] = useState(false);
  const [msDraft, setMsDraft] = useState("");

  if (goal === undefined) return <div className="mx-4 mt-6 h-40 skeleton rounded-2xl" />;
  if (!goal) {
    return (
      <div className="px-4 py-10">
        <EmptyState icon={<Target />} title={t("goals.empty")} />
      </div>
    );
  }

  const linkedTasks = (tasks ?? []).filter((tk) => tk.goalId === goal.id);
  const linkedHabits = (habits ?? []).filter((h) => h.goalId === goal.id);
  const sourceKey =
    progress?.source === "milestones"
      ? "goals.progressFromMilestones"
      : progress?.source === "measurements"
        ? "goals.progressFromMeasurements"
        : progress?.source === "tasks"
          ? "goals.progressFromTasks"
          : null;

  async function addMilestone() {
    const v = msDraft.trim();
    if (!v || !goal) return;
    const m = {
      id: generateId(),
      goalId: goal.id,
      title: v,
      currentValue: 0,
      done: false,
      order: (milestones?.length ?? 0),
      sync: createSyncMeta(),
    };
    await goalMilestonesRepository.create(m);
    await onEntityMutated({ type: "goalMilestone", op: "create", entity: m });
    setMsDraft("");
  }

  async function toggleMilestone(mid: string, done: boolean) {
    const u = await goalMilestonesRepository.update(mid, { done: !done });
    await onEntityMutated({ type: "goalMilestone", op: "update", entity: u });
  }

  async function toggleStatus() {
    const u = await goalsRepository.update(goal!.id, {
      status: goal!.status === "done" ? "active" : "done",
    });
    await onEntityMutated({ type: "goal", op: "update", entity: u });
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader
        title={goal.title}
        backHref={ROUTES.goals}
        action={
          <button type="button" onClick={() => setEditing(true)} aria-label={t("goals.editGoal")}>
            <Pencil className="size-4 text-text-secondary" />
          </button>
        }
      />

      <div className="flex flex-col gap-4 px-4">
        <Card padding="md" className="flex flex-col gap-2">
          {progress && progress.target > 0 ? (
            <ProgressMeter current={progress.current} target={progress.target} unit={goal.targetUnit ?? undefined} />
          ) : (
            <p className="text-sm text-text-tertiary">{t("goals.progressFromMilestones")}</p>
          )}
          {sourceKey && <span className="text-xs text-text-tertiary">{t(sourceKey)}</span>}
          {goal.description && <p className="mt-1 text-sm text-text-secondary">{goal.description}</p>}
        </Card>

        <Button variant={goal.status === "done" ? "secondary" : "primary"} onClick={() => void toggleStatus()}>
          <Check className="size-4" />
          {goal.status === "done" ? t("goals.reopen") : t("goals.markDone")}
        </Button>

        {/* milestones */}
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold text-text-secondary">{t("goals.milestones")}</h2>
          {(milestones ?? []).map((m) => (
            <Card key={m.id} padding="sm" className="flex items-center gap-2.5">
              <Checkbox size="md" checked={m.done} onCheckedChange={() => void toggleMilestone(m.id, m.done)} label={m.title} />
              <span className={`min-w-0 flex-1 truncate text-sm ${m.done ? "text-text-tertiary line-through" : "text-text-primary"}`} dir="auto">
                {m.title}
              </span>
            </Card>
          ))}
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={t("goals.milestonePlaceholder")}
              value={msDraft}
              dir="auto"
              onChange={(e) => setMsDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addMilestone();
                }
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => void addMilestone()}>
              <Plus className="size-4" />
            </Button>
          </div>
        </section>

        {linkedTasks.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
              <ListChecks className="size-3.5" />
              {t("goals.linkedTasks")}
            </h2>
            {linkedTasks.map((tk) => (
              <Link key={tk.id} href={ROUTES.task(tk.id)}>
                <Card interactive padding="sm" className="text-sm text-text-primary">
                  <span className={tk.status === "completed" ? "text-text-tertiary line-through" : ""}>{tk.title}</span>
                </Card>
              </Link>
            ))}
          </section>
        )}

        {linkedHabits.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
              <Repeat2 className="size-3.5" />
              {t("goals.linkedHabits")}
            </h2>
            {linkedHabits.map((h) => (
              <Link key={h.id} href={ROUTES.habit(h.id)}>
                <Card interactive padding="sm" className="text-sm text-text-primary">
                  {h.title}
                </Card>
              </Link>
            ))}
          </section>
        )}
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title={t("goals.editGoal")}>
        {editing && <GoalForm goal={goal} onDone={() => setEditing(false)} />}
      </Sheet>
    </div>
  );
}

export default function GoalDetailPage() {
  return (
    <Suspense fallback={null}>
      <GoalDetail />
    </Suspense>
  );
}
