"use client";

import { AnimatePresence, motion } from "framer-motion";
import { fabSwap } from "@/lib/motion";
import { useQuickAdd } from "./QuickAddProvider";

export function QuickAddFab() {
  const { trigger, icon: Icon, label } = useQuickAdd();

  return (
    <motion.button
      type="button"
      onClick={trigger}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] end-4 z-40 flex size-[52px] items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-glow-accent md:hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={fabSwap.initial}
          animate={fabSwap.animate}
          exit={fabSwap.exit}
          transition={fabSwap.transition}
          className="flex items-center justify-center"
        >
          <Icon className="size-6" strokeWidth={2.4} />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
