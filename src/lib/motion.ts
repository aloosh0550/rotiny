/**
 * Shared motion tokens + Framer Motion variants for Routini.
 * Keep animations fast and tasteful. All consumers should also respect
 * `prefers-reduced-motion` — use `useReducedMotion()` from framer-motion and
 * fall back to the `*Reduced` variants (or no motion) where it matters.
 */

export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
} as const;

export const EASE = {
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
  decelerate: [0.05, 0.7, 0.1, 1] as [number, number, number, number],
};

export const SPRING = {
  soft: { type: "spring", stiffness: 320, damping: 30, mass: 0.7 },
  snappy: { type: "spring", stiffness: 500, damping: 32, mass: 0.6 },
  bouncy: { type: "spring", stiffness: 420, damping: 18, mass: 0.7 },
} as const;

/** Route / page content entrance. */
export const pageEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.decelerate } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE.standard } },
};

/** Stagger container for lists of cards. */
export const listContainer = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.decelerate } },
};

/** Press feedback for tappable surfaces. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: SPRING.snappy,
};

/** Completion pop for checkboxes / habit rings. */
export const checkPop = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: SPRING.bouncy },
};

/** FAB icon swap when the section changes. */
export const fabSwap = {
  initial: { opacity: 0, scale: 0.6, rotate: -20 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.6, rotate: 20 },
  transition: { duration: DURATION.base },
};
