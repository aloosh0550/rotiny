"use client";

import { useEffect } from "react";

/**
 * Native-only setup for the Capacitor Android build. On the web it's a no-op
 * (the dynamic imports never run because `Capacitor.isNativePlatform()` is false).
 *
 * - Status bar overlays the WebView so the app is edge-to-edge; CSS
 *   `env(safe-area-inset-*)` then positions the TopBar / BottomNav correctly.
 * - Keyboard resizes the document body so bottom sheets stay above it.
 */
export function NativeBootstrap() {
  useEffect(() => {
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        /* plugin unavailable — ignore */
      }
      try {
        const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
        await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        await Keyboard.setScroll({ isDisabled: true });
      } catch {
        /* plugin unavailable — ignore */
      }
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* plugin unavailable — ignore */
      }

      // Reminders + widget: schedule from current data, then keep in sync on resume.
      try {
        const { syncReminders } = await import("@/lib/services/notifications/ReminderScheduler");
        const { refreshWidget } = await import("@/lib/services/widget/WidgetBridgeService");
        await syncReminders();
        await refreshWidget();

        const { App } = await import("@capacitor/app");
        await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            void syncReminders();
            void refreshWidget();
          }
        });
        // Roll the widget over at local midnight.
        const msToMidnight = (() => {
          const n = new Date();
          const m = new Date(n);
          m.setHours(24, 0, 30, 0);
          return m.getTime() - n.getTime();
        })();
        window.setTimeout(() => void refreshWidget(), msToMidnight);
      } catch {
        /* plugins unavailable — ignore */
      }
    })();
  }, []);

  return null;
}
