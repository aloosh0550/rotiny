"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { DbBootstrap } from "@/components/shared/DbBootstrap";
import { SyncProvider } from "@/components/shared/SyncProvider";
import { ServiceWorkerManager } from "@/components/shared/ServiceWorkerManager";
import { NativeBootstrap } from "@/components/shared/NativeBootstrap";
import { DeepLinkHandler } from "@/components/shared/DeepLinkHandler";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <DbBootstrap />
            <SyncProvider />
            <ServiceWorkerManager />
            <NativeBootstrap />
            <DeepLinkHandler />
            <SplashScreen>{children}</SplashScreen>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
