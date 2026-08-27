import type { Appointment } from "@/lib/types";
import { expandOccurrences } from "@/lib/time/recurrence";

/** A single concrete instance of an appointment within a date range — either the
 * appointment itself (non-recurring) or one expansion of its recurrence rule. */
export interface AppointmentOccurrence {
  key: string;
  appointment: Appointment;
  start: Date;
  end: Date;
}

/** Expands every appointment (recurring or not) into concrete occurrences that fall
 * within [rangeStart, rangeEnd), sorted by start time. */
export function expandAppointmentsInRange(
  appointments: Appointment[],
  rangeStart: Date,
  rangeEnd: Date,
): AppointmentOccurrence[] {
  const result: AppointmentOccurrence[] = [];
  for (const appointment of appointments) {
    const occurrences = expandOccurrences(
      appointment.recurrence,
      new Date(appointment.startAt),
      new Date(appointment.endAt),
      rangeStart,
      rangeEnd,
    );
    for (const occurrence of occurrences) {
      result.push({
        key: `${appointment.id}:${occurrence.start.toISOString()}`,
        appointment,
        start: occurrence.start,
        end: occurrence.end,
      });
    }
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}
