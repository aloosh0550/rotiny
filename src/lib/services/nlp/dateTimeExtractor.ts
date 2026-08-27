import { addDays, dateKey } from "@/lib/time/dateUtils";
import type { MatchSpan } from "./normalize";
import {
  AR_RELATIVE_DAYS,
  AR_TIME_QUALIFIERS,
  AR_WEEKDAYS,
  type TimeQualifier,
} from "./lexicon.ar";
import { EN_RELATIVE_DAYS, EN_TIME_QUALIFIERS, EN_WEEKDAYS } from "./lexicon.en";
import { WB_END } from "./wordBoundary";

export interface ExtractedField<T> {
  value: T;
  confidence: number;
  span: MatchSpan;
  sourceText: string;
}

export interface DateTimeExtraction {
  date?: ExtractedField<string>;
  time?: ExtractedField<string>;
}

function byLengthDesc(keys: string[]): string[] {
  return [...keys].sort((a, b) => b.length - a.length);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Finds the first (leftmost, then longest) match among a set of literal phrases. */
function findFirstPhrase(
  text: string,
  phrases: string[],
): { phrase: string; span: MatchSpan } | null {
  const ordered = byLengthDesc(phrases);
  let best: { phrase: string; span: MatchSpan } | null = null;
  for (const phrase of ordered) {
    const re = new RegExp(`(?:^|\\s)(${escapeRegExp(phrase)})(?=\\s|$)`, "i");
    const match = re.exec(text);
    if (match && match[1]) {
      const start = match.index + match[0].indexOf(match[1]);
      const span = { start, end: start + match[1].length };
      if (!best || span.start < best.span.start) best = { phrase, span };
    }
  }
  return best;
}

function extractRelativeDate(text: string, now: Date): { date: Date; span: MatchSpan } | null {
  const combined = { ...AR_RELATIVE_DAYS, ...EN_RELATIVE_DAYS };
  const found = findFirstPhrase(text, Object.keys(combined));
  if (!found) return null;
  const offset = combined[found.phrase];
  return { date: addDays(now, offset), span: found.span };
}

function extractWeekday(text: string, now: Date): { date: Date; span: MatchSpan } | null {
  const combined = { ...AR_WEEKDAYS, ...EN_WEEKDAYS };
  const found = findFirstPhrase(text, Object.keys(combined));
  if (!found) return null;
  const targetDow = combined[found.phrase];
  const todayDow = now.getDay();
  const offset = (targetDow - todayDow + 7) % 7;
  return { date: addDays(now, offset), span: found.span };
}

function extractExplicitDate(text: string): { date: Date; span: MatchSpan } | null {
  // DD/MM or DD-MM (optionally /YYYY) — day-first, matching common Arabic/English casual usage.
  const re = /\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\b/;
  const match = re.exec(text);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const now = new Date();
  let year = match[3] ? Number(match[3]) : now.getFullYear();
  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day);
  if (!match[3] && date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    date.setFullYear(year + 1);
  }
  return { date, span: { start: match.index, end: match.index + match[0].length } };
}

export function extractDate(text: string, now: Date): ExtractedField<string> | undefined {
  const relative = extractRelativeDate(text, now);
  if (relative) {
    return {
      value: dateKey(relative.date),
      confidence: 0.95,
      span: relative.span,
      sourceText: text.slice(relative.span.start, relative.span.end),
    };
  }
  const explicit = extractExplicitDate(text);
  if (explicit) {
    return {
      value: dateKey(explicit.date),
      confidence: 0.9,
      span: explicit.span,
      sourceText: text.slice(explicit.span.start, explicit.span.end),
    };
  }
  const weekday = extractWeekday(text, now);
  if (weekday) {
    return {
      value: dateKey(weekday.date),
      confidence: 0.9,
      span: weekday.span,
      sourceText: text.slice(weekday.span.start, weekday.span.end),
    };
  }
  return undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toTimeValue(hour: number, minute: number): string {
  const h = ((hour % 24) + 24) % 24;
  return `${pad2(h)}:${pad2(minute)}`;
}

const AR_MERIDIEM_PM = ["م", "مساء", "مساءً", "مساءا"];
const AR_MERIDIEM_AM = ["ص", "صباح", "صباحاً", "صباحا"];
const MERIDIEM_ALT = [...AR_MERIDIEM_PM, ...AR_MERIDIEM_AM, "am", "pm", "a.m.", "p.m."]
  .map(escapeRegExp)
  .join("|");

interface RawTimeMatch {
  hour: number;
  minute: number;
  span: MatchSpan;
  /** True when the source text itself pinned AM/PM (an explicit meridiem word, or an
   * hour value >12 / a bare 0 that's only meaningful in 24h notation) — no heuristic needed. */
  resolved: boolean;
}

function meridiemToOffset(word: string, hour: number): number {
  const w = word.toLowerCase();
  const isPm = AR_MERIDIEM_PM.includes(w) || w.startsWith("p");
  if (isPm && hour < 12) return hour + 12;
  if (!isPm && hour === 12) return 0;
  return hour;
}

function extractRawTime(text: string): RawTimeMatch | null {
  const hm = new RegExp(`\\b(\\d{1,2})[:.](\\d{2})\\s*(${MERIDIEM_ALT})?${WB_END}`, "iu");
  let match = hm.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const span = { start: match.index, end: match.index + match[0].length };
    if (match[3]) return { hour: meridiemToOffset(match[3], hour), minute, span, resolved: true };
    if (hour > 12 || hour === 0) return { hour, minute, span, resolved: true };
    return { hour, minute, span, resolved: false };
  }

  const arHour = /الساعة\s*(\d{1,2})\b/;
  match = arHour.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const span = { start: match.index, end: match.index + match[0].length };
    return { hour, minute: 0, span, resolved: hour > 12 || hour === 0 };
  }

  const half = new RegExp(`\\b(\\d{1,2})\\s*(?:و\\s*نص)${WB_END}`, "u");
  match = half.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const span = { start: match.index, end: match.index + match[0].length };
    return { hour, minute: 30, span, resolved: hour > 12 };
  }
  const quarter = new RegExp(`\\b(\\d{1,2})\\s*(?:و\\s*ربع)${WB_END}`, "u");
  match = quarter.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const span = { start: match.index, end: match.index + match[0].length };
    return { hour, minute: 15, span, resolved: hour > 12 };
  }
  const lessQuarter = new RegExp(`\\b(\\d{1,2})\\s*(?:الا|إلا)\\s*ربع${WB_END}`, "u");
  match = lessQuarter.exec(text);
  if (match) {
    const hour = Number(match[1]) - 1;
    const span = { start: match.index, end: match.index + match[0].length };
    return { hour, minute: 45, span, resolved: hour > 12 };
  }

  const bareWithMeridiem = new RegExp(`\\b(\\d{1,2})\\s*(${MERIDIEM_ALT})${WB_END}`, "iu");
  match = bareWithMeridiem.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const span = { start: match.index, end: match.index + match[0].length };
    return { hour: meridiemToOffset(match[2], hour), minute: 0, span, resolved: true };
  }

  const at = new RegExp(`\\bat\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(${MERIDIEM_ALT})?${WB_END}`, "iu");
  match = at.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    const span = { start: match.index, end: match.index + match[0].length };
    if (match[3]) return { hour: meridiemToOffset(match[3], hour), minute, span, resolved: true };
    return { hour, minute, span, resolved: hour > 12 || hour === 0 };
  }

  return null;
}

function extractQualifierTime(text: string): { qualifier: TimeQualifier; span: MatchSpan } | null {
  const combined = { ...AR_TIME_QUALIFIERS, ...EN_TIME_QUALIFIERS };
  const found = findFirstPhrase(text, Object.keys(combined));
  if (!found) return null;
  return { qualifier: combined[found.phrase], span: found.span };
}

const MERIDIEM_AMBIGUOUS_HOUR = 7;

/** Resolves a 1-12 hour with no pinned meridiem using a casual-speech heuristic:
 * 8-11 reads as morning, 1-6 and 12 read as afternoon/evening — matching how these
 * hours are most often meant when someone drops the AM/PM in everyday Arabic/English. */
function resolveAmbiguousHour(hour: number): number | "ambiguous" {
  if (hour === MERIDIEM_AMBIGUOUS_HOUR) return "ambiguous";
  if (hour >= 8 && hour <= 11) return hour;
  if (hour === 12) return 12;
  return hour + 12;
}

export interface BareNumberContext {
  /** Spans already consumed by other extractors (date, duration, recurrence) — a bare number inside one of these must be ignored. */
  excludedSpans: MatchSpan[];
}

export function extractTime(
  text: string,
  context: BareNumberContext,
): { field?: ExtractedField<string>; ambiguousHour?: number } {
  const raw = extractRawTime(text);
  if (raw) {
    if (raw.resolved) {
      return {
        field: {
          value: toTimeValue(raw.hour, raw.minute),
          confidence: 0.92,
          span: raw.span,
          sourceText: text.slice(raw.span.start, raw.span.end),
        },
      };
    }
    const resolvedHour = resolveAmbiguousHour(raw.hour);
    if (resolvedHour === "ambiguous") {
      return { ambiguousHour: raw.hour };
    }
    return {
      field: {
        value: toTimeValue(resolvedHour, raw.minute),
        confidence: 0.65,
        span: raw.span,
        sourceText: text.slice(raw.span.start, raw.span.end),
      },
    };
  }

  const qualifier = extractQualifierTime(text);
  if (qualifier) {
    return {
      field: {
        value: toTimeValue(qualifier.qualifier.hour, qualifier.qualifier.minute),
        confidence: 0.5,
        span: qualifier.span,
        sourceText: text.slice(qualifier.span.start, qualifier.span.end),
      },
    };
  }

  // Bare trailing number heuristic (e.g. "اتصل بأحمد بكرة 10" / "call Ahmad tomorrow 10").
  const bareNumberRe = /(?<![:.\d])\b(\d{1,2})\b(?![:.\d])/g;
  let match: RegExpExecArray | null;
  while ((match = bareNumberRe.exec(text))) {
    const span = { start: match.index, end: match.index + match[0].length };
    const overlapsExcluded = context.excludedSpans.some((s) => span.start < s.end && span.end > s.start);
    if (overlapsExcluded) continue;
    const hour = Number(match[1]);
    if (hour < 1 || hour > 12) continue;

    const resolvedHour = resolveAmbiguousHour(hour);
    if (resolvedHour === "ambiguous") {
      return { ambiguousHour: hour };
    }
    return {
      field: {
        value: toTimeValue(resolvedHour, 0),
        confidence: 0.6,
        span,
        sourceText: match[0],
      },
    };
  }

  return {};
}
