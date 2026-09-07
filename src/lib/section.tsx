"use client";

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export type SectionKey =
  | "home"
  | "appointments"
  | "tasks"
  | "habits"
  | "adhkar"
  | "neutral";

interface SectionValue {
  section: SectionKey;
  /** CSS color value for the current section accent (e.g. "var(--section-tasks)"). */
  accentVar: string;
}

const SectionContext = createContext<SectionValue>({
  section: "home",
  accentVar: "var(--section-home)",
});

const INK_VAR: Record<SectionKey, string> = {
  home: "var(--brand-ink)",
  appointments: "var(--accent-indigo-ink)",
  tasks: "var(--accent-amber-ink)",
  habits: "var(--accent-green-ink)",
  adhkar: "var(--accent-violet-ink)",
  neutral: "var(--accent-slate-ink)",
};

function sectionFromPath(pathname: string): SectionKey {
  if (pathname === ROUTES.home) return "home";
  if (pathname.startsWith(ROUTES.plan)) return "home"; // "اليوم" is the day hub — teal
  if (pathname.startsWith(ROUTES.areas) || pathname.startsWith(ROUTES.goals)) return "home";
  if (pathname.startsWith(ROUTES.appointments)) return "appointments";
  if (pathname.startsWith(ROUTES.tasks)) return "tasks";
  if (pathname.startsWith(ROUTES.habits)) return "habits";
  if (pathname.startsWith(ROUTES.adhkar)) return "adhkar";
  return "neutral";
}

/**
 * Scopes the "live" accent tokens (--accent / --accent-ink / --accent-fg /
 * --accent-soft) to whatever section the user is in, so cards, the FAB, nav and
 * progress indicators all pick up one coherent colour per screen. Wrap the app
 * content once; consumers just use the `accent`/`accent-soft`/`accent-ink`
 * Tailwind colours.
 */
export function SectionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const accentVar = `var(--section-${section})`;

  const style = useMemo<CSSProperties>(
    () =>
      ({
        "--accent": accentVar,
        "--accent-ink": INK_VAR[section],
        "--accent-fg": accentVar,
        "--accent-soft": `color-mix(in srgb, ${accentVar} 15%, var(--surface))`,
      }) as CSSProperties,
    [section, accentVar],
  );

  const value = useMemo<SectionValue>(() => ({ section, accentVar }), [section, accentVar]);

  return (
    <SectionContext.Provider value={value}>
      <div style={style} className="contents">
        {children}
      </div>
    </SectionContext.Provider>
  );
}

export function useSection(): SectionValue {
  return useContext(SectionContext);
}
