import type { Habit, Locale } from "@/lib/types";
import { formatWeekday } from "@/lib/time/dateUtils";
import type { TranslationKey } from "@/lib/i18n/paths";

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

// A fixed, known Sunday used only to resolve a weekday index (0-6) to a localized
// weekday name via Intl. It never reflects "now", so it's not a purity-rule concern.
const REFERENCE_SUNDAY = new Date(2024, 0, 7);

function weekdayName(weekday: number, locale: Locale): string {
  const date = new Date(REFERENCE_SUNDAY);
  date.setDate(date.getDate() + weekday);
  return formatWeekday(date, locale, "long");
}

/** Plain-text recurrence summary for a habit, e.g. "يوميًا" (daily) or "كل خميس" (every Thursday). */
export function habitRecurrenceSummary(habit: Habit, t: Translator, locale: Locale): string {
  const { recurrence } = habit;

  if (recurrence.frequency === "daily") {
    return t("habits.recurrenceDaily");
  }

  if (recurrence.frequency === "weekly" || recurrence.frequency === "custom") {
    const days = recurrence.byWeekday ?? [];
    if (days.length === 0) {
      return recurrence.frequency === "weekly" ? t("habits.recurrenceWeekly") : t("habits.recurrenceCustom");
    }
    if (days.length === 1) {
      return t("habits.recurrenceEvery", { day: weekdayName(days[0], locale) });
    }
    const names = days
      .slice()
      .sort((a, b) => a - b)
      .map((d) => weekdayName(d, locale));
    return new Intl.ListFormat(locale === "ar" ? "ar" : "en", {
      style: "long",
      type: "conjunction",
    }).format(names);
  }

  return t("habits.recurrenceCustom");
}
