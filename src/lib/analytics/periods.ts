import { dateKey } from "@/lib/time/dateUtils";
import type { ReviewPeriod } from "@/lib/types";

/** ISO-week key, e.g. "2026-W37". Week starts Monday. */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function periodKeyFor(period: ReviewPeriod, d = new Date()): string {
  if (period === "day") return dateKey(d);
  if (period === "week") return weekKey(d);
  return monthKey(d);
}

/** The local date keys (YYYY-MM-DD) that fall in a period. */
export function datesInPeriod(period: ReviewPeriod, key: string): string[] {
  if (period === "day") return [key];

  let start: Date;
  let end: Date;
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0);
  } else {
    // week: find the Monday of that ISO week
    const [y, wRaw] = key.split("-W");
    const week = Number(wRaw);
    const jan4 = new Date(Number(y), 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - jan4Day + 1);
    start = new Date(week1Monday);
    start.setDate(week1Monday.getDate() + (week - 1) * 7);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** The key of the period immediately before `key`. */
export function previousPeriodKey(period: ReviewPeriod, key: string): string {
  const dates = datesInPeriod(period, key);
  const first = new Date(`${dates[0]}T12:00:00`);
  first.setDate(first.getDate() - 1);
  return periodKeyFor(period, first);
}
