"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewSwitcher, type AppointmentsView } from "@/components/appointments/ViewSwitcher";
import { HoursView } from "@/components/appointments/HoursView";
import { DayView } from "@/components/appointments/DayView";
import { WeekView } from "@/components/appointments/WeekView";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useSettings } from "@/lib/hooks/useSettings";
import { useNow } from "@/lib/hooks/useNow";
import { addDays, formatDayLabel, formatFullDate } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

interface AddPrefill {
  date: Date;
  time?: string;
}

function AppointmentsPageInner() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointments = useAppointments();
  const settings = useSettings();
  const now = useNow();

  const [view, setView] = useState<AppointmentsView>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<AddPrefill | null>(null);

  const queryAddOpen = searchParams.get("add") === "1";
  const isSheetOpen = queryAddOpen || manualAddOpen;
  const weekStartsOn = settings?.weekStartsOn ?? 0;
  const stepDays = view === "week" ? 7 : 1;

  function goPrev() {
    setSelectedDate((d) => addDays(d, -stepDays));
  }

  function goNext() {
    setSelectedDate((d) => addDays(d, stepDays));
  }

  function goToday() {
    setSelectedDate(new Date());
  }

  function openAdd(date: Date, time?: string) {
    setAddPrefill({ date, time });
    setManualAddOpen(true);
  }

  function closeAdd() {
    setManualAddOpen(false);
    setAddPrefill(null);
    if (queryAddOpen) router.replace(ROUTES.appointments);
  }

  function goToDay(date: Date) {
    setSelectedDate(date);
    setView("day");
  }

  function handleSlotClick(date: Date) {
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    openAdd(date, time);
  }

  const effectivePrefillDate = addPrefill?.date ?? selectedDate;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex flex-col gap-3 px-4 pt-3">
        <ViewSwitcher value={view} onChange={setView} />
        <div className="flex items-center justify-between gap-2">
          <IconButton
            icon={<DirectionalIcon direction="back" className="size-4" />}
            label={t("appointments.previousPeriod")}
            variant="surface"
            onClick={goPrev}
          />
          <div className="flex flex-1 flex-col items-center">
            <span className="text-sm font-semibold text-text-primary">{formatDayLabel(selectedDate, locale)}</span>
            <span className="text-xs text-text-tertiary">{formatFullDate(selectedDate, locale)}</span>
          </div>
          <IconButton
            icon={<DirectionalIcon direction="forward" className="size-4" />}
            label={t("appointments.nextPeriod")}
            variant="surface"
            onClick={goNext}
          />
        </div>
        <button
          type="button"
          onClick={goToday}
          className="self-center rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent-fg transition-colors duration-150 hover:brightness-95"
        >
          {t("common.today")}
        </button>
      </div>

      <div className="px-4">
        {!appointments ? (
          <Skeleton className="h-48 w-full" />
        ) : view === "hours" ? (
          <HoursView date={selectedDate} appointments={appointments} onSlotClick={handleSlotClick} />
        ) : view === "day" ? (
          <DayView date={selectedDate} appointments={appointments} />
        ) : (
          <WeekView
            selectedDate={selectedDate}
            weekStartsOn={weekStartsOn}
            appointments={appointments}
            onDayClick={goToDay}
          />
        )}
      </div>

      <Sheet open={isSheetOpen} onClose={closeAdd} title={t("appointments.newAppointmentTitle")}>
        <AppointmentForm
          initialDate={effectivePrefillDate}
          initialTime={addPrefill?.time}
          onCancel={closeAdd}
          onSaved={closeAdd}
        />
      </Sheet>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsPageInner />
    </Suspense>
  );
}
