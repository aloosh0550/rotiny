/**
 * Deterministic suggestions from the user's real data. NO AI, no network — this
 * works fully offline and whether or not the assistant is enabled. Every
 * suggestion maps to a concrete in-app action and uses no-pressure language.
 */

import { ROUTES } from "@/lib/constants/routes";
import { isDueOnDate } from "@/lib/time/recurrence";
import { computeHabitStats } from "@/lib/time/streak";
import type { Goal, Habit, HabitCompletion, Task } from "@/lib/types";

export type SuggestionTone = "neutral" | "positive" | "attention";

export interface Suggestion {
  id: string;
  text: string;
  actionRoute?: string;
  tone: SuggestionTone;
}

export interface SuggestionInput {
  today: string; // YYYY-MM-DD
  now?: Date;
  locale: "ar" | "en";
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  energyLoggedToday: boolean;
  hasPlanToday: boolean;
  goals: Goal[];
}

function tr(locale: "ar" | "en", ar: string, en: string): string {
  return locale === "en" ? en : ar;
}

export function computeSuggestions(input: SuggestionInput): Suggestion[] {
  const now = input.now ?? new Date();
  const { today, locale } = input;
  const out: Suggestion[] = [];

  // 1) overdue tasks — never hidden, gently surfaced
  const overdue = input.tasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    const due = t.plannedFor ?? t.dueAt?.slice(0, 10);
    return !!due && due < today;
  });
  if (overdue.length > 0) {
    out.push({
      id: "overdue",
      tone: "attention",
      actionRoute: ROUTES.tasks,
      text: tr(
        locale,
        `لديك ${overdue.length} ${overdue.length === 1 ? "مهمة" : "مهام"} متأخرة — تحب ترتيبها؟`,
        `You have ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"} — want to sort them?`,
      ),
    });
  }

  // 2) energy not logged
  if (!input.energyLoggedToday) {
    out.push({
      id: "energy",
      tone: "neutral",
      actionRoute: ROUTES.home,
      text: tr(
        locale,
        "لم تسجّل طاقتك اليوم — يساعدنا هذا في ترتيب يومك.",
        "You haven't logged your energy today — it helps shape your day.",
      ),
    });
  }

  // 3) no plan yet but there is something to plan
  const openTasksToday = input.tasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    const due = t.plannedFor ?? t.dueAt?.slice(0, 10);
    return !due || due <= today;
  });
  if (!input.hasPlanToday && openTasksToday.length + input.habits.length > 0) {
    out.push({
      id: "plan",
      tone: "neutral",
      actionRoute: ROUTES.plan,
      text: tr(locale, "تحب نرتّب خطة اليوم؟", "Shall we lay out today's plan?"),
    });
  }

  // 4) a habit streak worth protecting — due today, not done, streak >= 3
  const doneToday = new Set(
    input.habitCompletions.filter((c) => c.date === today).map((c) => c.habitId),
  );
  for (const h of input.habits) {
    let due = true;
    try {
      due = isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now);
    } catch {
      due = true;
    }
    if (!due || doneToday.has(h.id)) continue;
    const stats = computeHabitStats(
      h.recurrence,
      new Date(h.sync.createdAt),
      input.habitCompletions.filter((c) => c.habitId === h.id),
      now,
    );
    if (stats.current >= 3) {
      out.push({
        id: `streak:${h.id}`,
        tone: "attention",
        actionRoute: ROUTES.habits,
        text: tr(
          locale,
          `«${h.title}» — تبقّى لها اليوم للحفاظ على سلسلة ${stats.current} أيام.`,
          `"${h.title}" — one step today keeps your ${stats.current}-day streak.`,
        ),
      });
      break; // one streak nudge is enough
    }
  }

  // 5) a goal deadline within 7 days
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const soonGoal = input.goals.find(
    (g) => g.status === "active" && !!g.deadline && g.deadline >= today && g.deadline <= weekAhead,
  );
  if (soonGoal) {
    out.push({
      id: `goal:${soonGoal.id}`,
      tone: "neutral",
      actionRoute: ROUTES.goals,
      text: tr(
        locale,
        `هدف «${soonGoal.title}» موعده قريب — خطوة صغيرة تكفي اليوم.`,
        `Goal "${soonGoal.title}" is due soon — a small step today is enough.`,
      ),
    });
  }

  // 6) everything for today is done
  if (
    out.length === 0 &&
    openTasksToday.length === 0 &&
    input.tasks.some((t) => t.status === "completed" && t.completedAt?.startsWith(today))
  ) {
    out.push({
      id: "all-done",
      tone: "positive",
      text: tr(locale, "أنجزت كل شيء لهذا اليوم 🌿 استرِح.", "You've done everything for today 🌿 rest well."),
    });
  }

  return out.slice(0, 4);
}
