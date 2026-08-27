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
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.05,0.7,0.1,1)]",
          tone === "accent" ? "bg-accent" : "bg-success",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
