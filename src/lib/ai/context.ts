/**
 * Builds the minimal context snapshot for a chat turn. Called only when
 * `settings.ai.shareContext` is on. Hard caps everything, strips real ids and
 * notes, and never looks past today. If any read fails the field is simply
 * omitted — the assistant degrades, the app does not.
 *
 * Each item gets an opaque per-turn `ref` (t1, h2, p3 …). The returned `refMap`
 * (ref → real local row) stays on the device; only the refs + titles go on the
 * wire, so the assistant can propose an action against an item without the real
 * id ever leaving the client.
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
import type { AIContext, AIRefMap } from "./types";

const MAX_TASKS = 15;
const MAX_HABITS = 15;
const MAX_GOALS = 8;
const MAX_MEMORY = 20;

export interface BuiltContext {
  context: AIContext;
  refMap: AIRefMap;
}

export async function buildAIContext(opts: { includeMemory: boolean }): Promise<BuiltContext> {
  const today = todayKey();
  const now = new Date();

  const context: AIContext = {
    today,
    energy: null,
    tasks: [],
    plan: [],
    habits: [],
    goals: [],
    memory: [],
  };
  const refMap: AIRefMap = {};

  try {
    const energy = await dailyEnergyRepository.getForDate(today);
    context.energy = energy?.level ?? null;
  } catch {
    /* omit */
  }

  try {
    const all = await tasksRepository.getAll();
    const todayTasks = all
      .filter((t) => {
        if (t.status === "completed" || t.status === "cancelled") return t.completedAt?.startsWith(today);
        const due = t.plannedFor ?? t.dueAt?.slice(0, 10);
        return !due || due <= today;
      })
      .slice(0, MAX_TASKS);
    context.tasks = todayTasks.map((t, i) => {
      const ref = `t${i + 1}`;
      refMap[ref] = { type: "task", id: t.id };
      return { ref, title: t.title, status: t.status, priority: t.priority };
    });
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
      const rowFor = (refType: string, refId: string): string | null => {
        if (refType === "task") return tasks.find((t) => t.id === refId)?.title ?? null;
        if (refType === "habit") return habits.find((h) => h.id === refId)?.title ?? null;
        return null;
      };
      let n = 0;
      context.plan = plan.items.flatMap((it) => {
        const title = rowFor(it.refType, it.refId);
        if (!title) return [];
        n += 1;
        const ref = `p${n}`;
        if (it.refType === "task" || it.refType === "habit" || it.refType === "appointment") {
          refMap[ref] = { type: it.refType, id: it.refId };
        }
        return [{ ref, bucket: String(it.bucket), title, done: it.status === "done" }];
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
    context.habits = dueToday.slice(0, MAX_HABITS).map((h, i) => {
      const ref = `h${i + 1}`;
      refMap[ref] = { type: "habit", id: h.id };
      return { ref, title: h.title, doneToday: doneIds.has(h.id) };
    });
  } catch {
    /* omit */
  }

  try {
    const goals = await goalsRepository.getAll();
    context.goals = goals
      .filter((g) => g.status === "active")
      .slice(0, MAX_GOALS)
      .map((g) => ({ title: g.title, horizon: g.horizon }));
  } catch {
    /* omit */
  }

  if (opts.includeMemory) {
    try {
      const mem = await aiMemoryRepository.getAll();
      context.memory = mem
        .filter((m) => m.enabled)
        .slice(0, MAX_MEMORY)
        .map((m) => m.text);
    } catch {
      /* omit */
    }
  }

  return { context, refMap };
}
