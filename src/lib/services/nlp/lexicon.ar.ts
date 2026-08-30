export const AR_WEEKDAYS: Record<string, number> = {
  الأحد: 0,
  الاحد: 0,
  أحد: 0,
  احد: 0,
  الاثنين: 1,
  الإثنين: 1,
  اثنين: 1,
  إثنين: 1,
  الثلاثاء: 2,
  الثلاثا: 2,
  ثلاثاء: 2,
  ثلاثا: 2,
  الأربعاء: 3,
  الاربعاء: 3,
  الأربعا: 3,
  أربعاء: 3,
  اربعاء: 3,
  الخميس: 4,
  خميس: 4,
  الجمعة: 5,
  الجمعه: 5,
  جمعة: 5,
  جمعه: 5,
  السبت: 6,
  سبت: 6,
};

export const AR_RELATIVE_DAYS: Record<string, number> = {
  اليوم: 0,
  "بعد بكرة": 2,
  "بعد بكره": 2,
  "بعد غد": 2,
  "بعد غداً": 2,
  "بعد غدا": 2,
  بكرة: 1,
  بكره: 1,
  غداً: 1,
  غدا: 1,
  "غدًا": 1,
  "بعد غدًا": 2,
  أمس: -1,
  امس: -1,
  "أول أمس": -2,
  "اول امس": -2,
};

export interface TimeQualifier {
  hour: number;
  minute: number;
  meridiemBias?: "am" | "pm";
}

export const AR_TIME_QUALIFIERS: Record<string, TimeQualifier> = {
  "قبل الظهر": { hour: 11, minute: 0, meridiemBias: "am" },
  "بعد الظهر": { hour: 14, minute: 0, meridiemBias: "pm" },
  "منتصف الليل": { hour: 0, minute: 0 },
  الفجر: { hour: 5, minute: 0, meridiemBias: "am" },
  الصبح: { hour: 8, minute: 0, meridiemBias: "am" },
  الضحى: { hour: 9, minute: 30, meridiemBias: "am" },
  الظهر: { hour: 12, minute: 0 },
  العصر: { hour: 15, minute: 30, meridiemBias: "pm" },
  المغرب: { hour: 18, minute: 30, meridiemBias: "pm" },
  العشاء: { hour: 20, minute: 0, meridiemBias: "pm" },
  الليل: { hour: 21, minute: 0, meridiemBias: "pm" },
  مساءً: { hour: 19, minute: 0, meridiemBias: "pm" },
  مساء: { hour: 19, minute: 0, meridiemBias: "pm" },
  صباحاً: { hour: 8, minute: 0, meridiemBias: "am" },
  صباحا: { hour: 8, minute: 0, meridiemBias: "am" },
};

export const AR_DURATION_UNITS = {
  minute: ["دقيقة", "دقايق", "دقائق"],
  hour: ["ساعة", "ساعات"],
  hourDual: ["ساعتين"],
  halfHour: ["نص ساعة", "نصف ساعة"],
};

export const AR_RECURRENCE_MARKERS = ["كل", "كل يوم", "يوميا", "يومياً", "أسبوعيا", "اسبوعيا", "أسبوعياً"];

export const AR_PRIORITY_IMPORTANT = ["مهم", "مهمة", "عاجل", "عاجلة", "ضروري", "ضرورية", "أولوية", "اولوية"];
export const AR_PRIORITY_LATER = ["لاحقاً", "لاحقا", "ثانوي", "ثانوية", "مو مستعجل", "غير مستعجل"];

export const AR_PERSON_NAMES = [
  "أحمد",
  "احمد",
  "محمد",
  "سارة",
  "ساره",
  "فاطمة",
  "فاطمه",
  "خالد",
  "نورة",
  "نوره",
  "عبدالله",
  "عبدالرحمن",
  "مريم",
  "علي",
  "حسن",
  "حسين",
  "يوسف",
  "ليلى",
  "هند",
  "ريم",
  "نوف",
  "سلطان",
  "فهد",
  "تركي",
  "منال",
  "لينا",
  "سلمى",
  "عمر",
  "إبراهيم",
  "ابراهيم",
];

export const AR_LOCATION_KEYWORDS = [
  "المكتب",
  "مكتب",
  "العيادة",
  "عيادة",
  "البيت",
  "بيت",
  "المنزل",
  "منزل",
  "المطعم",
  "مطعم",
  "المقهى",
  "مقهى",
  "الجامعة",
  "جامعة",
  "المدرسة",
  "مدرسة",
  "المستشفى",
  "مستشفى",
  "الصالة",
  "صالة",
  "النادي",
  "نادي",
];

export const AR_TASK_VERBS = [
  "اتصل",
  "اتصلي",
  "أتصل",
  "أنهي",
  "انهي",
  "أرسل",
  "ارسل",
  "راجع",
  "أراجع",
  "اراجع",
  "جهز",
  "أجهز",
  "حضر",
  "أحضر",
  "اشتري",
  "أشتري",
  "ادفع",
  "أدفع",
  "سلم",
  "أسلم",
  "تابع",
  "أتابع",
  "اطبع",
  "أطبع",
  "احجز",
  "أحجز",
  "أكمل",
  "اكمل",
  "أنجز",
  "انجز",
];

/** Verbs that signal "remind me to …" — a strong task cue; stripped from the title. */
export const AR_REMINDER_CUES = ["ذكرني", "ذكّرني", "تذكير", "نبهني", "نبّهني", "فكرني", "ذكرنى"];

export const AR_APPOINTMENT_CUES = ["اجتماع", "موعد", "مقابلة", "لقاء", "زيارة"];
export const AR_HABIT_DESIRE_VERBS = ["أبغى", "ابغى", "أريد", "اريد", "ودي", "حابب"];
export const AR_HABIT_ACTION_VERBS = [
  "أمشي",
  "امشي",
  "أقرأ",
  "اقرأ",
  "أصلي",
  "اصلي",
  "أرياض",
  "اتمرن",
  "أشرب",
  "اشرب",
  "أذاكر",
  "اذاكر",
  "أكتب",
  "اكتب",
];
export const AR_SEARCH_QUESTION_WORDS = ["وش", "ايش", "إيش", "متى", "هل", "كم", "وين", "أين", "اين"];
