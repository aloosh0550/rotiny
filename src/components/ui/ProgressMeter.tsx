import { cn } from "@/lib/utils/cn";
import { ProgressBar } from "@/components/ui/ProgressBar";

/**
 * The one measurable-progress primitive: `current / target` + a bar. Used for
 * habits, trackers (water / exercise / reading), goals and any future counter.
 * Numbers render with the app's Latin-digits-for-Arabic convention via the
 * caller (pass pre-formatted strings if you need locale digits).
 */
export function ProgressMeter({
  current,
  target,
  unit,
  label,
  size = "md",
  tone,
  className,
}: {
  current: number;
  target: number;
  unit?: string;
  label?: string;
  size?: "sm" | "md";
  tone?: "accent" | "success";
  className?: string;
}) {
  const ratio = target > 0 ? current / target : 0;
  const done = target > 0 && current >= target;
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {label && (
          <span
            className={cn(
              "truncate font-medium text-text-secondary",
              size === "sm" ? "text-xs" : "text-sm",
            )}
          >
            {label}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 tabular-nums font-semibold",
            done ? "text-success" : "text-text-primary",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {current} / {target}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <ProgressBar
        value={ratio}
        tone={tone ?? (done ? "success" : "accent")}
        className={size === "sm" ? "h-1.5" : undefined}
      />
      <span className="sr-only">{pct}%</span>
    </div>
  );
}
