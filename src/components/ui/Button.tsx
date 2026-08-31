"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "tonal" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-strong shadow-sm active:scale-[0.97]",
  tonal: "bg-accent-soft text-accent-fg hover:brightness-[0.97] active:scale-[0.97]",
  secondary:
    "bg-surface text-text-primary border border-border-strong hover:bg-surface-hover active:scale-[0.97]",
  ghost: "bg-transparent text-text-primary hover:bg-surface-hover active:scale-[0.97]",
  destructive:
    "bg-danger/12 text-danger-fg hover:bg-danger/20 active:scale-[0.97]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-md",
  md: "h-11 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-base gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    fullWidth,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-[background-color,transform,filter,box-shadow] duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});
