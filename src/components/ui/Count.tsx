import { cn } from "@/lib/utils/cn";

/**
 * Renders a "value / total" style counter (e.g. dhikr progress "7 / 33", habit streaks,
 * stat fractions). Numeric runs joined by a neutral separator like "/" get visually
 * reordered by the bidi algorithm inside RTL text (e.g. "0 / 5" renders as "5 / 0") —
 * this isolates the run as LTR so it always reads in logical order regardless of locale.
 */
export function Count({
  value,
  total,
  separator = "/",
  className,
}: {
  value: number | string;
  total: number | string;
  separator?: string;
  className?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-block", className)}>
      {value} {separator} {total}
    </span>
  );
}
