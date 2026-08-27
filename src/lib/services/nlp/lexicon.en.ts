import type { TimeQualifier } from "./lexicon.ar";

export const EN_WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

export const EN_RELATIVE_DAYS: Record<string, number> = {
  today: 0,
  tonight: 0,
  "day after tomorrow": 2,
  tomorrow: 1,
  yesterday: -1,
  "day before yesterday": -2,
};

export const EN_TIME_QUALIFIERS: Record<string, TimeQualifier> = {
  "before noon": { hour: 11, minute: 0, meridiemBias: "am" },
  "after noon": { hour: 14, minute: 0, meridiemBias: "pm" },
  midnight: { hour: 0, minute: 0 },
  noon: { hour: 12, minute: 0 },
  morning: { hour: 8, minute: 0, meridiemBias: "am" },
  afternoon: { hour: 14, minute: 0, meridiemBias: "pm" },
  evening: { hour: 19, minute: 0, meridiemBias: "pm" },
  night: { hour: 21, minute: 0, meridiemBias: "pm" },
};

export const EN_DURATION_UNITS = {
  minute: ["minute", "minutes", "min", "mins"],
  hour: ["hour", "hours", "hr", "hrs"],
  halfHour: ["half an hour", "half hour"],
};

export const EN_RECURRENCE_MARKERS = ["every", "daily", "weekly", "each"];

export const EN_PRIORITY_IMPORTANT = ["important", "urgent", "asap", "critical", "priority"];
export const EN_PRIORITY_LATER = ["later", "whenever", "someday", "low priority", "not urgent"];

export const EN_PERSON_NAMES = [
  "ahmad",
  "ahmed",
  "mohammed",
  "mohammad",
  "sara",
  "sarah",
  "fatima",
  "khalid",
  "noura",
  "abdullah",
  "abdulrahman",
  "mariam",
  "maryam",
  "ali",
  "hassan",
  "hussein",
  "yousef",
  "youssef",
  "layla",
  "hind",
  "reem",
  "nouf",
  "sultan",
  "fahad",
  "turki",
  "manal",
  "lina",
  "salma",
  "omar",
  "ibrahim",
];

export const EN_LOCATION_KEYWORDS = [
  "office",
  "clinic",
  "home",
  "house",
  "restaurant",
  "cafe",
  "coffee shop",
  "university",
  "school",
  "hospital",
  "gym",
  "club",
];

export const EN_TASK_VERBS = ["call", "finish", "send", "review", "prepare", "buy", "pay", "submit", "follow up", "print", "book"];

export const EN_APPOINTMENT_CUES = ["meeting", "appointment", "interview", "call with", "visit"];
export const EN_HABIT_DESIRE_VERBS = ["i want to", "i wanna", "i'd like to", "want to"];
export const EN_HABIT_ACTION_VERBS = ["walk", "read", "pray", "exercise", "workout", "drink", "study", "write", "run", "meditate"];
export const EN_SEARCH_QUESTION_WORDS = ["what", "when", "do i have", "is there", "how many", "where"];
