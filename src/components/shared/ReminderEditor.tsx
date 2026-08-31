"use client";

import { Chip } from "@/components/ui/Chip";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { generateId } from "@/lib/utils/id";
import type { Reminder } from "@/lib/types";

/** Common lead-times, in minutes before the item's time. */
const OFFSETS = [0, 5, 10, 30, 60, 1440] as const;

function label(offset: number, t: ReturnType<typeof useTranslation>["t"]): string {
  if (offset === 0) return t("reminders.atTime");
  if (offset === 1440) return t("reminders.dayBefore");
  if (offset === 60) return t("reminders.hourBefore");
  return t("reminders.minutesBefore", { count: offset });
}

export interface ReminderEditorProps {
  value: Reminder[];
  onChange: (reminders: Reminder[]) => void;
  labelText?: string;
}

/** Multi-select lead-time picker. Emits `{ id, offsetMinutes, method: "push" }`
 * reminders that the native ReminderScheduler turns into real notifications. */
export function ReminderEditor({ value, onChange, labelText }: ReminderEditorProps) {
  const { t } = useTranslation();
  const active = new Set(value.map((r) => r.offsetMinutes));

  function toggle(offset: number) {
    if (active.has(offset)) {
      onChange(value.filter((r) => r.offsetMinutes !== offset));
    } else {
      onChange(
        [...value, { id: generateId(), offsetMinutes: offset, method: "push" as const }].sort(
          (a, b) => a.offsetMinutes - b.offsetMinutes,
        ),
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-secondary">
        {labelText ?? t("reminders.label")}
      </span>
      <div className="flex flex-wrap gap-2">
        <Chip selected={value.length === 0} onClick={() => onChange([])}>
          {t("reminders.none")}
        </Chip>
        {OFFSETS.map((o) => (
          <Chip key={o} selected={active.has(o)} onClick={() => toggle(o)}>
            {label(o, t)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
