"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";
import { cn } from "@/lib/utils/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  closeLabel?: string;
}

export function Sheet({ open, onClose, title, children, closeLabel = "Close" }: SheetProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-[color:rgb(9_11_15/0.55)]"
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: "6%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "4%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden border border-border bg-bg-elevated shadow-lg",
              "rounded-t-2xl sm:my-8 sm:max-w-md sm:rounded-2xl",
            )}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
            {title && (
              <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-2">
                <h2 className="text-lg font-bold text-text-primary">{title}</h2>
                <IconButton icon={<X className="size-4" />} label={closeLabel} onClick={onClose} />
              </div>
            )}
            <div className="overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
