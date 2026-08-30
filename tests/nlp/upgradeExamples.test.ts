import { describe, expect, it } from "vitest";
import { RuleBasedIntentParser } from "@/lib/services/nlp/RuleBasedIntentParser";
import { dateKey } from "@/lib/time/dateUtils";
import { addDays } from "date-fns";

const NOW = new Date(2026, 7, 26, 9, 0, 0); // Wed Aug 26 2026
const parser = new RuleBasedIntentParser();
const parse = (text: string, locale: "ar" | "en" = "ar") => parser.parse(text, { now: NOW, locale });

describe("Smart Add — product upgrade examples", () => {
  it('"موعد طبيب الأسنان الأحد الساعة 7 مساء" → appointment, Sunday, 19:00, no AM/PM clarification', () => {
    const r = parse("موعد طبيب الأسنان الأحد الساعة 7 مساء");
    expect(r.intentType).toBe("create_appointment");
    expect(r.date?.value).toBe(dateKey(addDays(NOW, 4))); // next Sunday
    expect(r.time?.value).toBe("19:00");
    expect(r.clarifications.some((c) => c.field === "time")).toBe(false);
  });

  it('"اشرب 8 أكواب ماء يوميًا" → habit, count target 8 كوب, daily, 8 not read as an hour', () => {
    const r = parse("اشرب 8 أكواب ماء يوميًا");
    expect(r.intentType).toBe("create_habit");
    expect(r.countTarget?.value).toEqual({ value: 8, unit: "كوب" });
    expect(r.recurrence?.value.frequency).toBe("daily");
    expect(r.time).toBeUndefined();
    expect(r.title.value).not.toContain("8");
  });

  it('"ذكرني أراجع المشروع بكرة" → task, tomorrow, title has no "ذكرني"', () => {
    const r = parse("ذكرني أراجع المشروع بكرة");
    expect(r.intentType).toBe("create_task");
    expect(r.date?.value).toBe(dateKey(addDays(NOW, 1)));
    expect(r.title.value).not.toContain("ذكرني");
    expect(r.title.value).toContain("المشروع");
  });

  it('"ذكرني اتصل بأحمد بكرة الساعة 4 قبل ساعة" → task with a 60-min reminder offset', () => {
    const r = parse("ذكرني اتصل بأحمد بكرة الساعة 4 قبل ساعة");
    expect(r.intentType).toBe("create_task");
    expect(r.reminderOffsetMinutes?.value).toBe(60);
  });

  it('"اجتماع بعد يومين الساعة 10 صباحا" → appointment two days out, 10:00', () => {
    const r = parse("اجتماع بعد يومين الساعة 10 صباحا");
    expect(r.intentType).toBe("create_appointment");
    expect(r.date?.value).toBe(dateKey(addDays(NOW, 2)));
    expect(r.time?.value).toBe("10:00");
  });

  it('"read 20 pages every day" → habit, count target 20 page, daily', () => {
    const r = parse("read 20 pages every day", "en");
    expect(r.intentType).toBe("create_habit");
    expect(r.countTarget?.value).toEqual({ value: 20, unit: "page" });
    expect(r.recurrence?.value.frequency).toBe("daily");
  });
});
