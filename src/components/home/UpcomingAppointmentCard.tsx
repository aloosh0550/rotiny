"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useNow } from "@/lib/hooks/useNow";
import { formatDayLabel, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

export function UpcomingAppointmentCard() {
  const { t, locale, dir } = useTranslation();
  const appointments = useAppointments();
  const now = useNow();

  const upcoming = appointments
    ?.filter((a) => new Date(a.endAt).getTime() >= now.getTime())
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  const ChevronIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <section className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold text-text-secondary">{t("home.upcomingAppointment")}</h3>
      {!appointments ? (
        <Card className="h-20 animate-pulse" />
      ) : upcoming ? (
        <Link href={ROUTES.appointment(upcoming.id)}>
          <Card interactive className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
              <CalendarDays className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{upcoming.title}</p>
              <p className="text-xs text-text-tertiary">
                {formatDayLabel(new Date(upcoming.startAt), locale)} · {formatTime(upcoming.startAt, locale)}
              </p>
            </div>
            <ChevronIcon className="size-4 text-text-tertiary" />
          </Card>
        </Link>
      ) : (
        <EmptyState title={t("home.noAppointmentsToday")} />
      )}
    </section>
  );
}
