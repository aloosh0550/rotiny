"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks, Plus, Repeat2, Sparkles, type LucideProps } from "lucide-react";
import { useSection } from "@/lib/section";
import { Sheet } from "@/components/ui/Sheet";
import { IconTile, type TileColor } from "@/components/ui/IconTile";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
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
  const router = useRouter();
  const { t } = useTranslation();
  const settings = useSettings();
  const { section: sectionKey } = useSection();
  const nlpEnabled = settings?.intelligence.nlpEnabled ?? true;
  const [sheetOpen, setSheetOpen] = useState(false);

  // A "+" on a section screen adds to that section directly; Home / Search /
  // More open the smart quick-add sheet. Uses the shared section detector so it
  // stays correct regardless of trailing slashes.
  const section = useMemo(() => {
    switch (sectionKey) {
      case "appointments":
        return { route: ROUTES.appointments, label: t("appointments.addAppointment") };
      case "tasks":
        return { route: ROUTES.tasks, label: t("tasks.newTaskTitle") };
      case "habits":
        return { route: ROUTES.habits, label: t("habits.addHabit") };
      case "adhkar":
        return { route: ROUTES.adhkar, label: t("adhkar.addDhikr") };
      default:
        return null;
    }
  }, [sectionKey, t]);

  function trigger() {
    if (section) {
      router.push(`${section.route}?add=1`);
      return;
    }
    setSheetOpen(true);
  }

  const value: QuickAddContextValue = {
    trigger,
    // Section screens: a plain "+" (the action is unambiguous). Home/Search/More:
    // a spark, signalling the smart natural-language add.
    icon: section ? Plus : Sparkles,
    label: section?.label ?? t("home.quickAddFabLabel"),
    isSmart: !section,
  };

  const manualOptions: { href: string; label: string; icon: ComponentType<LucideProps>; color: TileColor }[] = [
    { href: `${ROUTES.appointments}?add=1`, label: t("appointments.addAppointment"), icon: CalendarDays, color: "indigo" },
    { href: `${ROUTES.tasks}?add=1`, label: t("tasks.newTaskTitle"), icon: ListChecks, color: "amber" },
    { href: `${ROUTES.habits}?add=1`, label: t("habits.addHabit"), icon: Repeat2, color: "green" },
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
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-start transition-colors duration-150 hover:bg-surface-hover active:scale-[0.99]"
                >
                  <IconTile color={opt.color}>
                    <Icon className="size-5" />
                  </IconTile>
                  <span className="flex-1 text-sm font-semibold text-text-primary">{opt.label}</span>
                  <DirectionalIcon className="size-4 text-text-tertiary" />
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </QuickAddContext.Provider>
  );
}
