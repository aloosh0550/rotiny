"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function ServiceWorkerManager() {
  const { show } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");

      const promptUpdate = (worker: ServiceWorker) => {
        show(t("common.updateAvailable"), {
          tone: "default",
          durationMs: 10000,
          action: {
            label: t("common.updateNow"),
            onClick: () => worker.postMessage("SKIP_WAITING"),
          },
        });
      };

      if (registration.waiting && registration.active) {
        promptUpdate(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && registration.active) {
            promptUpdate(newWorker);
          }
        });
      });
    };

    void register();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
