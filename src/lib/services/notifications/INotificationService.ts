export type ScheduledNotificationKind =
  | "appointment_reminder"
  | "task_due"
  | "habit_reminder"
  | "free_time_suggestion"
  | "overdue_task"
  | "daily_summary";

export interface ScheduledNotification {
  id: string;
  kind: ScheduledNotificationKind;
  title: string;
  body: string;
  /** ISO datetime this notification is meant to fire at. */
  scheduledFor: string;
  entityId?: string;
  entityType?: string;
}

/**
 * Abstraction over local/push notifications. `WebNotificationService` is the current
 * implementation; the interface exists so the reminder-scheduling engine (a later
 * phase) and this section's Notifications settings page can both depend on a stable
 * contract regardless of how scheduling is actually implemented under the hood.
 */
export interface INotificationService {
  requestPermission(): Promise<NotificationPermission>;
  getPermission(): NotificationPermission;
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAllForEntity(entityId: string): Promise<void>;
  showImmediate(title: string, options?: NotificationOptions): Promise<void>;
}
