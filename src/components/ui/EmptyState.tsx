import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** Compact inline row — for "nothing here" states that shouldn't dominate a screen. */
  compact?: boolean;
}

export function EmptyState({ icon, title, subtitle, action, className, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface/40 px-4 py-3.5",
          className,
        )}
      >
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-fg [&>svg]:size-4">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{title}</p>
          {subtitle && <p className="truncate text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        {action}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/40 px-6 py-9 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-fg [&>svg]:size-5">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
