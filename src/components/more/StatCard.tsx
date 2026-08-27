import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

/** Compact single-metric card used on the Statistics page. */
export function StatCard({ icon, label, value, subtitle, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 text-text-tertiary">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
    </Card>
  );
}
