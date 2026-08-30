import { isNativePlatform } from "@/lib/native/platform";
import { appointmentsRepository, settingsRepository } from "@/lib/db/repositories";
import type { Appointment, RecurrenceRule } from "@/lib/types";
import type { EffectOp } from "@/lib/services/effects/appEffects";

type PermState = "granted" | "denied" | "prompt" | "unsupported";

export interface DeviceCalendar {
  id: string;
  title: string;
}
export interface DeviceEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  calendarId?: string;
}

async function plugin() {
  const mod = await import("@ebarooni/capacitor-calendar");
  return { cal: mod.CapacitorCalendar, Scope: mod.CalendarPermissionScope };
}

/** Our RecurrenceRule → the plugin's EventRecurrenceRule (weekday 0=Sun → 7=Sun). */
function toEventRecurrence(rule: RecurrenceRule | null | undefined) {
  if (!rule) return undefined;
  const frequency =
    rule.frequency === "daily"
      ? "daily"
      : rule.frequency === "weekly"
        ? "weekly"
        : rule.frequency === "monthly"
          ? "monthly"
          : null;
  if (!frequency) return undefined;
  return {
    frequency,
    interval: rule.interval && rule.interval > 1 ? rule.interval : undefined,
    byWeekDay: rule.byWeekday?.map((d) => (d === 0 ? 7 : d)),
    count: rule.count,
    end: rule.until ? new Date(rule.until).getTime() : undefined,
  };
}

export const calendarSync = {
  isSupported: () => isNativePlatform(),

  async checkPermission(): Promise<PermState> {
    if (!isNativePlatform()) return "unsupported";
    try {
      const { cal, Scope } = await plugin();
      const res = (await cal.checkPermission({ scope: Scope.WRITE_CALENDAR })) as { result?: string };
      return res.result === "granted"
        ? "granted"
        : res.result === "denied"
          ? "denied"
          : "prompt";
    } catch {
      return "unsupported";
    }
  },

  async requestPermission(): Promise<PermState> {
    if (!isNativePlatform()) return "unsupported";
    try {
      const { cal } = await plugin();
      await cal.requestFullCalendarAccess();
      return this.checkPermission();
    } catch {
      return "denied";
    }
  },

  async listCalendars(): Promise<DeviceCalendar[]> {
    if (!isNativePlatform()) return [];
    try {
      const { cal } = await plugin();
      const res = (await cal.listCalendars()) as { result?: { id: string; title: string }[] };
      return (res.result ?? []).map((c) => ({ id: String(c.id), title: c.title }));
    } catch {
      return [];
    }
  },

  async listEventsInRange(startISO: string, endISO: string): Promise<DeviceEvent[]> {
    if (!isNativePlatform()) return [];
    const settings = await settingsRepository.ensureDefaults();
    if (!settings.calendarIntegration.showDeviceEvents) return [];
    try {
      const { cal } = await plugin();
      const res = (await cal.listEventsInRange({
        from: new Date(startISO).getTime(),
        to: new Date(endISO).getTime(),
      })) as { result?: { id: string; title: string; calendarId: string | null; location: string | null; startDate: number; endDate: number }[] };
      const routiniIds = new Set(
        (await appointmentsRepository.getAll()).map((a) => a.externalId).filter(Boolean) as string[],
      );
      return (res.result ?? [])
        .filter((e) => !routiniIds.has(String(e.id)))
        .map((e) => ({
          id: String(e.id),
          title: e.title,
          startAt: new Date(e.startDate).toISOString(),
          endAt: new Date(e.endDate).toISOString(),
          location: e.location ?? undefined,
          calendarId: e.calendarId ?? undefined,
        }));
    } catch {
      return [];
    }
  },

  async openInSystemCalendar(startAtISO?: string): Promise<void> {
    try {
      const { cal } = await plugin();
      await cal.openCalendar({ date: startAtISO ? new Date(startAtISO).getTime() : Date.now() });
    } catch {
      /* ignore */
    }
  },

  /** Mirror a Routini appointment change into the selected device calendar. */
  async onAppointmentMutated(op: EffectOp, entity: Appointment | { id: string }): Promise<void> {
    if (!isNativePlatform()) return;
    const settings = await settingsRepository.ensureDefaults();
    const ci = settings.calendarIntegration;
    if (!ci.enabled || !ci.deviceCalendarId) return;
    if ((await this.checkPermission()) !== "granted") return;

    try {
      const { cal } = await plugin();
      const a = entity as Appointment;

      if (op === "delete") {
        if (a.externalId) await cal.deleteEvent({ id: a.externalId });
        return;
      }

      const base = {
        title: a.title,
        startDate: new Date(a.startAt).getTime(),
        endDate: new Date(a.endAt).getTime(),
        location: a.location,
        description: a.notes,
        calendarId: ci.deviceCalendarId,
        recurrence: toEventRecurrence(a.recurrence) as never,
      };

      if (op === "update" && a.externalId) {
        await cal.modifyEvent({ id: a.externalId, ...base });
      } else {
        const created = (await cal.createEvent(base)) as { id?: string; result?: string };
        const eventId = String(created.id ?? created.result ?? "");
        if (eventId) {
          await appointmentsRepository.update(a.id, {
            externalId: eventId,
            deviceCalendarId: ci.deviceCalendarId,
            calendarProviderId: "device",
          });
        }
      }
    } catch {
      /* device calendar unavailable — the local Routini appointment still works */
    }
  },
};
