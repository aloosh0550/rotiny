import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "danger" | "warning" | "success";
}

const toneClasses = {
  neutral: "bg-surface-hover text-text-secondary",
  accent: "bg-accent-soft text-accent-fg",
  danger: "bg-danger/15 text-danger-fg",
  warning: "bg-warning/15 text-warning-fg",
  success: "bg-success/15 text-success-fg",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
