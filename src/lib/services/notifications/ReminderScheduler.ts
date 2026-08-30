import { isNativePlatform } from "@/lib/native/platform";
import {
  appointmentsRepository,
  habitsRepository,
  settingsRepository,
  tasksRepository,
} from "@/lib/db/repositories";
import { expandOccurrences } from "@/lib/time/recurrence";
import { combineDateAndTime } from "@/lib/time/dateUtils";
import type { Appointment, Habit, Reminder, Task, UserSettings } from "@/lib/types";

/* ---------------------------------------------------------------- helpers -- */

const CHANNELS = [
  { id: "routini-appointments", nameKey: "المواعيد", importance: 5 },
  { id: "routini-tasks", nameKey: "المهام", importance: 4 },
  { id: "routini-habits", nameKey: "العادات", importance: 3 },
  { id: "routini-adhkar", nameKey: "الأذكار", importance: 3 },
  { id: "routini-daily-plan", nameKey: "خطة اليوم", importance: 3 },
] as const;

/** Stable positive 31-bit id from a string (for LocalNotifications numeric ids). */
function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) % 2_000_000_000;
}

function inQuietHours(d: Date, s: UserSettings): boolean {
  const { quietHoursStart, quietHoursEnd } = s.notifications;
  if (!quietHoursStart || !quietHoursEnd) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = quietHoursStart.split(":").map(Number);
  const [eh, em] = quietHoursEnd.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return start <= end ? mins >= start && mins < end : mins >= start || mins < end;
}

interface PlannedNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
  channelId: string;
  url: string;
}

function taskNotifications(task: Task, s: UserSettings): PlannedNotification[] {
  if (!s.notifications.enabled || !s.notifications.taskDueReminders) return [];
  if (task.status !== "pending" || !task.dueAt || !task.hasTime) return [];
  const due = new Date(task.dueAt);
  return (task.reminders ?? [])
    .filter((r: Reminder) => r.method === "push")
    .map((r) => ({
      id: hashId(`task:${task.id}:${r.id}`),
      title: "مهمة",
      body: task.title,
      at: new Date(due.getTime() - r.offsetMinutes * 60_000),
      channelId: "routini-tasks",
      url: `routini://task/${task.id}`,
    }));
}

function appointmentNotifications(a: Appointment, s: UserSettings): PlannedNotification[] {
  if (!s.notifications.enabled || !s.notifications.appointmentReminders) return [];
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 3600_000);
  const occ = a.recurrence
    ? expandOccurrences(a.recurrence, new Date(a.startAt), new Date(a.endAt), now, horizon)
    : [{ start: new Date(a.startAt), end: new Date(a.endAt) }];
  const out: PlannedNotification[] = [];
  occ.slice(0, 8).forEach((o, i) => {
    for (const r of (a.reminders ?? []).filter((x) => x.method === "push")) {
      out.push({
        id: hashId(`appt:${a.id}:${i}:${r.id}`),
        title: "موعد",
        body: a.title,
        at: new Date(o.start.getTime() - r.offsetMinutes * 60_000),
        channelId: "routini-appointments",
        url: `routini://appointment/${a.id}`,
      });
    }
  });
  return out;
}

function habitNotifications(h: Habit, s: UserSettings): PlannedNotification[] {
  if (!s.notifications.enabled || !s.notifications.habitReminders) return [];
  const time = h.timeOfDay;
  if (!time || (h.reminders ?? []).length === 0) return [];
  // Next 14 daily occurrences at timeOfDay (LocalNotifications caps total scheduled).
  const out: PlannedNotification[] = [];
  for (let d = 0; d < 14; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const iso = combineDateAndTime(
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      time,
    );
    out.push({
      id: hashId(`habit:${h.id}:${d}`),
      title: "عادة",
      body: h.title,
      at: new Date(iso),
      channelId: "routini-habits",
      url: `routini://habit/${h.id}`,
    });
  }
  return out;
}

function adhkarNotifications(s: UserSettings): PlannedNotification[] {
  if (!s.notifications.enabled || !s.notifications.adhkarReminders) return [];
  const times = s.notifications.adhkarTimes;
  const map: { key: keyof typeof times; label: string; cat: string }[] = [
    { key: "wake", label: "أذكار الاستيقاظ", cat: "wake" },
    { key: "morning", label: "أذكار الصباح", cat: "morning" },
    { key: "afterPrayer", label: "أذكار بعد الصلاة", cat: "after_prayer" },
    { key: "evening", label: "أذكار المساء", cat: "evening" },
    { key: "sleep", label: "أذكار النوم", cat: "sleep" },
  ];
  const out: PlannedNotification[] = [];
  for (const m of map) {
    for (let d = 0; d < 7; d++) {
      const day = new Date();
      day.setDate(day.getDate() + d);
      const iso = combineDateAndTime(
        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
        times[m.key],
      );
      out.push({
        id: hashId(`adhkar:${m.cat}:${d}`),
        title: "الأذكار",
        body: `${m.label} 📖`,
        at: new Date(iso),
        channelId: "routini-adhkar",
        url: `routini://adhkar/${m.cat}`,
      });
    }
  }
  return out;
}

function dailyPlanNotifications(s: UserSettings): PlannedNotification[] {
  if (!s.notifications.enabled || !s.notifications.dailyPlanReminder) return [];
  const out: PlannedNotification[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const iso = combineDateAndTime(
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      s.notifications.dailyPlanReminderTime,
    );
    out.push({
      id: hashId(`dailyplan:${d}`),
      title: "خطة اليوم",
      body: "خطط ليومك ✨",
      at: new Date(iso),
      channelId: "routini-daily-plan",
      url: "routini://home",
    });
  }
  return out;
}

/* -------------------------------------------------------------- public API - */

let pending: Promise<void> | null = null;

/**
 * Cancel every Routini notification and reschedule from current data. Idempotent —
 * safe to call after any mutation, on app resume, and after a settings change.
 * No-op on the web (browsers can't fire notifications while closed).
 */
export async function syncReminders(): Promise<void> {
  if (!isNativePlatform()) return;
  if (pending) return pending;
  pending = doSync().finally(() => {
    pending = null;
  });
  return pending;
}

async function doSync(): Promise<void> {
  let LocalNotifications;
  try {
    LocalNotifications = (await import("@capacitor/local-notifications")).LocalNotifications;
  } catch {
    return;
  }

  const perm = await LocalNotifications.checkPermissions().catch(() => null);
  if (!perm || perm.display !== "granted") return;

  // Ensure channels exist.
  for (const c of CHANNELS) {
    await LocalNotifications.createChannel({
      id: c.id,
      name: c.nameKey,
      importance: c.importance as 1 | 2 | 3 | 4 | 5,
      visibility: 1,
    }).catch(() => {});
  }

  const [settings, tasks, appointments, habits] = await Promise.all([
    settingsRepository.ensureDefaults(),
    tasksRepository.getAll(),
    appointmentsRepository.getAll(),
    habitsRepository.getAll(),
  ]);

  // Clear our previously-scheduled notifications.
  try {
    const p = await LocalNotifications.getPending();
    if (p.notifications.length) {
      await LocalNotifications.cancel({ notifications: p.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* ignore */
  }

  const now = Date.now();
  const planned: PlannedNotification[] = [
    ...tasks.flatMap((t) => taskNotifications(t, settings)),
    ...appointments.flatMap((a) => appointmentNotifications(a, settings)),
    ...habits.flatMap((h) => habitNotifications(h, settings)),
    ...adhkarNotifications(settings),
    ...dailyPlanNotifications(settings),
  ]
    .filter((n) => n.at.getTime() > now + 30_000)
    .filter((n) => !inQuietHours(n.at, settings))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 60); // stay well under the platform ceiling

  if (planned.length === 0) return;

  await LocalNotifications.schedule({
    notifications: planned.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      channelId: n.channelId,
      schedule: { at: n.at, allowWhileIdle: true },
      extra: { url: n.url },
    })),
  });
}
