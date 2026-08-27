import { describe, expect, it } from "vitest";
import { RuleBasedIntentParser } from "@/lib/services/nlp/RuleBasedIntentParser";
import { dateKey } from "@/lib/time/dateUtils";
import { addDays } from "date-fns";

// Wednesday, August 26 2026 — matches this project's real "today" so date-relative
// assertions read naturally against the seed data / manual QA already done on this date.
const NOW = new Date(2026, 7, 26, 9, 0, 0);
const parser = new RuleBasedIntentParser();

function parse(text: string, locale: "ar" | "en" = "ar") {
  return parser.parse(text, { now: NOW, locale });
}

describe("RuleBasedIntentParser — spec example phrases", () => {
  it('"اجتماع مع أحمد الخميس الساعة ٤" → appointment, next Thursday, 4pm', () => {
    const result = parse("اجتماع مع أحمد الخميس الساعة ٤");
    expect(result.intentType).toBe("create_appointment");
    expect(result.date?.value).toBe(dateKey(addDays(NOW, 1))); // Thursday = tomorrow from Wed
    expect(result.time?.value).toBe("16:00");
    expect(result.entities.some((e) => e.type === "person" && e.value === "أحمد")).toBe(true);
  });

  it('"اتصل بأحمد بكرة ١٠" → task, tomorrow, 10am', () => {
    const result = parse("اتصل بأحمد بكرة ١٠");
    expect(result.intentType).toBe("create_task");
    expect(result.date?.value).toBe(dateKey(addDays(NOW, 1)));
    expect(result.time?.value).toBe("10:00");
  });

  it('"أبغى أمشي 30 دقيقة كل خميس" → recurring habit, weekly on Thursday, 30 min', () => {
    const result = parse("أبغى أمشي 30 دقيقة كل خميس");
    expect(result.intentType).toBe("create_habit");
    expect(result.recurrence?.value).toEqual({ frequency: "weekly", interval: 1, byWeekday: [4] });
    expect(result.durationMinutes?.value).toBe(30);
    expect(result.title.value).not.toContain("أبغى"); // desire verb isn't part of the habit's name
    expect(result.title.value).toContain("أمشي");
  });

  it('"أنهي التقرير بكرة قبل الظهر" → task, tomorrow, before-noon qualifier', () => {
    const result = parse("أنهي التقرير بكرة قبل الظهر");
    expect(result.intentType).toBe("create_task");
    expect(result.date?.value).toBe(dateKey(addDays(NOW, 1)));
    expect(result.time?.value).toBe("11:00");
    expect(result.time?.confidence).toBeLessThan(0.6); // vague qualifier — must stay low-confidence
  });
});

describe("RuleBasedIntentParser — English equivalents", () => {
  it('"meeting with Ahmad Thursday at 4pm" → appointment', () => {
    const result = parse("meeting with Ahmad Thursday at 4pm", "en");
    expect(result.intentType).toBe("create_appointment");
    expect(result.date?.value).toBe(dateKey(addDays(NOW, 1)));
    expect(result.time?.value).toBe("16:00");
  });

  it('"call Ahmad tomorrow at 10" → task', () => {
    const result = parse("call Ahmad tomorrow at 10", "en");
    expect(result.intentType).toBe("create_task");
    expect(result.date?.value).toBe(dateKey(addDays(NOW, 1)));
    expect(result.time?.value).toBe("10:00");
  });
});

describe("RuleBasedIntentParser — edge cases", () => {
  it("weekday matching today resolves to today, not next week", () => {
    const result = parse("موعد الأربعاء الساعة 5 مساء");
    expect(result.date?.value).toBe(dateKey(NOW));
  });

  it("weekday already passed this week rolls to next week", () => {
    // NOW is Wednesday; Monday already happened this week.
    const result = parse("موعد الاثنين الساعة 5 مساء");
    expect(result.date?.value).toBe(dateKey(addDays(NOW, 5)));
  });

  it('"ساعتين" (dual form) resolves to 120 minutes', () => {
    const result = parse("اجتماع ساعتين بكرة");
    expect(result.durationMinutes?.value).toBe(120);
  });

  it("ambiguous bare hour (7) triggers a clarification instead of guessing", () => {
    const result = parse("موعد بكرة 7");
    expect(result.time).toBeUndefined();
    expect(result.clarifications.some((c) => c.field === "time")).toBe(true);
  });

  it("unrecognized priority defaults to normal at full confidence, not a missing detection", () => {
    const result = parse("اتصل بخالد بكرة");
    expect(result.priority?.value).toBe("normal");
    expect(result.priority?.confidence).toBe(1);
  });

  it('"مهم" marks a task important and is stripped from the title', () => {
    const result = parse("أرسل التقرير اليوم مهم");
    expect(result.priority?.value).toBe("important");
    expect(result.title.value).not.toContain("مهم");
  });

  it("keeps the person entity in the title while stripping date/time", () => {
    const result = parse("اجتماع مع أحمد الخميس الساعة ٤");
    expect(result.title.value).toContain("أحمد");
    expect(result.title.value).not.toContain("الساعة");
  });

  it("unclear text with no signal at all still defaults to a task (the safest, most reversible guess) rather than silently picking a riskier intent", () => {
    const result = parse("شيء غامض بلا معنى واضح");
    expect(result.intentType).toBe("create_task");
    expect(result.clarifications).toHaveLength(0);
  });

  it("competing signals (appointment cue AND task verb) trigger an intent clarification instead of silently picking one", () => {
    const result = parse("اجتماع اتصل بأحمد");
    expect(result.clarifications.some((c) => c.field === "intent")).toBe(true);
  });
});
