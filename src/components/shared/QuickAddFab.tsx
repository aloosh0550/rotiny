"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useQuickAdd } from "./QuickAddProvider";

export function QuickAddFab() {
  const { trigger, icon: Icon, label } = useQuickAdd();

  return (
    <button
      type="button"
      onClick={trigger}
      aria-label={label}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] end-4 z-40 flex size-14 items-center justify-center rounded-full text-white shadow-[0_8px_20px_-4px_rgb(139_92_246_/_0.45),0_2px_6px_rgb(0_0_0_/_0.3)] transition-transform duration-150 active:scale-90 md:hidden"
      style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #4f8cff 100%)" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
          transition={{ duration: 0.16 }}
          className="flex items-center justify-center"
        >
          <Icon className="size-6" strokeWidth={2.25} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
