import { isNativePlatform } from "@/lib/native/platform";

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface NotificationService {
  getPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  /** Whether exact alarms are allowed (Android 12+). `null` when not applicable. */
  canScheduleExact(): Promise<boolean | null>;
  showImmediate(title: string, body: string, url?: string): Promise<void>;
  /** Open the OS notification settings for this app. */
  openSystemSettings(): Promise<void>;
}

/* ------------------------------------------------------------------ web ---- */

class WebNotificationServiceImpl implements NotificationService {
  async getPermission(): Promise<PermissionState> {
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return "prompt";
  }
  async requestPermission(): Promise<PermissionState> {
    if (typeof Notification === "undefined") return "unsupported";
    const r = await Notification.requestPermission();
    return r === "granted" ? "granted" : r === "denied" ? "denied" : "prompt";
  }
  async canScheduleExact(): Promise<boolean | null> {
    return null;
  }
  async showImmediate(title: string, body: string): Promise<void> {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, { body });
  }
  async openSystemSettings(): Promise<void> {
    /* no-op on web */
  }
}

/* --------------------------------------------------------------- native ---- */

class NativeNotificationServiceImpl implements NotificationService {
  private async ln() {
    return (await import("@capacitor/local-notifications")).LocalNotifications;
  }

  async getPermission(): Promise<PermissionState> {
    try {
      const { display } = await (await this.ln()).checkPermissions();
      return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
    } catch {
      return "unsupported";
    }
  }
  async requestPermission(): Promise<PermissionState> {
    try {
      const { display } = await (await this.ln()).requestPermissions();
      return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
    } catch {
      return "unsupported";
    }
  }
  async canScheduleExact(): Promise<boolean | null> {
    try {
      const res = await (await this.ln()).checkExactNotificationSetting();
      return res.exact_alarm === "granted";
    } catch {
      return null;
    }
  }
  async showImmediate(title: string, body: string, url?: string): Promise<void> {
    try {
      await (await this.ln()).schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2_000_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 400) },
            channelId: "routini-tasks",
            extra: url ? { url } : undefined,
          },
        ],
      });
    } catch {
      /* ignore */
    }
  }
  async openSystemSettings(): Promise<void> {
    // Best-effort: LocalNotifications can surface the exact-alarm settings screen.
    try {
      await (await this.ln()).changeExactNotificationSetting();
    } catch {
      /* not critical */
    }
  }
}

let cached: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (cached) return cached;
  cached = isNativePlatform() ? new NativeNotificationServiceImpl() : new WebNotificationServiceImpl();
  return cached;
}
