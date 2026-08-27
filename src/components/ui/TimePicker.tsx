"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface TimePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { label, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type="time"
        className={cn(
          "h-11 w-full rounded-lg border border-border bg-bg-elevated px-3.5 text-sm text-text-primary",
          "transition-colors duration-150 focus:border-accent-purple focus:outline-none",
          className,
        )}
        {...props}
      />
    </div>
  );
});
