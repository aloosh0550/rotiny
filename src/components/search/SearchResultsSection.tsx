"use client";

import { CalendarDays, ListChecks, Repeat, Sparkles } from "lucide-react";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatDayLabel, formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import type { Appointment, Dhikr, DhikrCategory, Habit, Task } from "@/lib/types";
import { SearchResultRow } from "./SearchResultRow";

type Translate = ReturnType<typeof useTranslation>["t"];

function habitRecurrenceLabel(habit: Habit, t: Translate): string {
  const rule = habit.recurrence;
  switch (rule.frequency) {
    case "daily":
      return t("habits.recurrenceDaily");
    case "weekly":
      return rule.byWeekday && rule.byWeekday.length > 0
        ? t("habits.recurrenceWeekdays")
        : t("habits.recurrenceWeekly");
    case "monthly":
    case "custom":
    default:
      return t("habits.recurrenceCustom");
  }
}

export type SearchResultsSectionProps =
  | { entity: "appointment"; title: string; items: Appointment[] }
  | { entity: "task"; title: string; items: Task[] }
  | { entity: "habit"; title: string; items: Habit[] }
  | { entity: "dhikr"; title: string; items: Dhikr[]; categories: DhikrCategory[] | undefined };

/** A titled group of search results for one entity type, in the page's fixed section order. */
export function SearchResultsSection(props: SearchResultsSectionProps) {
  const { t, locale } = useTranslation();

  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-1 text-sm font-bold text-text-secondary">{props.title}</h3>
      <div className="flex flex-col gap-2">
        {props.entity === "appointment" &&
          props.items.map((appointment) => (
            <SearchResultRow
              key={appointment.id}
              href={ROUTES.appointment(appointment.id)}
              icon={<CalendarDays className="size-4" />} color="indigo"
              title={appointment.title}
              subtitle={`${formatDayLabel(new Date(appointment.startAt), locale)} · ${formatTime(appointment.startAt, locale)}`}
            />
          ))}

        {props.entity === "task" &&
          props.items.map((task) => (
            <SearchResultRow
              key={task.id}
              href={ROUTES.task(task.id)}
              icon={<ListChecks className="size-4" />} color="amber"
              title={task.title}
              subtitle={
                task.dueAt
                  ? `${formatDayLabel(new Date(task.dueAt), locale)}${task.hasTime ? ` · ${formatTime(task.dueAt, locale)}` : ""}`
                  : undefined
              }
              trailing={<PriorityDot priority={task.priority} />}
            />
          ))}

        {props.entity === "habit" &&
          props.items.map((habit) => (
            <SearchResultRow
              key={habit.id}
              href={ROUTES.habit(habit.id)}
              icon={<Repeat className="size-4" />} color="green"
              title={habit.title}
              subtitle={habitRecurrenceLabel(habit, t)}
            />
          ))}

        {props.entity === "dhikr" &&
          props.items.map((dhikr) => (
            <SearchResultRow
              key={dhikr.id}
              href={ROUTES.adhkar}
              icon={<Sparkles className="size-4" />} color="violet"
              title={dhikr.text}
              subtitle={props.categories?.find((c) => c.id === dhikr.categoryId)?.title}
            />
          ))}
      </div>
    </section>
  );
}
