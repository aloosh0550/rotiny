"use client";

import { motion } from "framer-motion";
import { Logo } from "./Logo";

export function SplashLogo({ wordmark = "روتيني" }: { wordmark?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="rounded-[28%] shadow-glow-accent"
      >
        <Logo size={84} />
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-2xl font-bold tracking-tight text-text-primary"
      >
        {wordmark}
      </motion.span>
    </div>
  );
}
