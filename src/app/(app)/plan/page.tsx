"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  ListChecks,
  Moon,
  RefreshCw,
  Repeat2,
  Sun,
  Sunrise,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconTile, type TileColor } from "@/components/ui/IconTile";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { RescheduleSheet } from "@/components/plan/RescheduleSheet";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { useDailyPlan } from "@/lib/hooks/useDailyPlan";
import { useTodayEnergy } from "@/lib/hooks/useLocalPlan";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  tasksRepository,
  habitCompletionsRepository,
  dailyPlansRepository,
  dailyEnergyRepository,
} from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { getAIProvider } from "@/lib/ai/registry";
import { computePlan } from "@/lib/planner/aiPlan";
import { todayKey, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import type { DailyPlanBucket, DailyPlanItem, EnergyLevel } from "@/lib/types";

const BUCKET_ICON = { morning: Sunrise, afternoon: Sun, evening: Moon };
const KIND_ICON = { task: ListChecks, appointment: CalendarDays, habit: Repeat2 };
const KIND_COLOR: Record<DailyPlanItem["refType"], TileColor> = {
  task: "amber",
  appointment: "indigo",
  habit: "green",
};
const BUCKETS: DailyPlanBucket[] = ["morning", "afternoon", "evening"];

interface Resolved extends DailyPlanItem {
  title: string;
  time: string | null;
  done: boolean;
  href: string;
  missing: boolean;
}

const ENERGY_LEVELS: EnergyLevel[] = ["high", "good", "medium", "low"];

export default function DailyPlanPage() {
  const { t, locale } = useTranslation();
  const { plan, regenerate } = useDailyPlan();
  const energy = useTodayEnergy();
  const tasks = useTasks();
  const appointments = useAppointments();
  const habits = useHabits();
  const completions = useCompletionsForDate(todayKey());
  const settings = useSettings();
  const { session } = useAuth();
  const now = useNow(60_000);
  const history = useLiveQuery(() => dailyPlansRepository.getRecent(14), []);
  const [showHistory, setShowHistory] = useState(false);
  const [late, setLate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const aiProvider = settings ? getAIProvider(settings.ai) : null;
  const canSmartPlan = !!aiProvider?.plan;

  /**
   * Explicit user action only (never on render). Uses the AI ranker when it's
   * available + enabled, otherwise the deterministic planner. Falls back
   * silently on any AI failure.
   */
  async function regenerateSmart() {
    if (!tasks || !appointments || !habits || !completions) return;
    if (!canSmartPlan) {
      await regenerate();
      return;
    }
    setRegenerating(true);
    try {
      const result = await computePlan(
        {
          now: new Date(),
          energy: energy ?? null,
          tasks,
          appointments,
          habits,
          habitCompletions: completions,
        },
        {
          ai: settings!.ai,
          provider: aiProvider,
          accessToken: session?.access_token ?? null,
          locale,
        },
      );
      await dailyPlansRepository.upsertForDate(todayKey(), {
        energy: energy ?? null,
        generatedBy: result.source === "ai" ? "ai" : "local",
        items: result.items,
        regeneratedAt: new Date().toISOString(),
      });
    } finally {
      setRegenerating(false);
    }
  }

  const loading =
    plan === undefined || !tasks || !appointments || !habits || !completions;

  const resolved = useMemo<Resolved[]>(() => {
    if (loading || !plan) return [];
    const taskById = new Map(tasks!.map((x) => [x.id, x]));
    const apptById = new Map(appointments!.map((x) => [x.id, x]));
    const habitById = new Map(habits!.map((x) => [x.id, x]));
    const doneHabits = new Set(completions!.map((c) => c.habitId));

    return plan.items
      .map((item): Resolved | null => {
        if (item.refType === "task") {
          const x = taskById.get(item.refId);
          if (!x) return { ...item, title: "", time: null, done: false, href: "#", missing: true };
          return {
            ...item,
            title: x.title,
            time: x.hasTime && x.dueAt ? formatTime(x.dueAt, locale) : null,
            done: x.status === "completed",
            href: ROUTES.task(x.id),
            missing: false,
          };
        }
        if (item.refType === "appointment") {
          const x = apptById.get(item.refId);
          if (!x) return { ...item, title: "", time: null, done: false, href: "#", missing: true };
          return {
            ...item,
            title: x.title,
            time: formatTime(x.startAt, locale),
            done: new Date(x.endAt).getTime() < now.getTime(),
            href: ROUTES.appointment(x.id),
            missing: false,
          };
        }
        const x = habitById.get(item.refId);
        if (!x) return { ...item, title: "", time: null, done: false, href: "#", missing: true };
        return {
          ...item,
          title: x.title,
          time: x.timeOfDay ? formatTime(`${todayKey()}T${x.timeOfDay}:00`, locale) : null,
          done: doneHabits.has(x.id),
          href: ROUTES.habit(x.id),
          missing: false,
        };
      })
      .filter((x): x is Resolved => x !== null && !x.missing)
      .sort((a, b) => a.order - b.order);
  }, [loading, plan, tasks, appointments, habits, completions, locale, now]);

  const total = resolved.length;
  const done = resolved.filter((r) => r.done).length;

  const grouped = useMemo(() => {
    const g: Record<DailyPlanBucket, Resolved[]> = { morning: [], afternoon: [], evening: [] };
    for (const r of resolved) g[r.bucket].push(r);
    return g;
  }, [resolved]);

  async function toggle(r: Resolved) {
    if (r.refType === "appointment") return;
    if (r.refType === "task") {
      const u = await tasksRepository.update(r.refId, {
        status: r.done ? "pending" : "completed",
        completedAt: r.done ? null : new Date().toISOString(),
      });
      await onEntityMutated({ type: "task", op: "update", entity: u });
    } else {
      await habitCompletionsRepository.toggleForDate(r.refId, todayKey());
      await onEntityMutated({ type: "habit", op: "update", entity: { id: r.refId } });
    }
  }

  async function move(r: Resolved, dir: -1 | 1) {
    if (!plan) return;
    const inBucket = grouped[r.bucket];
    const idx = inBucket.findIndex((x) => x.refId === r.refId);
    const swap = inBucket[idx + dir];
    if (!swap) return;
    const items = plan.items.map((it) => {
      if (it.refId === r.refId) return { ...it, order: swap.order };
      if (it.refId === swap.refId) return { ...it, order: r.order };
      return it;
    });
    await dailyPlansRepository.upsertForDate(todayKey(), {
      energy: plan.energy ?? null,
      generatedBy: "manual",
      items,
      regeneratedAt: plan.regeneratedAt ?? null,
    });
  }

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={t("plan.pageTitle")} backHref={ROUTES.home} />
      <div className="flex flex-col gap-4 px-4">
        {/* energy + actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
            <span className="text-text-tertiary">{t("energy.question")}</span>
            {ENERGY_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => void dailyEnergyRepository.setForDate(todayKey(), lvl)}
                className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                  energy === lvl
                    ? "bg-accent text-accent-ink"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t(`energy.${lvl}`)}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={regenerating}
            onClick={() => void regenerateSmart()}
          >
            <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {t("plan.regenerate")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setLate(true)}>
            <Clock3 className="size-3.5" />
            {t("plan.imLate")}
          </Button>
        </div>

        {!loading && total > 0 && (
          <Card padding="md" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                {t("plan.progress", { done, total })}
              </span>
              <span className="text-sm font-bold tabular-nums text-accent-fg">
                {Math.round((done / total) * 100)}%
              </span>
            </div>
            <ProgressBar value={done / total} tone={done === total ? "success" : "accent"} />
            {plan?.regeneratedAt && (
              <span className="text-xs text-text-tertiary">
                {t("plan.regeneratedAt", { time: formatTime(plan.regeneratedAt, locale) })}
                {plan.generatedBy === "ai" && ` · ${t("plan.rescheduleAiUpgraded")}`}
              </span>
            )}
          </Card>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-16 skeleton rounded-lg" />
            <div className="h-16 skeleton rounded-lg" />
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-6" />}
            title={t("plan.empty")}
            subtitle={t("plan.emptySubtitle")}
          />
        ) : (
          BUCKETS.map((bucket) => {
            const list = grouped[bucket];
            if (list.length === 0) return null;
            const BIcon = BUCKET_ICON[bucket];
            return (
              <section key={bucket} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
                  <BIcon className="size-4" />
                  {t(`plan.${bucket}`)}
                </h2>
                <div className="flex flex-col gap-2">
                  {list.map((r, i) => {
                    const KIcon = KIND_ICON[r.refType];
                    return (
                      <Card key={`${r.refType}-${r.refId}`} padding="sm" className="flex items-center gap-2.5">
                        {r.refType === "appointment" ? (
                          <IconTile color={KIND_COLOR[r.refType]}>
                            <KIcon className="size-4" />
                          </IconTile>
                        ) : (
                          <Checkbox
                            size="md"
                            checked={r.done}
                            label={t("tasks.markComplete")}
                            onCheckedChange={() => void toggle(r)}
                          />
                        )}
                        <Link href={r.href} className="flex min-w-0 flex-1 flex-col">
                          <span
                            className={`truncate text-sm font-medium ${
                              r.done ? "text-text-tertiary line-through" : "text-text-primary"
                            }`}
                            dir="auto"
                          >
                            {r.title}
                          </span>
                          {(r.reason || r.time) && (
                            <span className="truncate text-xs text-text-tertiary">
                              {[r.reason, r.time].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </Link>
                        <div className="flex shrink-0 flex-col">
                          <button
                            type="button"
                            aria-label={t("plan.moveUp")}
                            disabled={i === 0}
                            onClick={() => void move(r, -1)}
                            className="text-text-tertiary disabled:opacity-30"
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={t("plan.moveDown")}
                            disabled={i === list.length - 1}
                            onClick={() => void move(r, 1)}
                            className="text-text-tertiary disabled:opacity-30"
                          >
                            <ChevronDown className="size-4" />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* history */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary"
          >
            {showHistory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {t("plan.history")}
          </button>
          {showHistory &&
            (history && history.filter((h) => h.date !== todayKey()).length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {history
                  .filter((h) => h.date !== todayKey())
                  .map((h) => {
                    const dn = h.items.filter((it) => it.status === "done").length;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                      >
                        <span className="text-text-secondary">{h.date}</span>
                        <span className="tabular-nums text-text-tertiary">
                          {dn} / {h.items.length}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">{t("plan.historyEmpty")}</p>
            ))}
        </div>
      </div>

      <RescheduleSheet open={late} onClose={() => setLate(false)} />
    </div>
  );
}
