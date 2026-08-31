"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ListChecks, Repeat2, Search, Send } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { PriorityPicker } from "@/components/tasks/PriorityPicker";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { ReminderEditor } from "./ReminderEditor";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useSettings } from "@/lib/hooks/useSettings";
import {
  smartAddService,
  type Interpretation,
  type SmartEntityType,
} from "@/lib/services/smartAdd/SmartAddService";
import { formatDayLabel, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const TYPE_ICON: Record<SmartEntityType, typeof CalendarDays> = {
  appointment: CalendarDays,
  task: ListChecks,
  habit: Repeat2,
  search: Search,
};

const TYPE_LABEL_KEY: Record<SmartEntityType, "typeAppointment" | "typeTask" | "typeHabit" | "typeSearch"> = {
  appointment: "typeAppointment",
  task: "typeTask",
  habit: "typeHabit",
  search: "typeSearch",
};

export function SmartInputBox({ onDone }: { onDone: () => void }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { show } = useToast();
  const settings = useSettings();
  const threshold = settings?.intelligence.autoFillConfidenceThreshold ?? 0.6;

  const [text, setText] = useState("");
  const [interp, setInterp] = useState<Interpretation | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  function parse() {
    if (!text.trim()) return;
    const i = smartAddService.interpret(text, { locale, confidenceThreshold: threshold });
    setInterp(i);
    setEditing(i.needsConfirmation && i.parsed.clarifications.length > 0);
  }

  function patch(p: Partial<Interpretation>) {
    setInterp((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function commit() {
    if (!interp) return;
    setSaving(true);
    try {
      const result = await smartAddService.commit(interp);
      if (result.entityType === "search") {
        onDone();
        router.push(`${ROUTES.search}?q=${encodeURIComponent(interp.title)}`);
        return;
      }
      show(t("common.saved"), { tone: "success" });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  // ---- input screen ----
  if (!interp) {
    return (
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={text}
          dir="auto"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") parse();
          }}
          placeholder={t("home.quickAddPlaceholder")}
        />
        <Button onClick={parse} disabled={!text.trim()} icon={<Send className="size-4" />}>
          {t("common.confirm")}
        </Button>
      </div>
    );
  }

  const Icon = TYPE_ICON[interp.entityType];
  const intentClar = interp.parsed.clarifications.find((c) => c.field === "intent");
  const dateLabel = interp.date ? formatDayLabel(new Date(`${interp.date}T00:00:00`), locale) : null;
  const timeLabel = interp.time ? formatTime(`2000-01-01T${interp.time}:00`, locale) : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-text-primary">{t("smartAdd.understood")}</p>

      {/* Interpretation summary card */}
      <div className="flex items-start gap-3 rounded-lg border border-accent/25 bg-accent-soft p-3.5">
        <Icon className="mt-0.5 size-5 shrink-0 text-accent-fg" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">
            {t(`smartAdd.${TYPE_LABEL_KEY[interp.entityType]}`)}
          </span>
          <p className="mt-1.5 truncate text-sm font-semibold text-text-primary" dir="auto">
            {interp.title}
          </p>
          {(dateLabel || timeLabel) && (
            <p className="text-xs text-text-secondary">
              {[dateLabel, timeLabel].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {interp.needsConfirmation && (
        <p className="text-xs text-warning-fg">{t("smartAdd.lowConfidence")}</p>
      )}

      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center justify-center gap-1.5 text-sm font-semibold text-accent-fg"
        >
          {t("smartAdd.edit")}
          <ChevronDown className="size-4" />
        </button>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {intentClar && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-text-secondary">{intentClar.question}</span>
              <div className="flex flex-wrap gap-2">
                {intentClar.options?.map((opt) => {
                  const et =
                    opt.value === "create_appointment"
                      ? "appointment"
                      : opt.value === "create_habit"
                        ? "habit"
                        : "task";
                  return (
                    <Chip
                      key={String(opt.value)}
                      selected={interp.entityType === et}
                      onClick={() => patch({ entityType: et as SmartEntityType })}
                    >
                      {opt.label}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            label={t("tasks.fieldTitle")}
            value={interp.title}
            dir="auto"
            onChange={(e) => patch({ title: e.target.value })}
          />

          {(interp.entityType === "task" || interp.entityType === "appointment") && (
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label={t("appointments.fieldDate")}
                value={interp.date ?? ""}
                onChange={(e) => patch({ date: e.target.value || null })}
              />
              <TimePicker
                label={t("appointments.fieldStartTime")}
                value={interp.time ?? ""}
                onChange={(e) => patch({ time: e.target.value || null })}
              />
            </div>
          )}

          {interp.entityType === "task" && (
            <PriorityPicker
              label={t("tasks.fieldPriority")}
              value={interp.priority}
              onChange={(priority) => patch({ priority })}
            />
          )}

          {interp.entityType !== "search" && (
            <RecurrenceEditor
              value={interp.recurrence}
              onChange={(recurrence) => patch({ recurrence })}
            />
          )}

          {interp.entityType !== "search" && (
            <ReminderEditor
              value={interp.reminders}
              onChange={(reminders) => patch({ reminders })}
            />
          )}

          {interp.entityType === "habit" && interp.countTarget && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">{t("smartAdd.fieldTarget")}</span>
              <Input
                type="number"
                className="h-10 w-24"
                value={String(interp.countTarget.value)}
                onChange={(e) =>
                  patch({
                    countTarget: {
                      value: Number(e.target.value) || 1,
                      unit: interp.countTarget!.unit,
                    },
                  })
                }
              />
              <span className="text-sm text-text-tertiary">{interp.countTarget.unit}</span>
            </div>
          )}
        </div>
      )}

      <div className={cn("flex gap-2", editing ? "pt-1" : "")}>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setInterp(null);
            setEditing(false);
          }}
        >
          {t("common.back")}
        </Button>
        <Button fullWidth loading={saving} onClick={() => void commit()}>
          {t("smartAdd.confirm")}
        </Button>
      </div>
    </div>
  );
}
