import { cn } from "@/lib/utils/cn";

export interface WeeklyBarChartDatum {
  label: string;
  value: number;
  isToday?: boolean;
}

/**
 * The only chart in the app (per product spec — charts are used sparingly). A plain,
 * single-hue 7-bar chart built from divs, no charting library.
 */
export function WeeklyBarChart({ data }: { data: WeeklyBarChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end justify-between gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              d.isToday ? "text-text-primary" : "text-text-tertiary",
            )}
          >
            {d.value}
          </span>
          <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-surface-sunken">
            <div
              className={cn(
                "w-full rounded-lg transition-[height] duration-500",
                d.isToday ? "bg-accent" : "bg-accent/45",
              )}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 8 : 0)}%` }}
            />
          </div>
          <span
            className={cn(
              "text-[11px]",
              d.isToday ? "font-semibold text-accent" : "text-text-tertiary",
            )}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
