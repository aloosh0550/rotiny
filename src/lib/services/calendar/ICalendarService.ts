import type { Appointment, CalendarProviderId, ID, RecurrenceRule, Reminder } from "@/lib/types";

/** Fields needed to create or patch a calendar event, independent of storage/provider details. */
export interface CalendarEventInput {
  title: string;
  startAt: string;
  endAt: string;
  notes?: string;
  location?: string;
  recurrence?: RecurrenceRule | null;
  reminders?: Reminder[];
  /** Extended-palette colour key for category-style colour coding. */
  color?: string;
  participants?: string[];
}

/**
 * Storage/provider-agnostic calendar interface. `local` is backed by IndexedDB today;
 * future providers (google/apple/microsoft) can implement the same surface so the rest
 * of the app never talks to a specific backend directly.
 */
export interface ICalendarService {
  readonly providerId: CalendarProviderId;
  isConnected(): Promise<boolean>;
  listEvents(range: { start: string; end: string }): Promise<Appointment[]>;
  createEvent(input: CalendarEventInput): Promise<Appointment>;
  updateEvent(id: ID, patch: Partial<CalendarEventInput>): Promise<Appointment>;
  deleteEvent(id: ID): Promise<void>;
}
