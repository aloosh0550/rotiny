"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { QuickAddFab } from "@/components/shared/QuickAddFab";
import { QuickAddProvider } from "@/components/shared/QuickAddProvider";
import { SectionProvider } from "@/lib/section";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { TranslationKey } from "@/lib/i18n/paths";
import { ROUTES } from "@/lib/constants/routes";

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

function desktopTitle(pathname: string, t: Translator): string | null {
  if (pathname === ROUTES.home) return null;
  if (pathname.startsWith(ROUTES.appointments)) return t("appointments.pageTitle");
  if (pathname.startsWith(ROUTES.tasks)) return t("tasks.pageTitle");
  if (pathname.startsWith(ROUTES.habits)) return t("habits.pageTitle");
  if (pathname.startsWith(ROUTES.adhkar)) return t("adhkar.pageTitle");
  if (pathname.startsWith(ROUTES.search)) return t("nav.search");
  if (pathname.startsWith(ROUTES.statistics)) return t("statistics.pageTitle");
  if (pathname.startsWith(ROUTES.settings)) return t("settings.pageTitle");
  if (pathname.startsWith(ROUTES.more)) return t("more.pageTitle");
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const dtitle = desktopTitle(pathname, t);
  const wide = pathname === ROUTES.home || pathname.startsWith(ROUTES.statistics);

  return (
    <SectionProvider>
      <QuickAddProvider>
        <div className="flex min-h-dvh bg-bg">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <OfflineBanner />
            <main className="flex-1 pb-24 md:pb-10">
              <div
                className={
                  wide
                    ? "mx-auto w-full max-w-6xl md:px-8 md:py-8"
                    : "mx-auto w-full max-w-3xl md:px-8 md:py-8"
                }
              >
                {dtitle && (
                  <h1 className="mb-5 hidden text-2xl font-bold text-text-primary md:block">
                    {dtitle}
                  </h1>
                )}
                {children}
              </div>
            </main>
            <QuickAddFab />
            <BottomNav />
          </div>
        </div>
      </QuickAddProvider>
    </SectionProvider>
  );
}
