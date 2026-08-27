import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  /** A single hero/featured card per screen can opt into a subtle accent wash to lead the
   * visual hierarchy — deliberately not the default, so it stays a rare accent, not noise. */
  featured?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  padding = "md",
  interactive = false,
  featured = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border shadow-card transition-[box-shadow,transform,background-color] duration-200",
        featured
          ? "border-accent-purple/25 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent-purple)_9%,var(--surface))_0%,var(--surface)_55%)]"
          : "border-border bg-surface",
        paddingClasses[padding],
        interactive && "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover active:translate-y-0 active:shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
