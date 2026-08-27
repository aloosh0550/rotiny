import { common, nav, weekdays, priority } from "./common";
import { onboarding } from "./onboarding";
import { home } from "./home";
import { appointments } from "./appointments";
import { tasks } from "./tasks";
import { habits } from "./habits";
import { adhkar } from "./adhkar";
import { search } from "./search";
import { more, statistics, settings } from "./more";

export const ar = {
  common: common.ar,
  nav: nav.ar,
  weekdays: weekdays.ar,
  priority: priority.ar,
  onboarding: onboarding.ar,
  home: home.ar,
  appointments: appointments.ar,
  tasks: tasks.ar,
  habits: habits.ar,
  adhkar: adhkar.ar,
  search: search.ar,
  more: more.ar,
  statistics: statistics.ar,
  settings: settings.ar,
};

export const en: typeof ar = {
  common: common.en,
  nav: nav.en,
  weekdays: weekdays.en,
  priority: priority.en,
  onboarding: onboarding.en,
  home: home.en,
  appointments: appointments.en,
  tasks: tasks.en,
  habits: habits.en,
  adhkar: adhkar.en,
  search: search.en,
  more: more.en,
  statistics: statistics.en,
  settings: settings.en,
};

export type Dictionary = typeof ar;
