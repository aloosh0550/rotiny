"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useNow } from "@/lib/hooks/useNow";
import { formatTime, isSameDay } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import type { Appointment } from "@/lib/types";
import { expandAppointmentsInRange, type AppointmentOccurrence } from "./occurrences";

const HOUR_START = 6;
const HOUR_END = 23;
const ROW_HEIGHT = 64; // px per hour

interface PlacedOccurrence {
  occurrence: AppointmentOccurrence;
  column: number;
  columnCount: number;
}

/** Simple greedy column packing: occurrences sorted by start time claim the first column
 * whose previous occupant has already ended, otherwise a new column is opened. Not a
 * perfect interval-graph coloring, but good enough for a personal-scale calendar. */
function packColumns(occurrences: AppointmentOccurrence[]): PlacedOccurrence[] {
  const sorted = [...occurrences].sort((a, b) => a.start.getTime() - b.start.getTime());
  const columnEnds: number[] = [];
  const placements: { occurrence: AppointmentOccurrence; column: number }[] = [];

  for (const occ of sorted) {
    let column = columnEnds.findIndex((end) => end <= occ.start.getTime());
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(occ.end.getTime());
    } else {
      columnEnds[column] = occ.end.getTime();
    }
    placements.push({ occurrence: occ, column });
  }

  const columnCount = Math.max(1, columnEnds.length);
  return placements.map((p) => ({ ...p, columnCount }));
}

function minutesSinceGridStart(d: Date): number {
  return (d.getHours() - HOUR_START) * 60 + d.getMinutes();
}

export interface HoursViewProps {
  date: Date;
  appointments: Appointment[];
  onSlotClick: (date: Date) => void;
}

export function HoursView({ date, appointments, onSlotClick }: HoursViewProps) {
  const { t, locale } = useTranslation();
  const now = useNow();

  const rangeStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);
  const rangeEnd = useMemo(() => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + 1);
    return d;
  }, [rangeStart]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) arr.push(h);
    return arr;
  }, []);
  const gridMinutes = hours.length * 60;
  const totalHeight = hours.length * ROW_HEIGHT;

  const hourLabels = useMemo(
    () =>
      hours.map((h) => {
        const d = new Date(rangeStart);
        d.setHours(h, 0, 0, 0);
        return { hour: h, label: formatTime(d.toISOString(), locale) };
      }),
    [hours, rangeStart, locale],
  );

  const occurrences = useMemo(
    () => expandAppointmentsInRange(appointments, rangeStart, rangeEnd),
    [appointments, rangeStart, rangeEnd],
  );

  const visibleOccurrences = useMemo(
    () =>
      occurrences.filter((occ) => {
        const s = minutesSinceGridStart(occ.start);
        const e = minutesSinceGridStart(occ.end);
        return e > 0 && s < gridMinutes;
      }),
    [occurrences, gridMinutes],
  );

  const placed = useMemo(() => packColumns(visibleOccurrences), [visibleOccurrences]);

  const isToday = isSameDay(date, now);
  const nowMinutes = minutesSinceGridStart(now);
  const showNowLine = isToday && nowMinutes >= 0 && nowMinutes <= gridMinutes;
  const nowTop = (nowMinutes / 60) * ROW_HEIGHT;

  return (
    <div className="flex">
      <div className="w-14 shrink-0">
        {hourLabels.map(({ hour, label }) => (
          <div key={hour} style={{ height: ROW_HEIGHT }} className="relative">
            <span className="absolute top-0 -translate-y-1/2 pe-2 text-xs text-text-tertiary">{label}</span>
          </div>
        ))}
      </div>
      <div className="relative flex-1 border-s border-border" style={{ height: totalHeight }}>
        {hours.map((h, i) => {
          const isLast = i === hours.length - 1;
          return (
            <button
              key={h}
              type="button"
              onClick={() => {
                const slot = new Date(rangeStart);
                slot.setHours(h, 0, 0, 0);
                onSlotClick(slot);
              }}
              aria-label={t("appointments.addAppointment")}
              style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
              className={`absolute inset-x-0 hover:bg-surface-hover/60 ${isLast ? "" : "border-b border-border/60"}`}
            />
          );
        })}

        {showNowLine && (
          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center gap-1" style={{ top: nowTop }}>
            <span className="size-2 shrink-0 rounded-full bg-danger" />
            <div className="h-px flex-1 bg-danger" />
          </div>
        )}

        {placed.map(({ occurrence, column, columnCount }) => {
          const startMinutes = Math.max(0, minutesSinceGridStart(occurrence.start));
          const endMinutes = Math.min(gridMinutes, minutesSinceGridStart(occurrence.end));
          const top = (startMinutes / 60) * ROW_HEIGHT;
          const height = Math.max(26, ((endMinutes - startMinutes) / 60) * ROW_HEIGHT);
          const widthPct = 100 / columnCount;

          return (
            <Link
              key={occurrence.key}
              href={ROUTES.appointment(occurrence.appointment.id)}
              style={{
                top,
                height,
                insetInlineStart: `calc(${column * widthPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
              }}
              className="absolute z-10 overflow-hidden rounded-md border border-accent/30 bg-accent/15 px-1.5 py-1 text-start hover:bg-accent/25"
            >
              <p className="truncate text-[11px] font-semibold leading-tight text-accent">
                {occurrence.appointment.title}
              </p>
              <p className="truncate text-[10px] leading-tight text-accent/80">
                {formatTime(occurrence.start.toISOString(), locale)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
