/**
 * External calendar *provider* abstraction — a source of events that Routini
 * mirrors appointments to and can read events from (the phone calendar today;
 * Google / Apple / Microsoft later, via backend OAuth in a later phase).
 *
 * This is deliberately separate from `ICalendarService` (which is Routini's own
 * storage of appointments). The device-calendar implementation below just wraps
 * the existing `calendarSync` so nothing changes today — it only introduces the
 * seam that additional providers plug into.
 */

import type { Appointment, CalendarProviderId, ID } from "@/lib/types";
import { calendarSync, type DeviceCalendar, type DeviceEvent } from "./CalendarSyncService";
import { settingsRepository } from "@/lib/db/repositories";

export type CalendarPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface ExternalCalendarProvider {
  readonly id: CalendarProviderId;
  /** Platform + integration available at all (e.g. native + plugin present). */
  isAvailable(): Promise<boolean>;
  checkPermission(): Promise<CalendarPermissionState>;
  requestPermission(): Promise<CalendarPermissionState>;
  listCalendars(): Promise<DeviceCalendar[]>;
  listEventsInRange(startISO: string, endISO: string): Promise<DeviceEvent[]>;
  /** Mirror a Routini appointment change into the provider. */
  onAppointmentMutated(
    op: "create" | "update" | "delete",
    entity: Appointment | { id: ID },
  ): Promise<void>;
  openInSystemCalendar?(startAtISO?: string): Promise<void>;
}

/** The phone's native calendar — a thin pass-through to the existing service. */
export const deviceCalendarProvider: ExternalCalendarProvider = {
  id: "device",
  isAvailable: () => Promise.resolve(calendarSync.isSupported()),
  checkPermission: () => calendarSync.checkPermission(),
  requestPermission: () => calendarSync.requestPermission(),
  listCalendars: () => calendarSync.listCalendars(),
  listEventsInRange: (s, e) => calendarSync.listEventsInRange(s, e),
  onAppointmentMutated: (op, entity) => calendarSync.onAppointmentMutated(op, entity),
  openInSystemCalendar: (iso) => calendarSync.openInSystemCalendar(iso),
};

/** All known external providers. Only `device` is wired today. */
export const calendarProviders: ExternalCalendarProvider[] = [deviceCalendarProvider];

export function getCalendarProvider(id: CalendarProviderId): ExternalCalendarProvider | null {
  return calendarProviders.find((p) => p.id === id) ?? null;
}

/**
 * The provider the user has turned on for appointment sync (device today), or
 * null when calendar integration is off / unavailable.
 */
export async function getActiveCalendarProvider(): Promise<ExternalCalendarProvider | null> {
  const settings = await settingsRepository.get().catch(() => undefined);
  if (!settings?.calendarIntegration?.enabled) return null;
  const provider = getCalendarProvider(settings.calendarProvider) ?? deviceCalendarProvider;
  return (await provider.isAvailable()) ? provider : null;
}
