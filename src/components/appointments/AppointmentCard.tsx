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
        <div className="flex shrink-0 flex-col items-center">
          <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold tabular-nums text-accent-fg">
            {formatTime(start.toISOString(), locale)}
          </span>
          <span className="mt-1 w-px flex-1 bg-border" />
          <span className="text-[11px] tabular-nums text-text-tertiary">
            {formatTime(end.toISOString(), locale)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-text-primary line-clamp-2" dir="auto">
              {appointment.title}
            </p>
            {appointment.recurrence && (
              <Repeat
                className="mt-0.5 size-3.5 shrink-0 text-text-tertiary"
                aria-label={t("appointments.fieldRecurrence")}
              />
            )}
          </div>
          {appointment.location && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-text-tertiary">
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
