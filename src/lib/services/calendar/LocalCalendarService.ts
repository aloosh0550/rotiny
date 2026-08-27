import { appointmentsRepository } from "@/lib/db/repositories";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import type { Appointment, ID } from "@/lib/types";
import type { CalendarEventInput, ICalendarService } from "./ICalendarService";

/** Local-only calendar backed by the appointments repository (IndexedDB via Dexie). */
class LocalCalendarService implements ICalendarService {
  readonly providerId = "local" as const;

  async isConnected(): Promise<boolean> {
    return true;
  }

  async listEvents(range: { start: string; end: string }): Promise<Appointment[]> {
    return appointmentsRepository.getInRange(range.start, range.end);
  }

  async createEvent(input: CalendarEventInput): Promise<Appointment> {
    const appointment: Appointment = {
      id: generateId(),
      title: input.title,
      notes: input.notes,
      location: input.location,
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: false,
      recurrence: input.recurrence ?? null,
      reminders: input.reminders ?? [],
      calendarProviderId: "local",
      sync: createSyncMeta(),
    };
    return appointmentsRepository.create(appointment);
  }

  async updateEvent(id: ID, patch: Partial<CalendarEventInput>): Promise<Appointment> {
    return appointmentsRepository.update(id, patch);
  }

  async deleteEvent(id: ID): Promise<void> {
    await appointmentsRepository.delete(id);
  }
}

export const localCalendarService: ICalendarService = new LocalCalendarService();
