import { isNativePlatform } from "@/lib/native/platform";
import { routiniWidget } from "@/lib/native/routiniWidget";
import {
  appointmentsRepository,
  habitCompletionsRepository,
  habitsRepository,
  tasksRepository,
  dhikrCategoriesRepository,
  adhkarRepository,
  dhikrProgressRepository,
  dailyEnergyRepository,
  goalsRepository,
  goalMilestonesRepository,
  measurementsRepository,
} from "@/lib/db/repositories";
import { isSameDay } from "date-fns";
import { isDueOnDate } from "@/lib/time/recurrence";
import { todayKey } from "@/lib/time/dateUtils";
import { buildLocalPlan } from "@/lib/planner/localPlanner";
import { computeGoalProgress } from "@/lib/goals/progress";
import type { DhikrCategoryKind, EnergyLevel } from "@/lib/types";

export interface WidgetSnapshot {
  date: string; // ISO
  generatedAt: string;
  /** Schema version — native reads this and ignores fields it doesn't know. */
  v: number;
  progress: { done: number; total: number };
  nextTask: { id: string; title: string } | null;
  /** The deterministic planner's single "do this now" item (never AI). */
  now: { id: string; type: string; title: string; reason: string; at: string | null } | null;
  /** Today's self-reported energy, or null if not logged. */
  energy: EnergyLevel | null;
  tasks: { id: string; title: string; done: boolean; time: string | null }[];
  appointments: { id: string; title: string; time: string }[];
  habits: { id: string; title: string; done: boolean; progress: string | null }[];
  /** Top active goals with real derived progress (0..100). */
  goals: { id: string; title: string; pct: number }[];
  adhkar: { category: DhikrCategoryKind; title: string; done: number; total: number } | null;
}

const SNAPSHOT_VERSION = 2;

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function buildSnapshot(): Promise<WidgetSnapshot> {
  const now = new Date();
  const [tasks, appointments, habits, completions, categories, allDhikr, progress] = await Promise.all([
    tasksRepository.getAll(),
    appointmentsRepository.getAll(),
    habitsRepository.getAll(),
    habitCompletionsRepository.getForDate(todayKey()),
    dhikrCategoriesRepository.getAllSorted(),
    adhkarRepository.getAll(),
    dhikrProgressRepository.getForDate(todayKey()),
  ]);

  const todayTasks = tasks
    .filter((t) => t.status === "pending" || (t.status === "completed" && t.completedAt && isSameDay(new Date(t.completedAt), now)))
    .filter((t) => !t.dueAt || isSameDay(new Date(t.dueAt), now) || (t.status === "pending" && new Date(t.dueAt) < now))
    .sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      done: t.status === "completed",
      time: t.hasTime && t.dueAt ? hm(t.dueAt) : null,
    }));

  const todayAppts = appointments
    .filter((a) => isSameDay(new Date(a.startAt), now) && new Date(a.endAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 4)
    .map((a) => ({ id: a.id, title: a.title, time: hm(a.startAt) }));

  const doneHabitIds = new Set(completions.map((c) => c.habitId));
  const dueHabits = habits.filter((h) => isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now));
  const habitRows = dueHabits.slice(0, 4).map((h) => ({
    id: h.id,
    title: h.title,
    done: doneHabitIds.has(h.id),
    progress: h.target ? `${doneHabitIds.has(h.id) ? h.target.value : 0} / ${h.target.value}` : null,
  }));

  const completedTasks = todayTasks.filter((t) => t.done).length;
  const completedHabits = habitRows.filter((h) => h.done).length;
  const total = todayTasks.length + dueHabits.length;
  const done = completedTasks + completedHabits;

  const hour = now.getHours();
  const wantedKind: DhikrCategoryKind = hour < 11 ? "morning" : hour >= 19 ? "sleep" : "evening";
  const cat = categories.find((c) => c.kind === wantedKind) ?? categories[0] ?? null;
  const catItems = cat ? allDhikr.filter((d) => d.categoryId === cat.id) : [];
  const adhkar = cat
    ? {
        category: cat.kind,
        title: cat.title,
        done: catItems.filter((d) => (progress.find((p) => p.dhikrId === d.id)?.count ?? 0) >= d.targetCount).length,
        total: catItems.length,
      }
    : null;

  const nextTask = todayTasks.find((t) => !t.done) ?? null;

  // --- planner "الآن" + energy + top goals (Phase 4/7/9 data) -------------
  const [energyRow, goals] = await Promise.all([
    dailyEnergyRepository.getForDate(todayKey()),
    goalsRepository.getAll(),
  ]);
  const energy: EnergyLevel | null = energyRow?.level ?? null;

  let nowItem: WidgetSnapshot["now"] = null;
  try {
    const plan = buildLocalPlan({
      now,
      energy,
      tasks,
      appointments,
      habits,
      habitCompletions: completions,
    });
    if (plan.now) {
      nowItem = {
        id: plan.now.id,
        type: plan.now.type,
        title: plan.now.title,
        reason: plan.now.reason,
        at: plan.now.at,
      };
    }
  } catch {
    /* planner failure must never break the widget */
  }

  const activeGoals = goals
    .filter((g) => g.status === "active")
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))
    .slice(0, 3);
  const goalRows: WidgetSnapshot["goals"] = [];
  for (const g of activeGoals) {
    try {
      const [milestones, direct] = await Promise.all([
        goalMilestonesRepository.getForGoal(g.id),
        measurementsRepository.getForRef("goal", g.id),
      ]);
      const linkedTasks = tasks.filter((t) => t.goalId === g.id);
      const measuredTotal = direct.reduce((s, m) => s + m.value, 0);
      const gp = computeGoalProgress(g, milestones, linkedTasks, measuredTotal);
      goalRows.push({ id: g.id, title: g.title, pct: Math.round(gp.ratio * 100) });
    } catch {
      goalRows.push({ id: g.id, title: g.title, pct: 0 });
    }
  }

  return {
    date: now.toISOString(),
    generatedAt: now.toISOString(),
    v: SNAPSHOT_VERSION,
    progress: { done, total },
    nextTask: nextTask ? { id: nextTask.id, title: nextTask.title } : null,
    now: nowItem,
    energy,
    tasks: todayTasks,
    appointments: todayAppts,
    habits: habitRows,
    goals: goalRows,
    adhkar,
  };
}

let debounce: ReturnType<typeof setTimeout> | null = null;

/** Rebuild the today-snapshot and push it to the native widget. No-op on web. */
export async function refreshWidget(): Promise<void> {
  if (!isNativePlatform()) return;
  if (debounce) clearTimeout(debounce);
  await new Promise<void>((resolve) => {
    debounce = setTimeout(() => resolve(), 250);
  });
  try {
    const snapshot = await buildSnapshot();
    await routiniWidget.setTodaySnapshot({ json: JSON.stringify(snapshot) });
    await routiniWidget.refresh();
  } catch {
    /* widget not installed / plugin missing */
  }
}
