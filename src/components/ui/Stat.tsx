import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Compact label / value block for dashboards, habit detail and statistics. */
export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
        {icon}
        {label}
      </span>
      <span className="text-xl font-bold tabular-nums text-text-primary">{value}</span>
      {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
    </div>
  );
}
