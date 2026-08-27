"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, label, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        checked
          ? "border-accent-purple bg-accent-purple text-white"
          : "border-border-strong bg-transparent hover:border-accent-purple",
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </button>
  );
}
