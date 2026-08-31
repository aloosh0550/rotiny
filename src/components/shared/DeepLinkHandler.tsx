"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveDeepLink } from "@/lib/services/deepLink/DeepLinkService";
import { isNativePlatform } from "@/lib/native/platform";
import { tasksRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";

/** Mark a task done in response to a widget "complete" deep link. Safe if already done. */
async function completeTaskFromLink(taskId: string): Promise<void> {
  try {
    const task = await tasksRepository.getById(taskId);
    if (!task || task.status === "completed") return;
    const updated = await tasksRepository.update(taskId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    await onEntityMutated({ type: "task", op: "update", entity: updated });
  } catch {
    /* ignore — task may have been deleted */
  }
}

/**
 * Turns `routini://…` links (notification taps, widget taps, Android VIEW intents)
 * into in-app navigation. Also handles the cold-start launch URL.
 */
export function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");

        const handle = (url: string) => {
          const resolved = resolveDeepLink(url);
          if (!resolved) return;
          if (resolved.action === "completeTask" && resolved.actionId) {
            void completeTaskFromLink(resolved.actionId);
          }
          router.push(resolved.path);
        };

        const launch = await App.getLaunchUrl();
        if (launch?.url) handle(launch.url);

        const sub = await App.addListener("appUrlOpen", (e) => handle(e.url));

        // Notification taps carry the target in `extra.url`.
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const nsub = await LocalNotifications.addListener(
            "localNotificationActionPerformed",
            (e) => {
              const url = (e.notification.extra as { url?: string })?.url;
              if (url) handle(url);
            },
          );
          const prev = sub.remove.bind(sub);
          cleanup = () => {
            void prev();
            void nsub.remove();
          };
        } catch {
          cleanup = () => void sub.remove();
        }
      } catch {
        /* @capacitor/app unavailable */
      }
    })();

    return () => cleanup?.();
  }, [router]);

  return null;
}
