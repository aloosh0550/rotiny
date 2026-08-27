"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { appointmentsRepository } from "@/lib/db/repositories";
import type { Appointment } from "@/lib/types";

export function useAppointments(): Appointment[] | undefined {
  return useLiveQuery(() => appointmentsRepository.getAll(), []);
}

export function useAppointmentsInRange(startIso: string, endIso: string): Appointment[] | undefined {
  return useLiveQuery(
    () => appointmentsRepository.getInRange(startIso, endIso),
    [startIso, endIso],
  );
}

export function useAppointment(id: string | undefined): Appointment | undefined {
  return useLiveQuery(() => (id ? appointmentsRepository.getById(id) : undefined), [id]);
}
