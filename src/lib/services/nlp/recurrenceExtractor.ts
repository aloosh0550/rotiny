import type { RecurrenceRule } from "@/lib/types";
import type { ExtractedField } from "./dateTimeExtractor";
import type { MatchSpan } from "./normalize";
import { AR_WEEKDAYS } from "./lexicon.ar";
import { EN_WEEKDAYS } from "./lexicon.en";

const ALL_WEEKDAYS = { ...AR_WEEKDAYS, ...EN_WEEKDAYS };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function span(match: RegExpExecArray): MatchSpan {
  return { start: match.index, end: match.index + match[0].length };
}

function findWeekdaysIn(text: string): { dows: number[]; spans: MatchSpan[] } {
  const dows: number[] = [];
  const spans: MatchSpan[] = [];
  const names = Object.keys(ALL_WEEKDAYS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const re = new RegExp(`(?:^|\\s)(${escapeRegExp(name)})(?=\\s|$)`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index + m[0].indexOf(m[1]);
      const s = { start, end: start + m[1].length };
      const dow = ALL_WEEKDAYS[name];
      if (!dows.includes(dow)) {
        dows.push(dow);
        spans.push(s);
      }
    }
  }
  return { dows, spans };
}

export function extractRecurrence(text: string): ExtractedField<RecurrenceRule> | undefined {
  // "every other week" / "كل أسبوعين" (dual form = 2, no explicit digit)
  const dualAr = /كل\s+(يومين|أسبوعين|اسبوعين)/;
  const dualMatch = dualAr.exec(text);
  if (dualMatch) {
    const isWeek = dualMatch[1].includes("أسبوع") || dualMatch[1].includes("اسبوع");
    const rule: RecurrenceRule = { frequency: isWeek ? "weekly" : "daily", interval: 2 };
    return { value: rule, confidence: 0.85, span: span(dualMatch), sourceText: dualMatch[0] };
  }

  // "every N days/weeks" / "كل N يوم/أيام/أسبوع/أسابيع"
  const numericAr = /كل\s+(\d+)\s*(يوم|أيام|اسبوع|أسبوع|اسابيع|أسابيع)/;
  const numericEn = /every\s+(\d+)\s*(day|days|week|weeks)/i;
  let m = numericAr.exec(text) ?? numericEn.exec(text);
  if (m) {
    const interval = Number(m[1]);
    const unit = m[2].toLowerCase();
    const isWeek = unit.includes("اسبوع") || unit.includes("أسبوع") || unit.includes("week");
    const rule: RecurrenceRule = { frequency: isWeek ? "weekly" : "daily", interval };
    return { value: rule, confidence: 0.85, span: span(m), sourceText: m[0] };
  }

  // "every <weekday>" / "كل <weekday>"
  const everyWeekdayAr = /كل\s+([؀-ۿ]+)/;
  const everyWeekdayEn = /every\s+(\w+)/i;
  m = everyWeekdayAr.exec(text) ?? everyWeekdayEn.exec(text);
  if (m) {
    const word = m[1].toLowerCase();
    const dow = ALL_WEEKDAYS[word] ?? ALL_WEEKDAYS[m[1]];
    if (dow !== undefined) {
      const rule: RecurrenceRule = { frequency: "weekly", interval: 1, byWeekday: [dow] };
      return { value: rule, confidence: 0.9, span: span(m), sourceText: m[0] };
    }
  }

  // Bare daily marker: "كل يوم" / "يوميا" / "يومياً" / "daily" / "every day"
  const dailyRe = /(كل\s+يوم|يوميا|يومياً|daily|every day)/i;
  m = dailyRe.exec(text);
  if (m) {
    const rule: RecurrenceRule = { frequency: "daily", interval: 1 };
    return { value: rule, confidence: 0.9, span: span(m), sourceText: m[0] };
  }

  // Bare weekly marker: "أسبوعيا" / "اسبوعيا" / "weekly" / "every week"
  const weeklyRe = /(أسبوعيا|اسبوعيا|أسبوعياً|weekly|every week)/i;
  m = weeklyRe.exec(text);
  if (m) {
    const rule: RecurrenceRule = { frequency: "weekly", interval: 1 };
    return { value: rule, confidence: 0.85, span: span(m), sourceText: m[0] };
  }

  // Day conjunction ("الاثنين والأربعاء" / "Mon and Wed") — only counts as recurrence when
  // at least two distinct weekdays are mentioned together; a single weekday elsewhere in the
  // text (e.g. "meeting Thursday") is a one-off date, not a recurrence, and is left alone.
  const { dows, spans } = findWeekdaysIn(text);
  if (dows.length >= 2) {
    const rule: RecurrenceRule = { frequency: "weekly", interval: 1, byWeekday: dows.sort() };
    const start = Math.min(...spans.map((s) => s.start));
    const end = Math.max(...spans.map((s) => s.end));
    return { value: rule, confidence: 0.8, span: { start, end }, sourceText: text.slice(start, end) };
  }

  return undefined;
}
