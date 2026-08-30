"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { DbBootstrap } from "@/components/shared/DbBootstrap";
import { ServiceWorkerManager } from "@/components/shared/ServiceWorkerManager";
import { NativeBootstrap } from "@/components/shared/NativeBootstrap";
import { DeepLinkHandler } from "@/components/shared/DeepLinkHandler";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <DbBootstrap />
          <ServiceWorkerManager />
          <NativeBootstrap />
          <DeepLinkHandler />
          <SplashScreen>{children}</SplashScreen>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
