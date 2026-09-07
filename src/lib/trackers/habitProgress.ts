import type { Habit } from "@/lib/types";
import { habitCompletionsRepository, measurementsRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { todayKey } from "@/lib/time/dateUtils";

/**
 * Change a count/duration habit's measured value for today by `delta` and keep
 * the day's completion marker (used for streaks) in sync: it's "done" once the
 * value reaches the target, "not done" if it drops back below.
 */
export async function adjustHabitProgress(habit: Habit, delta: number): Promise<void> {
  const target = habit.target;
  if (!target) return;
  const date = todayKey();

  const m = await measurementsRepository.addForDate(
    "habit",
    habit.id,
    date,
    delta,
    target.unit ?? null,
  );

  const wasDone = Boolean(await habitCompletionsRepository.isCompletedOn(habit.id, date));
  const nowDone = m.value >= target.value;
  if (nowDone !== wasDone) {
    await habitCompletionsRepository.toggleForDate(habit.id, date, m.value);
  }
  await onEntityMutated({ type: "habit", op: "update", entity: { id: habit.id } });
}
