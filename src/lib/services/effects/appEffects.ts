import type { Appointment, Habit, Task } from "@/lib/types";
import { syncQueueRepository } from "@/lib/db/repositories/syncQueueRepository";

export type EffectEntityType = "task" | "appointment" | "habit" | "taskCategory";
export type EffectOp = "create" | "update" | "delete";

export interface MutatedEntity {
  type: EffectEntityType;
  op: EffectOp;
  entity: Task | Appointment | Habit | { id: string };
}

export type EffectHandler = (m: MutatedEntity) => void | Promise<void>;

const handlers: EffectHandler[] = [];

/** Native services (notifications / calendar / widget) register here on init.
 * Web has none — the calls become harmless no-ops. */
export function registerEffectHandler(handler: EffectHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/**
 * The single seam that keeps reminders, the device calendar, the home-screen
 * widget and the cloud-sync queue consistent after any data mutation. Callers
 * (forms, detail delete, completion toggles, Smart Add) invoke this after a repo
 * write. Repositories stay pure.
 */
export async function onEntityMutated(m: MutatedEntity): Promise<void> {
  // Populate the cloud-sync queue (no backend yet — this makes it real for later).
  try {
    const syncType =
      m.type === "taskCategory" ? "taskCategory" : (m.type as "task" | "appointment" | "habit");
    await syncQueueRepository.enqueue({
      entityType: syncType,
      entityId: m.entity.id,
      operation: m.op,
      payload: m.op === "delete" ? null : m.entity,
    });
  } catch {
    /* queue is best-effort */
  }

  await Promise.allSettled([
    ...handlers.map((h) => h(m)),
    reschedule(),
    refreshWidget(),
    syncCalendar(m),
  ]);
}

// Lazy-loaded so the web bundle never pulls native plugin code unless it runs.
async function reschedule(): Promise<void> {
  try {
    const { syncReminders } = await import("@/lib/services/notifications/ReminderScheduler");
    await syncReminders();
  } catch {
    /* ignore */
  }
}

async function refreshWidget(): Promise<void> {
  try {
    const { refreshWidget: doRefresh } = await import("@/lib/services/widget/WidgetBridgeService");
    await doRefresh();
  } catch {
    /* ignore */
  }
}

async function syncCalendar(m: MutatedEntity): Promise<void> {
  if (m.type !== "appointment") return;
  try {
    const { calendarSync } = await import("@/lib/services/calendar/CalendarSyncService");
    await calendarSync.onAppointmentMutated(m.op, m.entity as Appointment | { id: string });
  } catch {
    /* ignore */
  }
}
