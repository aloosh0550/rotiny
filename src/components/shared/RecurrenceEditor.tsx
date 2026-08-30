"use client";

import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useNow } from "@/lib/hooks/useNow";
import type { RecurrenceRule } from "@/lib/types";

type Mode = "none" | "daily" | "weekly" | "custom";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function deriveMode(rule: RecurrenceRule | null | undefined): Mode {
  if (!rule) return "none";
  if (rule.frequency === "daily") return "daily";
  if (rule.frequency === "weekly") return "weekly";
  return "custom";
}

export interface RecurrenceEditorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  labelText?: string;
}

/** Shared "does this repeat?" editor — none / daily (every N days) / specific
 * weekdays / custom. Emits a `RecurrenceRule` the recurrence expander understands. */
export function RecurrenceEditor({ value, onChange, labelText }: RecurrenceEditorProps) {
  const { t } = useTranslation();
  const now = useNow();
  const mode = deriveMode(value);
  const interval = value?.interval ?? 1;
  const days = value?.byWeekday ?? [now.getDay()];

  function setMode(next: Mode) {
    if (next === "none") return onChange(null);
    if (next === "daily") return onChange({ frequency: "daily", interval: 1 });
    if (next === "custom") return onChange({ frequency: "custom", interval: 1 });
    onChange({ frequency: "weekly", interval: 1, byWeekday: [...days].sort((a, b) => a - b) });
  }

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    onChange({ frequency: "weekly", interval, byWeekday: next.sort((a, b) => a - b) });
  }

  function setInterval(n: number) {
    if (!value) return;
    onChange({ ...value, interval: Math.max(1, Math.round(n) || 1) });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-secondary">
        {labelText ?? t("recurrence.label")}
      </span>
      <div className="flex flex-wrap gap-2">
        <Chip selected={mode === "none"} onClick={() => setMode("none")}>
          {t("recurrence.none")}
        </Chip>
        <Chip selected={mode === "daily"} onClick={() => setMode("daily")}>
          {t("recurrence.daily")}
        </Chip>
        <Chip selected={mode === "weekly"} onClick={() => setMode("weekly")}>
          {t("recurrence.weekly")}
        </Chip>
        <Chip selected={mode === "custom"} onClick={() => setMode("custom")}>
          {t("recurrence.custom")}
        </Chip>
      </div>

      {mode === "daily" && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-text-tertiary">{t("recurrence.everyNDays")}</span>
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={String(interval)}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="h-10 w-20"
          />
        </div>
      )}

      {mode === "weekly" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {WEEKDAY_KEYS.map((key, i) => (
            <Chip key={key} selected={days.includes(i)} onClick={() => toggleDay(i)}>
              {t(`weekdays.${key}`)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
