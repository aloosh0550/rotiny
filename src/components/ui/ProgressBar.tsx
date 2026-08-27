import { cn } from "@/lib/utils/cn";

export function ProgressBar({
  value,
  className,
  tone = "accent",
}: {
  value: number; // 0..1
  className?: string;
  tone?: "accent" | "success";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-hover", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          tone === "accent" ? "bg-accent-purple" : "bg-success",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
