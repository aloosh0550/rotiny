"use client";

/**
 * PWA glue for the offline outbox. The service worker (`public/sw.js`) can't reach
 * Dexie/Supabase itself, so on a Background-Sync wake it just messages open clients;
 * this module listens for that and flushes the real SyncEngine.
 *
 * Everything here degrades to a no-op where the API is missing (Safari, the Android
 * WebView, private mode) — the SyncEngine's own `online` + interval flush stays the
 * baseline; Background Sync is an opportunistic extra.
 */

const OUTBOX_SYNC_TAG = "routini-outbox-flush";

type SyncManagerLike = { register(tag: string): Promise<void> };
type PeriodicSyncManagerLike = {
  register(tag: string, opts?: { minInterval: number }): Promise<void>;
};

/** Register a one-off Background Sync so the outbox is flushed when connectivity returns. */
export async function requestOutboxSync(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as unknown as { sync?: SyncManagerLike }).sync;
    if (!sync) return;
    await sync.register(OUTBOX_SYNC_TAG);
  } catch {
    /* unsupported / denied — the interval + online-event flush still covers it */
  }
}

/** Best-effort: ask for a periodic background flush (installed PWA + permission only). */
export async function requestPeriodicOutboxSync(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const status = await navigator.permissions
      ?.query({ name: "periodic-background-sync" as PermissionName })
      .catch(() => null);
    if (!status || status.state !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const periodic = (reg as unknown as { periodicSync?: PeriodicSyncManagerLike }).periodicSync;
    if (!periodic) return;
    await periodic.register(OUTBOX_SYNC_TAG, { minInterval: 12 * 60 * 60 * 1000 });
  } catch {
    /* optional */
  }
}

let messageBound = false;

/**
 * Wire the SW → client message ("flush your outbox now"). Call once on app start.
 * Returns a cleanup function.
 */
export function initPwaOutboxBridge(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || messageBound) {
    return () => {};
  }
  messageBound = true;

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== "routini:flush-outbox") return;
    void (async () => {
      try {
        const { syncEngine } = await import("@/lib/sync/SyncEngine");
        await syncEngine.flush();
      } catch {
        /* ignore */
      }
    })();
  };

  navigator.serviceWorker.addEventListener("message", onMessage);
  return () => {
    navigator.serviceWorker.removeEventListener("message", onMessage);
    messageBound = false;
  };
}
