import type { ExtractedField } from "./dateTimeExtractor";
import type { MatchSpan } from "./normalize";
import { WB_END } from "./wordBoundary";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HALF_HOUR_PHRASES = ["نص ساعة", "نصف ساعة", "half an hour", "half hour"];
const HOUR_DUAL_PHRASES = ["ساعتين"];
const HOUR_WORDS = ["ساعة", "ساعات", "hour", "hours", "hr", "hrs"];
const MINUTE_WORDS = ["دقيقة", "دقايق", "دقائق", "minute", "minutes", "min", "mins"];

function findPhrase(text: string, phrases: string[]): MatchSpan | null {
  for (const phrase of phrases) {
    const re = new RegExp(`(?:^|\\s)(${escapeRegExp(phrase)})(?=\\s|$)`, "i");
    const match = re.exec(text);
    if (match && match[1]) {
      const start = match.index + match[0].indexOf(match[1]);
      return { start, end: start + match[1].length };
    }
  }
  return null;
}

export function extractDuration(text: string): ExtractedField<number> | undefined {
  const half = findPhrase(text, HALF_HOUR_PHRASES);
  if (half) {
    return { value: 30, confidence: 0.9, span: half, sourceText: text.slice(half.start, half.end) };
  }

  const dual = findPhrase(text, HOUR_DUAL_PHRASES);
  if (dual) {
    return { value: 120, confidence: 0.9, span: dual, sourceText: text.slice(dual.start, dual.end) };
  }

  const unitAlt = [...HOUR_WORDS, ...MINUTE_WORDS].map(escapeRegExp).join("|");
  const re = new RegExp(`\\b(\\d{1,3})\\s*(${unitAlt})${WB_END}`, "iu");
  const match = re.exec(text);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const isHour = HOUR_WORDS.some((w) => w.toLowerCase() === unit);
    const minutes = isHour ? amount * 60 : amount;
    const span = { start: match.index, end: match.index + match[0].length };
    return { value: minutes, confidence: 0.9, span, sourceText: match[0] };
  }

  // Bare "ساعة"/"hour" with no explicit number means one hour.
  const bareHour = findPhrase(text, ["ساعة", "hour"]);
  if (bareHour) {
    return { value: 60, confidence: 0.75, span: bareHour, sourceText: text.slice(bareHour.start, bareHour.end) };
  }

  return undefined;
}
