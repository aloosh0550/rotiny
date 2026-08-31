"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** Slightly larger tap target + mark, for row-level "complete" toggles. */
  size?: "sm" | "md";
}

export function Checkbox({ checked, onCheckedChange, label, disabled, size = "sm" }: CheckboxProps) {
  const box = size === "md" ? "size-6" : "size-5";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-md border transition-colors duration-150 active:scale-90",
        "disabled:opacity-50 disabled:pointer-events-none",
        box,
        checked
          ? "border-accent bg-accent text-accent-ink"
          : "border-border-strong bg-transparent hover:border-accent",
      )}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            key="check"
            viewBox="0 0 24 24"
            fill="none"
            className={size === "md" ? "size-4" : "size-3.5"}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={SPRING.bouncy}
          >
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}
