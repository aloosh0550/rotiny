import {
  addDays as fnsAddDays,
  addMinutes as fnsAddMinutes,
  differenceInMinutes as fnsDifferenceInMinutes,
  endOfDay as fnsEndOfDay,
  isSameDay as fnsIsSameDay,
  startOfDay as fnsStartOfDay,
  startOfWeek as fnsStartOfWeek,
} from "date-fns";
import type { Locale } from "@/lib/types";

export const addDays = fnsAddDays;
export const addMinutes = fnsAddMinutes;
export const differenceInMinutes = fnsDifferenceInMinutes;
export const startOfDay = fnsStartOfDay;
export const endOfDay = fnsEndOfDay;
export const isSameDay = fnsIsSameDay;

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 6 = 0): Date {
  return fnsStartOfWeek(date, { weekStartsOn });
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

function localeToIntl(locale: Locale): string {
  return locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatWeekday(date: Date, locale: Locale, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(localeToIntl(locale), { weekday: style }).format(date);
}

export function formatMonthDay(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeToIntl(locale), { day: "numeric", month: "long" }).format(date);
}

export function formatFullDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatDuration(minutes: number, locale: Locale): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (locale === "ar") {
    const parts: string[] = [];
    if (hrs > 0) parts.push(hrs === 1 ? "ساعة" : hrs === 2 ? "ساعتين" : `${hrs} ساعات`);
    if (mins > 0) parts.push(`${mins} دقيقة`);
    return parts.length > 0 ? parts.join(" و") : "٠ دقيقة";
  }
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.length > 0 ? parts.join(" ") : "0m";
}

export function formatDayLabel(date: Date, locale: Locale): string {
  const now = new Date();
  if (isSameDay(date, now)) return locale === "ar" ? "اليوم" : "Today";
  if (isSameDay(date, addDays(now, 1))) return locale === "ar" ? "غدًا" : "Tomorrow";
  if (isSameDay(date, addDays(now, -1))) return locale === "ar" ? "أمس" : "Yesterday";
  return formatWeekday(date, locale);
}

export function combineDateAndTime(dateKeyStr: string, time: string): string {
  return new Date(`${dateKeyStr}T${time}:00`).toISOString();
}
