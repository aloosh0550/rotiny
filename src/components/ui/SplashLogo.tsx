"use client";

import { motion } from "framer-motion";

export function SplashLogo({ wordmark = "روتيني" }: { wordmark?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex size-20 items-center justify-center rounded-3xl shadow-glow-accent"
        style={{
          background: "linear-gradient(135deg, #8b5cf6 0%, #4f8cff 100%)",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
          <circle
            cx="20"
            cy="20"
            r="13"
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth="2.5"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <circle cx="20" cy="7" r="3.2" fill="white" />
        </svg>
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="text-2xl font-bold tracking-tight text-text-primary"
      >
        {wordmark}
      </motion.span>
    </div>
  );
}
