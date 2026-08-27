"use client";

import { cn } from "@/lib/utils/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onCheckedChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        "disabled:opacity-50 disabled:pointer-events-none",
        checked ? "bg-accent-purple" : "bg-border-strong",
      )}
    >
      <span
        style={{ insetInlineStart: checked ? "24px" : "2px" }}
        className="absolute inline-block size-[18px] rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-200"
      />
    </button>
  );
}
