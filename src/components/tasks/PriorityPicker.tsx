"use client";

import { Chip } from "@/components/ui/Chip";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { PRIORITY_ORDER, type Priority } from "@/lib/types";

export interface PriorityPickerProps {
  value: Priority;
  onChange: (value: Priority) => void;
  label?: string;
}

export function PriorityPicker({ value, onChange, label }: PriorityPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-secondary">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {PRIORITY_ORDER.map((p) => (
          <Chip
            key={p}
            type="button"
            icon={<PriorityDot priority={p} />}
            selected={value === p}
            onClick={() => onChange(p)}
          >
            {t(`priority.${p}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
