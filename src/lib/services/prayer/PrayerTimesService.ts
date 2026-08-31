import {
  CalculationMethod,
  Coordinates,
  PrayerTimes,
  type CalculationParameters,
} from "adhan";
import type { PrayerCalculationMethod, PrayerTimesSettings } from "@/lib/types";

export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface NextPrayer {
  name: PrayerName;
  at: Date;
  /** Milliseconds until `at`. */
  remainingMs: number;
}

export interface DayPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

function params(method: PrayerCalculationMethod): CalculationParameters {
  switch (method) {
    case "MuslimWorldLeague":
      return CalculationMethod.MuslimWorldLeague();
    case "Egyptian":
      return CalculationMethod.Egyptian();
    case "Karachi":
      return CalculationMethod.Karachi();
    case "Dubai":
      return CalculationMethod.Dubai();
    case "Qatar":
      return CalculationMethod.Qatar();
    case "Kuwait":
      return CalculationMethod.Kuwait();
    case "MoonsightingCommittee":
      return CalculationMethod.MoonsightingCommittee();
    case "NorthAmerica":
      return CalculationMethod.NorthAmerica();
    case "UmmAlQura":
    default:
      return CalculationMethod.UmmAlQura();
  }
}

function forDate(settings: PrayerTimesSettings, date: Date): PrayerTimes {
  const coords = new Coordinates(settings.latitude, settings.longitude);
  return new PrayerTimes(coords, date, params(settings.method));
}

export const prayerTimesService = {
  dayTimes(settings: PrayerTimesSettings, date = new Date()): DayPrayerTimes {
    const pt = forDate(settings, date);
    return {
      fajr: pt.fajr,
      sunrise: pt.sunrise,
      dhuhr: pt.dhuhr,
      asr: pt.asr,
      maghrib: pt.maghrib,
      isha: pt.isha,
    };
  },

  next(settings: PrayerTimesSettings, now = new Date()): NextPrayer {
    const today = forDate(settings, now);
    const order: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
    for (const name of order) {
      const at = today[name] as Date;
      if (at.getTime() > now.getTime()) {
        return { name, at, remainingMs: at.getTime() - now.getTime() };
      }
    }
    // All of today's prayers passed — return tomorrow's Fajr.
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const at = forDate(settings, tomorrow).fajr;
    return { name: "fajr", at, remainingMs: at.getTime() - now.getTime() };
  },
};
