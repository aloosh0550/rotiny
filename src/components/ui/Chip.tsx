"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  selected?: boolean;
  tone?: "neutral" | "accent" | "danger" | "success";
}

const toneClasses = {
  neutral: "bg-surface border-border text-text-secondary",
  accent: "bg-accent-purple/10 border-accent-purple/30 text-accent-purple",
  danger: "bg-danger/10 border-danger/30 text-danger",
  success: "bg-success/10 border-success/30 text-success",
};

export function Chip({ icon, selected, tone = "neutral", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        selected ? "bg-accent-purple border-accent-purple text-white" : toneClasses[tone],
        "hover:opacity-90",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
