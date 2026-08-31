"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { Appointment } from "@/lib/types";
import { AppointmentCard } from "./AppointmentCard";
import { expandAppointmentsInRange } from "./occurrences";

export interface DayViewProps {
  date: Date;
  appointments: Appointment[];
}

export function DayView({ date, appointments }: DayViewProps) {
  const { t } = useTranslation();

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

  const occurrences = useMemo(
    () => expandAppointmentsInRange(appointments, rangeStart, rangeEnd),
    [appointments, rangeStart, rangeEnd],
  );

  if (occurrences.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-8">
        <EmptyState
          icon={<CalendarDays />}
          title={t("appointments.noAppointments")}
          subtitle={t("appointments.noAppointmentsSubtitle")}
          className="w-full max-w-xs border-none bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {occurrences.map((occ) => (
        <AppointmentCard
          key={occ.key}
          appointment={occ.appointment}
          occurrenceStart={occ.start}
          occurrenceEnd={occ.end}
        />
      ))}
    </div>
  );
}
