import { db } from "@/lib/db/schema";
import type { Appointment } from "@/lib/types";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<Appointment>(db.appointments);

export const appointmentsRepository = {
  ...base,
  async getInRange(startIso: string, endIso: string): Promise<Appointment[]> {
    const all = await base.getAll();
    return all.filter((a) => a.startAt < endIso && a.endAt > startIso);
  },
  async getUpcoming(fromIso: string, limit = 1): Promise<Appointment[]> {
    const all = await base.getAll();
    return all
      .filter((a) => a.endAt >= fromIso)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, limit);
  },
};
