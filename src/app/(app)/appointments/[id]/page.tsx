"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, MapPin, Pencil, Repeat, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAppointment, useAppointments } from "@/lib/hooks/useAppointments";
import { localCalendarService } from "@/lib/services/calendar/LocalCalendarService";
import { differenceInMinutes, formatDuration, formatFullDate, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import type { TranslationKey } from "@/lib/i18n/paths";
import type { RecurrenceRule } from "@/lib/types";

function recurrenceLabel(rule: RecurrenceRule, t: (key: TranslationKey) => string): string {
  switch (rule.frequency) {
    case "daily":
      return t("appointments.recurrenceDaily");
    case "weekly":
      return t("appointments.recurrenceWeekly");
    default:
      return t("appointments.recurrenceCustom");
  }
}

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { t, locale } = useTranslation();
  const appointment = useAppointment(id);
  const allAppointments = useAppointments();
  const [editing, setEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const loaded = allAppointments !== undefined;

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-4">
        <EmptyState
          title={t("common.noResults")}
          action={
            <Button variant="secondary" onClick={() => router.push(ROUTES.appointments)}>
              {t("common.back")}
            </Button>
          }
        />
      </div>
    );
  }

  async function handleDelete() {
    await localCalendarService.deleteEvent(appointment!.id);
    router.push(ROUTES.appointments);
  }

  const start = new Date(appointment.startAt);
  const minutes = differenceInMinutes(new Date(appointment.endAt), start);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-text-primary">{appointment.title}</h2>
        <div className="flex shrink-0 gap-1.5">
          <IconButton
            icon={<Pencil className="size-4" />}
            label={t("common.edit")}
            variant="surface"
            onClick={() => setEditing(true)}
          />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label={t("common.delete")}
            variant="surface"
            onClick={() => setConfirmDeleteOpen(true)}
          />
        </div>
      </div>

      <Card className="flex flex-col gap-3.5">
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
          <div className="flex flex-col">
            <span className="text-sm text-text-primary">{formatFullDate(start, locale)}</span>
            <span className="text-xs text-text-tertiary">
              {formatTime(appointment.startAt, locale)} – {formatTime(appointment.endAt, locale)} ·{" "}
              {formatDuration(minutes, locale)}
            </span>
          </div>
        </div>
        {appointment.location && (
          <div className="flex items-center gap-2.5">
            <MapPin className="size-4 shrink-0 text-text-tertiary" />
            <span className="text-sm text-text-primary">{appointment.location}</span>
          </div>
        )}
        {appointment.recurrence && (
          <div className="flex items-center gap-2.5">
            <Repeat className="size-4 shrink-0 text-text-tertiary" />
            <span className="text-sm text-text-primary">{recurrenceLabel(appointment.recurrence, t)}</span>
          </div>
        )}
        {appointment.participants && appointment.participants.length > 0 && (
          <div className="flex items-center gap-2.5">
            <Users className="size-4 shrink-0 text-text-tertiary" />
            <span className="text-sm text-text-primary">
              {t("appointments.withParticipant", { name: appointment.participants.join("، ") })}
            </span>
          </div>
        )}
      </Card>

      {appointment.notes && (
        <Card>
          <p className="whitespace-pre-wrap text-sm text-text-secondary">{appointment.notes}</p>
        </Card>
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} title={t("appointments.editAppointmentTitle")}>
        <AppointmentForm
          appointment={appointment}
          initialDate={start}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        body={t("appointments.deleteConfirm")}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
