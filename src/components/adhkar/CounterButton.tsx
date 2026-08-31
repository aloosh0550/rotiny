"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Count } from "@/components/ui/Count";
import { cn } from "@/lib/utils/cn";

export interface CounterButtonProps {
  count: number;
  target: number;
  completed: boolean;
  onIncrement: () => void;
  label: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Large tap surface that increments a dhikr's count. Wraps the dhikr text (passed as
 * children) so the whole reading area is the tap target, with a brief fill-pulse and a
 * scale "punch" on the counter itself for tasteful, non-gamified tap feedback.
 */
export function CounterButton({
  count,
  target,
  completed,
  onIncrement,
  label,
  className,
  children,
}: CounterButtonProps) {
  const [pulseKey, setPulseKey] = useState(0);

  function handleClick() {
    setPulseKey((k) => k + 1);
    onIncrement();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden rounded-lg px-4 py-4 text-start transition-colors duration-150",
        "hover:bg-surface-hover active:scale-[0.99]",
        className,
      )}
    >
      {pulseKey > 0 && (
        <motion.span
          key={pulseKey}
          initial={{ opacity: 0.45 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-accent/20"
        />
      )}
      <div className="relative flex flex-col gap-3">
        {children}
        <motion.div
          key={count}
          initial={{ scale: 1.16 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold",
            completed
              ? "bg-accent-green-soft text-accent-green"
              : "bg-accent-soft text-accent-fg",
          )}
        >
          {completed && <Check className="size-4" />}
          <Count value={count} total={target} />
        </motion.div>
      </div>
    </button>
  );
}
