"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useNow } from "@/lib/hooks/useNow";
import { addDays, dateKey, formatTime, formatWeekday, isSameDay, startOfWeek } from "@/lib/time/dateUtils";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { expandAppointmentsInRange, type AppointmentOccurrence } from "./occurrences";

export interface WeekViewProps {
  selectedDate: Date;
  weekStartsOn: 0 | 1 | 6;
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
}

export function WeekView({ selectedDate, weekStartsOn, appointments, onDayClick }: WeekViewProps) {
  const { t, locale } = useTranslation();
  const now = useNow();

  const weekStart = useMemo(() => startOfWeek(selectedDate, weekStartsOn), [selectedDate, weekStartsOn]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const rangeEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const occurrences = useMemo(
    () => expandAppointmentsInRange(appointments, weekStart, rangeEnd),
    [appointments, weekStart, rangeEnd],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentOccurrence[]>();
    for (const day of days) map.set(dateKey(day), []);
    for (const occ of occurrences) {
      const list = map.get(dateKey(occ.start));
      if (list) list.push(occ);
    }
    return map;
  }, [days, occurrences]);

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: horizontally scrollable compact day columns */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar md:hidden">
        {days.map((day) => {
          const occs = byDay.get(dateKey(day)) ?? [];
          const isToday = isSameDay(day, now);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "flex w-20 shrink-0 flex-col items-start gap-1.5 rounded-lg border p-2.5 text-start transition-colors duration-150",
                isToday ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-hover",
              )}
            >
              <span className="text-xs text-text-tertiary">{formatWeekday(day, locale, "short")}</span>
              <span className={cn("text-sm font-semibold", isToday ? "text-accent" : "text-text-primary")}>
                {day.getDate()}
              </span>
              <div className="flex min-h-[6px] flex-wrap gap-1">
                {occs.slice(0, 4).map((o) => (
                  <span key={o.key} className="size-1.5 rounded-full bg-accent" />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop: full 7-column grid */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-2">
        {days.map((day) => {
          const occs = byDay.get(dateKey(day)) ?? [];
          const isToday = isSameDay(day, now);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "flex min-h-40 flex-col gap-2 rounded-lg border p-3 text-start transition-colors duration-150",
                isToday ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-hover",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">{formatWeekday(day, locale, "short")}</span>
                <span className={cn("text-sm font-semibold", isToday ? "text-accent" : "text-text-primary")}>
                  {day.getDate()}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                {occs.slice(0, 3).map((o) => (
                  <span
                    key={o.key}
                    className="truncate rounded-sm bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent"
                  >
                    {formatTime(o.start.toISOString(), locale)} {o.appointment.title}
                  </span>
                ))}
                {occs.length > 3 && <span className="text-[11px] text-text-tertiary">+{occs.length - 3}</span>}
                {occs.length === 0 && <span className="text-xs text-text-tertiary">{t("appointments.weekEmpty")}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
