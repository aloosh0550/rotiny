"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...props },
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
        className={cn(
          "h-12 w-full rounded-md border border-border bg-bg-elevated px-3.5 text-sm text-text-primary",
          "placeholder:text-text-tertiary transition-colors duration-150",
          "focus:border-accent focus:outline-none focus:shadow-focus",
          error && "border-danger focus:border-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-text-tertiary">{hint}</span>
      ) : null}
    </div>
  );
});
