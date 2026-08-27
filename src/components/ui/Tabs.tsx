"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  value: string;
  label: string;
}

/**
 * Sliding segmented control. Exported as `Tabs` for back-compat — callers
 * (ViewSwitcher, CategoryTabs) keep the same props.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const groupId = useId();
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-full border border-border bg-surface-sunken p-1 no-scrollbar",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex-1 shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150",
              active ? "text-accent-ink" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-indicator-${groupId}`}
                transition={SPRING.soft}
                className="absolute inset-0 -z-0 rounded-full bg-accent shadow-sm"
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
