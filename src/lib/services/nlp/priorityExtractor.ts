import type { Priority } from "@/lib/types";
import type { ExtractedField } from "./dateTimeExtractor";
import { AR_PRIORITY_IMPORTANT, AR_PRIORITY_LATER } from "./lexicon.ar";
import { EN_PRIORITY_IMPORTANT, EN_PRIORITY_LATER } from "./lexicon.en";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhrase(text: string, phrases: string[]) {
  for (const phrase of phrases) {
    const re = new RegExp(`(?:^|\\s)(${escapeRegExp(phrase)})(?=\\s|$)`, "i");
    const match = re.exec(text);
    if (match && match[1]) {
      const start = match.index + match[0].indexOf(match[1]);
      return { span: { start, end: start + match[1].length }, text: match[1] };
    }
  }
  return null;
}

/** Always returns a field — an unmatched priority is a real default ("normal"), not a missing detection. */
export function extractPriority(text: string): ExtractedField<Priority> {
  const important = findPhrase(text, [...AR_PRIORITY_IMPORTANT, ...EN_PRIORITY_IMPORTANT]);
  if (important) {
    return { value: "important", confidence: 0.9, span: important.span, sourceText: important.text };
  }
  const later = findPhrase(text, [...AR_PRIORITY_LATER, ...EN_PRIORITY_LATER]);
  if (later) {
    return { value: "later", confidence: 0.85, span: later.span, sourceText: later.text };
  }
  return { value: "normal", confidence: 1, span: { start: 0, end: 0 }, sourceText: "" };
}
