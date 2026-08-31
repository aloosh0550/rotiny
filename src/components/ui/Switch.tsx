"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
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
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors duration-200",
        "disabled:opacity-50 disabled:pointer-events-none",
        checked ? "bg-brand justify-end" : "bg-border-strong justify-start",
      )}
    >
      <motion.span
        layout
        transition={SPRING.snappy}
        className="block size-6 rounded-full bg-surface shadow-sm"
      />
    </button>
  );
}
