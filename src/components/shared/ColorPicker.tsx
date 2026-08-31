"use client";

import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";

/** Extended-palette keys (see tokens.css `--accent-*`). */
export const PALETTE_KEYS = [
  "blue",
  "indigo",
  "cyan",
  "green",
  "amber",
  "orange",
  "red",
  "violet",
  "pink",
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];

/** Resolve a stored colour key to a CSS colour value (for inline styles / dots). */
export function paletteColor(key: string | null | undefined): string {
  if (!key) return "var(--accent)";
  return `var(--accent-${key})`;
}

export interface ColorPickerProps {
  value: string;
  onChange: (key: string) => void;
  labelText?: string;
}

export function ColorPicker({ value, onChange, labelText }: ColorPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-secondary">
        {labelText ?? t("common.color")}
      </span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("common.default")}
          className={cn(
            "flex size-8 items-center justify-center rounded-full border-2 bg-surface-hover",
            value === "" ? "border-accent" : "border-transparent",
          )}
        >
          {value === "" && <Check className="size-4 text-text-secondary" />}
        </button>
        {PALETTE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border-2",
              value === key ? "border-text-primary" : "border-transparent",
            )}
            style={{ background: `var(--accent-${key})` }}
          >
            {value === key && <Check className="size-4 text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  );
}
