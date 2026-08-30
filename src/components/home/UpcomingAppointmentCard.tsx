"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconTile } from "@/components/ui/IconTile";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useNow } from "@/lib/hooks/useNow";
import { formatDayLabel, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

export function UpcomingAppointmentCard() {
  const { t, locale } = useTranslation();
  const appointments = useAppointments();
  const now = useNow();

  const upcoming = appointments
    ?.filter((a) => new Date(a.endAt).getTime() >= now.getTime())
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  return (
    <section className="flex flex-col gap-2 px-4 md:px-0">
      <h3 className="text-[13px] font-semibold text-text-secondary">{t("home.upcomingAppointment")}</h3>
      {!appointments ? (
        <div className="h-[68px] skeleton rounded-lg" />
      ) : upcoming ? (
        <Link href={ROUTES.appointment(upcoming.id)}>
          <Card interactive className="flex items-center gap-3">
            <IconTile color="indigo" size="lg">
              <CalendarDays />
            </IconTile>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{upcoming.title}</p>
              <p className="text-xs text-text-tertiary">
                {formatDayLabel(new Date(upcoming.startAt), locale)} ·{" "}
                {formatTime(upcoming.startAt, locale)}
              </p>
            </div>
            <DirectionalIcon className="size-4 text-text-tertiary" />
          </Card>
        </Link>
      ) : (
        <EmptyState
          compact
          icon={<CalendarDays />}
          title={t("home.noAppointmentsToday")}
        />
      )}
    </section>
  );
}
