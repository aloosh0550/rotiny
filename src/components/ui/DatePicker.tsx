"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { label, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type="date"
        className={cn(
          "h-12 w-full rounded-md border border-border bg-bg-elevated px-3.5 text-sm text-text-primary",
          "transition-colors duration-150 focus:border-accent focus:outline-none focus:shadow-focus",
          className,
        )}
        {...props}
      />
    </div>
  );
});
