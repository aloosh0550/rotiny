/**
 * Builds the minimal context snapshot for a chat turn. Called only when
 * `settings.ai.shareContext` is on. Hard caps everything, strips ids and notes,
 * and never looks past today. If any read fails the field is simply omitted —
 * the assistant degrades, the app does not.
 */

import {
  tasksRepository,
  habitsRepository,
  habitCompletionsRepository,
  dailyPlansRepository,
  dailyEnergyRepository,
  goalsRepository,
  aiMemoryRepository,
} from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { isDueOnDate } from "@/lib/time/recurrence";
import type { AIContext } from "./types";

const MAX_TASKS = 15;
const MAX_HABITS = 15;
const MAX_GOALS = 8;
const MAX_MEMORY = 20;

export async function buildAIContext(opts: { includeMemory: boolean }): Promise<AIContext> {
  const today = todayKey();
  const now = new Date();

  const ctx: AIContext = {
    today,
    energy: null,
    tasks: [],
    plan: [],
    habits: [],
    goals: [],
    memory: [],
  };

  try {
    const energy = await dailyEnergyRepository.getForDate(today);
    ctx.energy = energy?.level ?? null;
  } catch {
    /* omit */
  }

  try {
    const all = await tasksRepository.getAll();
    ctx.tasks = all
      .filter((t) => {
        if (t.status === "completed" || t.status === "cancelled") return t.completedAt?.startsWith(today);
        const due = t.plannedFor ?? t.dueAt?.slice(0, 10);
        return !due || due <= today;
      })
      .slice(0, MAX_TASKS)
      .map((t) => ({ title: t.title, status: t.status, priority: t.priority }));
  } catch {
    /* omit */
  }

  try {
    const plan = await dailyPlansRepository.getForDate(today);
    if (plan) {
      const [tasks, habits] = await Promise.all([
        tasksRepository.getAll(),
        habitsRepository.getActive(),
      ]);
      const titleFor = (refType: string, refId: string): string | null => {
        if (refType === "task") return tasks.find((t) => t.id === refId)?.title ?? null;
        if (refType === "habit") return habits.find((h) => h.id === refId)?.title ?? null;
        return null;
      };
      ctx.plan = plan.items.flatMap((it) => {
        const title = titleFor(it.refType, it.refId);
        return title
          ? [{ bucket: String(it.bucket), title, done: it.status === "done" }]
          : [];
      });
    }
  } catch {
    /* omit */
  }

  try {
    const habits = await habitsRepository.getActive();
    const dueToday = habits.filter((h) => {
      try {
        return isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now);
      } catch {
        return true;
      }
    });
    const completions = await habitCompletionsRepository.getForDate(today);
    const doneIds = new Set(completions.map((c) => c.habitId));
    ctx.habits = dueToday
      .slice(0, MAX_HABITS)
      .map((h) => ({ title: h.title, doneToday: doneIds.has(h.id) }));
  } catch {
    /* omit */
  }

  try {
    const goals = await goalsRepository.getAll();
    ctx.goals = goals
      .filter((g) => g.status === "active")
      .slice(0, MAX_GOALS)
      .map((g) => ({ title: g.title, horizon: g.horizon }));
  } catch {
    /* omit */
  }

  if (opts.includeMemory) {
    try {
      const mem = await aiMemoryRepository.getAll();
      ctx.memory = mem
        .filter((m) => m.enabled)
        .slice(0, MAX_MEMORY)
        .map((m) => m.text);
    } catch {
      /* omit */
    }
  }

  return ctx;
}
