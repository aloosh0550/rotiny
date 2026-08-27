import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type CardElevation = "flat" | "raised" | "overlay";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  elevation?: CardElevation;
  /** Subtle accent wash for a single hero/featured card per screen. */
  accent?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-3.5",
  md: "p-4",
  lg: "p-5 sm:p-6",
};

const elevationClasses: Record<CardElevation, string> = {
  flat: "shadow-none",
  raised: "shadow-card",
  overlay: "shadow-lg",
};

export function Card({
  children,
  padding = "md",
  interactive = false,
  elevation = "raised",
  accent = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border transition-[box-shadow,transform,background-color,border-color] duration-200",
        elevationClasses[elevation],
        accent ? "border-accent/25 bg-accent-soft" : "border-border bg-surface",
        paddingClasses[padding],
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover active:translate-y-0 active:shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
