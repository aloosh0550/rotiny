import { db } from "@/lib/db/schema";
import { settingsRepository } from "@/lib/db/repositories/settingsRepository";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { dateKey } from "@/lib/time/dateUtils";
import type {
  Appointment,
  Dhikr,
  DhikrCategory,
  DhikrCategoryKind,
  Habit,
  HabitCompletion,
  Task,
} from "@/lib/types";
import { addDays } from "date-fns";

export const CURRENT_SEED_VERSION = 1;

function iso(date: Date): string {
  return date.toISOString();
}

const CATEGORY_DEFS: { kind: DhikrCategoryKind; title: string; order: number }[] = [
  { kind: "morning", title: "أذكار الصباح", order: 0 },
  { kind: "evening", title: "أذكار المساء", order: 1 },
  { kind: "after_prayer", title: "أذكار بعد الصلاة", order: 2 },
  { kind: "sleep", title: "أذكار النوم", order: 3 },
];

const DHIKR_DEFS: Record<DhikrCategoryKind, { text: string; targetCount: number; source?: string }[]> = {
  morning: [
    {
      text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
      targetCount: 1,
      source: "صحيح مسلم",
    },
    {
      text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
      targetCount: 1,
      source: "سنن الترمذي",
    },
    {
      text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ (آية الكرسي)",
      targetCount: 1,
      source: "آية الكرسي",
    },
    { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", targetCount: 100, source: "صحيح مسلم" },
    { text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", targetCount: 100, source: "صحيح البخاري" },
  ],
  evening: [
    {
      text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
      targetCount: 1,
      source: "صحيح مسلم",
    },
    {
      text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ (سيد الاستغفار)",
      targetCount: 1,
      source: "صحيح البخاري",
    },
    { text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", targetCount: 3, source: "سنن أبي داود" },
    { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", targetCount: 100, source: "صحيح مسلم" },
  ],
  after_prayer: [
    { text: "أَسْتَغْفِرُ اللَّهَ (ثلاثًا) اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", targetCount: 1, source: "صحيح مسلم" },
    { text: "سُبْحَانَ اللَّهِ", targetCount: 33, source: "صحيح البخاري" },
    { text: "الْحَمْدُ لِلَّهِ", targetCount: 33, source: "صحيح البخاري" },
    { text: "اللَّهُ أَكْبَرُ", targetCount: 34, source: "صحيح البخاري" },
  ],
  sleep: [
    { text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", targetCount: 1, source: "صحيح البخاري" },
    { text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", targetCount: 3, source: "سنن أبي داود" },
    { text: "سُبْحَانَ اللَّهِ", targetCount: 33, source: "صحيح البخاري" },
    { text: "الْحَمْدُ لِلَّهِ", targetCount: 33, source: "صحيح البخاري" },
    { text: "اللَّهُ أَكْبَرُ", targetCount: 34, source: "صحيح البخاري" },
  ],
  custom: [],
};

async function seedAdhkar() {
  const categoryIdByKind: Partial<Record<DhikrCategoryKind, string>> = {};

  for (const def of CATEGORY_DEFS) {
    const category: DhikrCategory = {
      id: generateId(),
      kind: def.kind,
      title: def.title,
      order: def.order,
      isCustom: false,
      sync: createSyncMeta(),
    };
    await db.dhikrCategories.add(category);
    categoryIdByKind[def.kind] = category.id;
  }

  const items: Dhikr[] = [];
  for (const def of CATEGORY_DEFS) {
    const categoryId = categoryIdByKind[def.kind];
    if (!categoryId) continue;
    const dhikrList = DHIKR_DEFS[def.kind];
    dhikrList.forEach((d, index) => {
      items.push({
        id: generateId(),
        categoryId,
        text: d.text,
        targetCount: d.targetCount,
        source: d.source,
        order: index,
        isCustom: false,
        sync: createSyncMeta(),
      });
    });
  }
  await db.adhkar.bulkAdd(items);
}

async function seedAppointments() {
  const now = new Date();
  const mk = (start: Date, endMinutesLater: number, title: string, participants?: string[]): Appointment => ({
    id: generateId(),
    title,
    startAt: iso(start),
    endAt: iso(new Date(start.getTime() + endMinutesLater * 60_000)),
    allDay: false,
    reminders: [{ id: generateId(), offsetMinutes: 30, method: "inapp" }],
    participants,
    calendarProviderId: "local",
    sync: createSyncMeta(),
  });

  const tomorrow10 = new Date(now);
  tomorrow10.setDate(now.getDate() + 1);
  tomorrow10.setHours(10, 0, 0, 0);

  const inTwoDays13 = new Date(now);
  inTwoDays13.setDate(now.getDate() + 2);
  inTwoDays13.setHours(13, 0, 0, 0);

  const inThreeDays17 = new Date(now);
  inThreeDays17.setDate(now.getDate() + 3);
  inThreeDays17.setHours(17, 0, 0, 0);

  const appointments = [
    mk(tomorrow10, 60, "اجتماع فريق التصميم"),
    mk(inTwoDays13, 60, "غداء مع سارة", ["سارة"]),
    mk(inThreeDays17, 30, "موعد الأسنان"),
  ];
  await db.appointments.bulkAdd(appointments);
}

async function seedTasks() {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(18, 0, 0, 0);

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(now.getDate() + 1);
  tomorrowMorning.setHours(10, 0, 0, 0);

  const inFourDays = new Date(now);
  inFourDays.setDate(now.getDate() + 4);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(15, 0, 0, 0);

  const mk = (overrides: Partial<Task>): Task => ({
    id: generateId(),
    title: "",
    hasTime: false,
    priority: "normal",
    status: "pending",
    reminders: [],
    sync: createSyncMeta(),
    ...overrides,
  });

  const tasks: Task[] = [
    mk({
      title: "إرسال التقرير الأسبوعي",
      dueAt: iso(todayEnd),
      hasTime: true,
      priority: "important",
    }),
    mk({
      title: "الاتصال بالمحامي",
      dueAt: iso(tomorrowMorning),
      hasTime: true,
      priority: "normal",
    }),
    mk({
      title: "شراء هدية عيد ميلاد أحمد",
      dueAt: iso(inFourDays),
      hasTime: false,
      priority: "later",
    }),
    mk({
      title: "تجديد الاشتراك الشهري",
      dueAt: iso(yesterday),
      hasTime: true,
      priority: "normal",
      status: "completed",
      completedAt: iso(yesterday),
    }),
  ];
  await db.tasks.bulkAdd(tasks);
}

async function seedHabits() {
  const now = new Date();
  const createdAt = addDays(now, -14);

  const readingHabit: Habit = {
    id: generateId(),
    title: "قراءة ٢٠ صفحة",
    recurrence: { frequency: "daily", interval: 1 },
    target: { type: "count", value: 20, unit: "صفحة" },
    reminders: [],
    sync: createSyncMeta(iso(createdAt)),
  };

  const walkHabit: Habit = {
    id: generateId(),
    title: "المشي ٣٠ دقيقة",
    recurrence: { frequency: "weekly", interval: 1, byWeekday: [4] },
    timeOfDay: "17:30",
    target: { type: "duration", value: 30 },
    reminders: [],
    sync: createSyncMeta(iso(createdAt)),
  };

  const waterHabit: Habit = {
    id: generateId(),
    title: "شرب الماء",
    recurrence: { frequency: "daily", interval: 1 },
    target: { type: "count", value: 8, unit: "أكواب" },
    reminders: [],
    sync: createSyncMeta(iso(createdAt)),
  };

  await db.habits.bulkAdd([readingHabit, walkHabit, waterHabit]);

  const completions: HabitCompletion[] = [];
  for (let i = 1; i <= 6; i++) {
    const day = addDays(now, -i);
    const key = dateKey(day);
    if (Math.random() > 0.15) {
      completions.push({
        id: generateId(),
        habitId: readingHabit.id,
        date: key,
        completedAt: iso(day),
        sync: createSyncMeta(iso(day)),
      });
    }
    if (Math.random() > 0.3) {
      completions.push({
        id: generateId(),
        habitId: waterHabit.id,
        date: key,
        completedAt: iso(day),
        sync: createSyncMeta(iso(day)),
      });
    }
    if (day.getDay() === 4) {
      completions.push({
        id: generateId(),
        habitId: walkHabit.id,
        date: key,
        completedAt: iso(day),
        sync: createSyncMeta(iso(day)),
      });
    }
  }
  await db.habitCompletions.bulkAdd(completions);
}

export async function seedIfNeeded(): Promise<void> {
  const settings = await settingsRepository.ensureDefaults();
  if (settings.seedVersion >= CURRENT_SEED_VERSION) return;

  await seedAdhkar();
  await seedAppointments();
  await seedTasks();
  await seedHabits();

  await db.settings.update("singleton", { seedVersion: CURRENT_SEED_VERSION });
}
