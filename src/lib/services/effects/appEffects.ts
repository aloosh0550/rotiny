import type { Appointment, Habit, Task } from "@/lib/types";

export type EffectEntityType =
  | "task"
  | "appointment"
  | "habit"
  | "taskCategory"
  | "lifeArea"
  | "goal"
  | "goalMilestone"
  | "measurement"
  | "dailyPlan"
  | "dailyEnergy";
export type EffectOp = "create" | "update" | "delete";

export interface MutatedEntity {
  type: EffectEntityType;
  op: EffectOp;
  entity: Task | Appointment | Habit | { id: string } | Record<string, unknown>;
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
  // The cloud outbox is populated inside the repositories themselves
  // (makeSyncedRepository), so every mutation — not just the ones routed through
  // here — is captured. This seam only fans out to the local side-effects below
  // and, when signed in, nudges the SyncEngine to flush.
  void nudgeSync();

  await Promise.allSettled([
    ...handlers.map((h) => h(m)),
    reschedule(),
    refreshWidget(),
    syncCalendar(m),
  ]);
}

/** Ask the SyncEngine to flush the outbox now (best-effort; no-op when signed out). */
async function nudgeSync(): Promise<void> {
  try {
    const { syncEngine } = await import("@/lib/sync/SyncEngine");
    await syncEngine.flush();
    // Offline: register a Background Sync so the outbox drains on reconnect even if
    // the app is backgrounded by then. No-op where the API is unavailable.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const { requestOutboxSync } = await import("@/lib/pwa/outboxSync");
      await requestOutboxSync();
    }
  } catch {
    /* ignore */
  }
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
    const { getActiveCalendarProvider } = await import(
      "@/lib/services/calendar/CalendarProviderService"
    );
    const provider = await getActiveCalendarProvider();
    await provider?.onAppointmentMutated(m.op, m.entity as Appointment | { id: string });
  } catch {
    /* ignore */
  }
}
