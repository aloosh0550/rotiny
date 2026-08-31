import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Standard in-page header: title (+ optional subtitle) with an actions slot. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 flex flex-col gap-0.5">
        <h1 className="truncate text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}
