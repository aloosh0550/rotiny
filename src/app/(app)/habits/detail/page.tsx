"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Flame, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHistoryGrid } from "@/components/habits/HabitHistoryGrid";
import { habitRecurrenceSummary } from "@/components/habits/recurrenceSummary";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useHabits, useHabitCompletions } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { habitsRepository } from "@/lib/db/repositories";
import { computeHabitStats } from "@/lib/time/streak";
import { formatDuration, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import type { HabitTarget, Locale } from "@/lib/types";

function formatTarget(target: HabitTarget | null | undefined, locale: Locale): string | null {
  if (!target) return null;
  if (target.type === "duration") return formatDuration(target.value, locale);
  return target.unit ? `${target.value} ${target.unit}` : `${target.value}`;
}

function HabitDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? undefined;
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { show } = useToast();
  const now = useNow();

  // Read the full active-habits list (already reactive via liveQuery) instead of
  // useHabit(id): useHabits() only ever returns `undefined` while the first query is
  // in flight, and always an array afterwards — so "loading" and "not found" stay
  // distinguishable, which a lone useHabit(id) can't do (it returns undefined for both).
  const habits = useHabits();
  const completions = useHabitCompletions(id);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isLoading = habits === undefined || completions === undefined;
  const habit = habits?.find((h) => h.id === id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          title={t("habits.notFound")}
          action={<Button onClick={() => router.push(ROUTES.habits)}>{t("common.back")}</Button>}
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="px-4 py-4">
        <HabitForm
          key={habit.id}
          habit={habit}
          onSaved={() => {
            setEditing(false);
            show(t("common.saved"), { tone: "success" });
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const stats = computeHabitStats(habit.recurrence, new Date(habit.sync.createdAt), completions ?? [], now);
  const summary = habitRecurrenceSummary(habit, t, locale);
  const targetText = formatTarget(habit.target, locale);

  async function handleDelete() {
    if (!habit) return;
    await habitsRepository.delete(habit.id);
    show(t("common.deleted"), { tone: "success" });
    router.push(ROUTES.habits);
  }

  async function handleArchive() {
    if (!habit) return;
    await habitsRepository.update(habit.id, { archivedAt: new Date().toISOString() });
    show(t("common.saved"), { tone: "success" });
    router.push(ROUTES.habits);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-lg font-bold text-text-primary">{habit.title}</h1>
          <p className="text-sm text-text-tertiary">
            {summary}
            {habit.timeOfDay ? ` · ${formatTime(`1970-01-01T${habit.timeOfDay}:00`, locale)}` : ""}
          </p>
          {targetText && <p className="text-sm text-text-secondary">{targetText}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon={<Pencil className="size-4" />}
            label={t("common.edit")}
            onClick={() => setEditing(true)}
          />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label={t("common.delete")}
            onClick={() => setConfirmOpen(true)}
          />
        </div>
      </div>

      <Card accent padding="lg" className="flex items-center gap-5">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-warning">
            <Flame
              className="size-7"
              strokeWidth={2.25}
              fill={stats.current > 0 ? "currentColor" : "none"}
              fillOpacity={0.22}
            />
            <span className="text-3xl font-bold tabular-nums text-text-primary">{stats.current}</span>
          </div>
          <span className="text-xs font-medium text-text-tertiary">{t("habits.currentStreak")}</span>
        </div>
        <div className="h-12 w-px bg-border" />
        <div className="flex flex-1 justify-around">
          <Stat label={t("habits.longestStreak")} value={stats.longest} />
          <Stat label={t("habits.completionRate")} value={`${Math.round(stats.completionRate * 100)}%`} />
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">{t("habits.history")}</h2>
          <span className="text-xs text-text-tertiary">{t("habits.last12Weeks")}</span>
        </div>
        <Card className="overflow-x-auto">
          <HabitHistoryGrid habit={habit} completions={completions ?? []} />
        </Card>
      </div>

      <Button
        variant="secondary"
        icon={<Archive className="size-4" />}
        onClick={() => void handleArchive()}
      >
        {t("habits.archiveHabit")}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        body={t("habits.deleteConfirm")}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-1 text-center">
      <span className="text-lg font-bold tabular-nums text-text-primary">{value}</span>
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
  );
}

export default function HabitDetailPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-4 p-4"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-40 w-full" /></div>}>
      <HabitDetailInner />
    </Suspense>
  );
}
