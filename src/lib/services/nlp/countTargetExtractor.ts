import type { MatchSpan } from "./normalize";
import type { ExtractedField } from "./dateTimeExtractor";
import { WB_END } from "./wordBoundary";

/** Countable units that make sense as a daily habit target. */
const AR_UNITS: { pattern: string; unit: string }[] = [
  { pattern: "كوب|أكواب|اكواب|كاسة|كاسات", unit: "كوب" },
  { pattern: "صفحة|صفحات|صفحه", unit: "صفحة" },
  { pattern: "مرة|مرات|مره", unit: "مرة" },
  { pattern: "ركعة|ركعات|ركعه", unit: "ركعة" },
  { pattern: "خطوة|خطوات", unit: "خطوة" },
  { pattern: "آية|آيات|ايه|ايات", unit: "آية" },
];

const EN_UNITS: { pattern: string; unit: string }[] = [
  { pattern: "glass(?:es)?|cups?", unit: "glass" },
  { pattern: "pages?", unit: "page" },
  { pattern: "times?", unit: "time" },
  { pattern: "steps?", unit: "step" },
];

export interface CountTarget {
  value: number;
  unit: string;
}

/**
 * "اشرب 8 أكواب ماء" / "read 20 pages" → { value: 8, unit: "كوب" }. Extracted before
 * time so the number is not misread as an hour.
 */
export function extractCountTarget(text: string): ExtractedField<CountTarget> | undefined {
  for (const { pattern, unit } of [...AR_UNITS, ...EN_UNITS]) {
    const re = new RegExp(`\\b(\\d{1,3})\\s*(${pattern})${WB_END}`, "iu");
    const m = re.exec(text);
    if (m) {
      const value = Number(m[1]);
      if (!Number.isFinite(value) || value < 1 || value > 999) continue;
      const span: MatchSpan = { start: m.index, end: m.index + m[0].length };
      return { value: { value, unit }, confidence: 0.9, span, sourceText: m[0] };
    }
  }
  return undefined;
}
