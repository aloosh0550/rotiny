"use client";

import Link from "next/link";
import { MapPin, Repeat, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import type { Appointment } from "@/lib/types";

export interface AppointmentCardProps {
  appointment: Appointment;
  /** Concrete occurrence times (for recurring appointments); defaults to the stored startAt/endAt. */
  occurrenceStart?: Date;
  occurrenceEnd?: Date;
  className?: string;
}

export function AppointmentCard({ appointment, occurrenceStart, occurrenceEnd }: AppointmentCardProps) {
  const { t, locale } = useTranslation();
  const start = occurrenceStart ?? new Date(appointment.startAt);
  const end = occurrenceEnd ?? new Date(appointment.endAt);

  return (
    <Link href={ROUTES.appointment(appointment.id)}>
      <Card interactive padding="md" className="flex gap-3">
        <div className="flex w-16 shrink-0 flex-col items-start text-xs">
          <span className="font-semibold text-text-secondary">{formatTime(start.toISOString(), locale)}</span>
          <span className="text-text-tertiary">{formatTime(end.toISOString(), locale)}</span>
        </div>
        <div className="min-w-0 flex-1 border-s border-border ps-3">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-text-primary">{appointment.title}</p>
            {appointment.recurrence && (
              <Repeat className="size-3.5 shrink-0 text-text-tertiary" aria-label={t("appointments.fieldRecurrence")} />
            )}
          </div>
          {appointment.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-tertiary">
              <MapPin className="size-3.5 shrink-0" />
              {appointment.location}
            </p>
          )}
          {appointment.participants && appointment.participants.length > 0 && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-tertiary">
              <Users className="size-3.5 shrink-0" />
              {t("appointments.withParticipant", { name: appointment.participants.join("، ") })}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
