"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  selected?: boolean;
  tone?: "neutral" | "accent" | "danger" | "success";
}

const toneClasses = {
  neutral: "bg-surface border-border text-text-secondary hover:bg-surface-hover",
  accent: "bg-accent-soft border-accent/25 text-accent-fg",
  danger: "bg-danger/10 border-danger/30 text-danger-fg",
  success: "bg-success/10 border-success/30 text-success-fg",
};

export function Chip({ icon, selected, tone = "neutral", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
        selected
          ? "border-accent bg-accent text-accent-ink shadow-sm"
          : toneClasses[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
