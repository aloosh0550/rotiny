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
} from "@/lib/db/repositories";
import { isSameDay } from "date-fns";
import { isDueOnDate } from "@/lib/time/recurrence";
import { todayKey } from "@/lib/time/dateUtils";
import type { DhikrCategoryKind } from "@/lib/types";

export interface WidgetSnapshot {
  date: string; // ISO
  generatedAt: string;
  progress: { done: number; total: number };
  nextTask: { id: string; title: string } | null;
  tasks: { id: string; title: string; done: boolean; time: string | null }[];
  appointments: { id: string; title: string; time: string }[];
  habits: { id: string; title: string; done: boolean; progress: string | null }[];
  adhkar: { category: DhikrCategoryKind; title: string; done: number; total: number } | null;
}

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

  return {
    date: now.toISOString(),
    generatedAt: now.toISOString(),
    progress: { done, total },
    nextTask: nextTask ? { id: nextTask.id, title: nextTask.title } : null,
    tasks: todayTasks,
    appointments: todayAppts,
    habits: habitRows,
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
