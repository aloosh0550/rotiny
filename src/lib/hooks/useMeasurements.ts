"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { measurementsRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import type { MeasurementRefType } from "@/lib/types";

/** Today's numeric value for a ref (0 when none). `undefined` while loading. */
export function useMeasurement(
  refType: MeasurementRefType,
  refId: string | undefined,
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!refId) return 0;
      const m = await measurementsRepository.getForRefOnDate(refType, refId, todayKey());
      return m?.value ?? 0;
    },
    [refType, refId],
  );
}

/** All of today's measurements keyed by refId. */
export function useMeasurementsForToday(): Record<string, number> | undefined {
  return useLiveQuery(async () => {
    const rows = await measurementsRepository.getForDate(todayKey());
    const map: Record<string, number> = {};
    for (const r of rows) map[r.refId] = r.value;
    return map;
  }, []);
}
