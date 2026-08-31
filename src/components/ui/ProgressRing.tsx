import { cn } from "@/lib/utils/cn";

export function ProgressRing({
  value,
  size = 40,
  strokeWidth = 4,
  className,
  tone = "accent",
  children,
}: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  className?: string;
  tone?: "accent" | "success" | "warning";
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);
  const stroke =
    tone === "success" ? "stroke-success" : tone === "warning" ? "stroke-warning" : "stroke-accent";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(stroke, "transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.05,0.7,0.1,1)]")}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
