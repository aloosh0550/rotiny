const EASTERN_ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * Light, position-friendly normalization: converts Eastern Arabic-Indic digits to ASCII,
 * lowercases Latin characters, and collapses whitespace. Deliberately does NOT strip
 * diacritics or unify alef/teh-marbuta forms — extractors match against this text directly
 * and the same string is used to build the cleaned-up title, so keeping it close to what
 * the user actually typed matters more than aggressive canonicalization.
 */
export function normalizeText(text: string): string {
  let result = "";
  for (const ch of text) {
    const digitIndex = EASTERN_ARABIC_DIGITS.indexOf(ch);
    result += digitIndex >= 0 ? String(digitIndex) : ch.toLowerCase();
  }
  return result.replace(/\s+/g, " ").trim();
}

export interface MatchSpan {
  start: number;
  end: number;
}

/** Removes the given spans (in ascending, non-overlapping order) from text, collapsing whitespace. */
export function removeSpans(text: string, spans: MatchSpan[]): string {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  for (const span of sorted) {
    if (span.start < cursor) continue;
    result += text.slice(cursor, span.start);
    cursor = span.end;
  }
  result += text.slice(cursor);
  return result.replace(/\s+/g, " ").trim();
}
