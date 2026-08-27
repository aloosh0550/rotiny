"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ListChecks, Repeat2, Sparkles, type LucideProps } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useSettings } from "@/lib/hooks/useSettings";
import { ROUTES } from "@/lib/constants/routes";
import { SmartInputBox } from "./SmartInputBox";

interface QuickAddContextValue {
  trigger: () => void;
  icon: ComponentType<LucideProps>;
  label: string;
  /** True when the trigger opens the smart quick-add sheet in place, rather than
   * navigating to a section's own add flow — used to decide button styling. */
  isSmart: boolean;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function useQuickAdd(): QuickAddContextValue {
  const ctx = useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider");
  return ctx;
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useSettings();
  const nlpEnabled = settings?.intelligence.nlpEnabled ?? true;
  const [sheetOpen, setSheetOpen] = useState(false);

  const section = useMemo(() => {
    if (pathname === ROUTES.appointments)
      return { route: ROUTES.appointments, icon: CalendarDays, label: t("appointments.addAppointment") };
    if (pathname === ROUTES.tasks)
      return { route: ROUTES.tasks, icon: ListChecks, label: t("tasks.newTaskTitle") };
    if (pathname === ROUTES.habits)
      return { route: ROUTES.habits, icon: Repeat2, label: t("habits.addHabit") };
    if (pathname === ROUTES.adhkar)
      return { route: ROUTES.adhkar, icon: Sparkles, label: t("adhkar.addDhikr") };
    return null;
  }, [pathname, t]);

  function trigger() {
    if (section) {
      router.push(`${section.route}?add=1`);
      return;
    }
    setSheetOpen(true);
  }

  const value: QuickAddContextValue = {
    trigger,
    icon: section?.icon ?? Sparkles,
    label: section?.label ?? t("home.quickAddFabLabel"),
    isSmart: !section,
  };

  const manualOptions = [
    { href: `${ROUTES.appointments}?add=1`, label: t("appointments.addAppointment"), icon: CalendarDays },
    { href: `${ROUTES.tasks}?add=1`, label: t("tasks.newTaskTitle"), icon: ListChecks },
    { href: `${ROUTES.habits}?add=1`, label: t("habits.addHabit"), icon: Repeat2 },
  ];

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("home.quickAddFabLabel")}>
        <div className="flex flex-col gap-4">
          {nlpEnabled && <SmartInputBox onDone={() => setSheetOpen(false)} />}

          <div className="flex flex-col gap-2">
            {nlpEnabled && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <span className="h-px flex-1 bg-border" />
                {t("common.or")}
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            {manualOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.href}
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    router.push(opt.href);
                  }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-start transition-colors duration-150 hover:bg-surface-hover"
                >
                  <Icon className="size-5 text-accent" />
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </QuickAddContext.Provider>
  );
}
