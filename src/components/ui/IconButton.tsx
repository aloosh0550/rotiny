"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: "ghost" | "surface" | "primary";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const variantClasses = {
  ghost: "bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary",
  surface: "bg-surface text-text-primary border border-border hover:bg-surface-hover",
  primary: "bg-accent-purple text-text-on-accent hover:bg-accent-purple-strong shadow-sm",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", size = "md", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors duration-150",
        "active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
