"use client";

import { motion, useReducedMotion } from "framer-motion";

const PARTICLES = [
  { x: -18, y: -14, d: 0 },
  { x: 16, y: -18, d: 0.02 },
  { x: -22, y: 8, d: 0.04 },
  { x: 20, y: 10, d: 0.03 },
  { x: 0, y: -24, d: 0.05 },
  { x: 4, y: 22, d: 0.06 },
];

/**
 * A brief, tasteful burst played once when a task/habit is completed.
 * Render it (keyed) next to the checkbox; it removes itself visually after ~0.5s.
 * No-ops under prefers-reduced-motion.
 */
export function Celebration({ color = "var(--accent)" }: { color?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute size-1.5 rounded-full"
          style={{ background: color }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.4 }}
          transition={{ duration: 0.5, delay: p.d, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}
