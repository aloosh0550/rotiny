import type { INotificationService, ScheduledNotification } from "./INotificationService";

/**
 * Minimal but real implementation of INotificationService, built as the documented
 * architecture for a later phase (the actual reminder-scheduling engine) to consume.
 * Browsers have no API to fire a Notification at a future time while nothing is
 * running, so `schedule`/`cancel`/`cancelAllForEntity` just track intent in an
 * in-memory map for now — a future implementation backed by a service worker + Push
 * API (or periodic sync) can replace the internals without changing the interface.
 * `requestPermission`/`getPermission`/`showImmediate` are genuinely wired to the real
 * Notification API.
 */
export class WebNotificationService implements INotificationService {
  private readonly scheduled = new Map<string, ScheduledNotification>();

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === "undefined") return "denied";
    return Notification.requestPermission();
  }

  getPermission(): NotificationPermission {
    if (typeof Notification === "undefined") return "denied";
    return Notification.permission;
  }

  async schedule(notification: ScheduledNotification): Promise<void> {
    this.scheduled.set(notification.id, notification);
  }

  async cancel(id: string): Promise<void> {
    this.scheduled.delete(id);
  }

  async cancelAllForEntity(entityId: string): Promise<void> {
    for (const [id, notification] of this.scheduled) {
      if (notification.entityId === entityId) this.scheduled.delete(id);
    }
  }

  async showImmediate(title: string, options?: NotificationOptions): Promise<void> {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, options);
  }
}

export const webNotificationService = new WebNotificationService();
