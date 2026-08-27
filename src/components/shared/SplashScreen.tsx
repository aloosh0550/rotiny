"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SplashLogo } from "@/components/ui/SplashLogo";

const SPLASH_SESSION_KEY = "routini:splash-shown";
const SPLASH_DURATION_MS = 1100;

function wasAlreadyShown(): boolean {
  return window.sessionStorage.getItem(SPLASH_SESSION_KEY) != null;
}

export function SplashScreen({ children }: { children: ReactNode }) {
  // Deterministic on both server and first client render (avoids a hydration mismatch);
  // the effect below corrects it on the client once sessionStorage can be read.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (wasAlreadyShown()) {
      const id = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(id);
    }
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    const timeout = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-bg"
          >
            <SplashLogo />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
