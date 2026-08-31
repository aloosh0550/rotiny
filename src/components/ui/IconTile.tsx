import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type TileColor =
  | "accent"
  | "blue"
  | "indigo"
  | "cyan"
  | "green"
  | "amber"
  | "orange"
  | "red"
  | "violet"
  | "pink"
  | "slate";

const colorClasses: Record<TileColor, string> = {
  accent: "bg-accent-soft text-accent-fg",
  blue: "bg-accent-blue-soft text-accent-blue",
  indigo: "bg-accent-indigo-soft text-accent-indigo",
  cyan: "bg-accent-cyan-soft text-accent-cyan",
  green: "bg-accent-green-soft text-accent-green",
  amber: "bg-accent-amber-soft text-accent-amber",
  orange: "bg-accent-orange-soft text-accent-orange",
  red: "bg-accent-red-soft text-accent-red",
  violet: "bg-accent-violet-soft text-accent-violet",
  pink: "bg-accent-pink-soft text-accent-pink",
  slate: "bg-accent-slate-soft text-accent-slate",
};

const sizeClasses = {
  sm: "size-8 rounded-lg [&>svg]:size-4",
  md: "size-10 rounded-xl [&>svg]:size-5",
  lg: "size-12 rounded-2xl [&>svg]:size-6",
};

/** Coloured rounded container for a single icon — the consistent icon chip used
 * across menus, search results, home cards and settings. */
export function IconTile({
  children,
  color = "accent",
  size = "md",
  className,
}: {
  children: ReactNode;
  color?: TileColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        colorClasses[color],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
