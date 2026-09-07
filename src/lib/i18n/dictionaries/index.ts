import { common, nav, weekdays, priority } from "./common";
import { auth } from "./auth";
import { energy } from "./energy";
import { trackers } from "./trackers";
import { areas, goals } from "./areas";
import { reviews as reviewsDict, achievements as achievementsDict } from "./reviews";
import { onboarding } from "./onboarding";
import { home } from "./home";
import { appointments } from "./appointments";
import { tasks } from "./tasks";
import { habits } from "./habits";
import { adhkar } from "./adhkar";
import { search } from "./search";
import { more, statistics, settings } from "./more";
import {
  reminders,
  recurrence,
  plan,
  summary,
  prayer,
  calendarSync,
  notificationsExtra,
  smartAdd,
} from "./shared";

export const ar = {
  common: common.ar,
  nav: nav.ar,
  weekdays: weekdays.ar,
  priority: priority.ar,
  auth: auth.ar,
  energy: energy.ar,
  trackers: trackers.ar,
  areas: areas.ar,
  goals: goals.ar,
  reviews: reviewsDict.ar,
  achievements: achievementsDict.ar,
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
  reminders: reminders.ar,
  recurrence: recurrence.ar,
  plan: plan.ar,
  summary: summary.ar,
  prayer: prayer.ar,
  calendarSync: calendarSync.ar,
  notificationsExtra: notificationsExtra.ar,
  smartAdd: smartAdd.ar,
};

export const en: typeof ar = {
  common: common.en,
  nav: nav.en,
  weekdays: weekdays.en,
  priority: priority.en,
  auth: auth.en,
  energy: energy.en,
  trackers: trackers.en,
  areas: areas.en,
  goals: goals.en,
  reviews: reviewsDict.en,
  achievements: achievementsDict.en,
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
  reminders: reminders.en,
  recurrence: recurrence.en,
  plan: plan.en,
  summary: summary.en,
  prayer: prayer.en,
  calendarSync: calendarSync.en,
  notificationsExtra: notificationsExtra.en,
  smartAdd: smartAdd.en,
};

export type Dictionary = typeof ar;
