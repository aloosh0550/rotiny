import type { ParsedEntity } from "@/lib/types";
import type { MatchSpan } from "./normalize";
import { AR_LOCATION_KEYWORDS, AR_PERSON_NAMES } from "./lexicon.ar";
import { EN_LOCATION_KEYWORDS, EN_PERSON_NAMES } from "./lexicon.en";

export interface EntityExtractionResult {
  entities: ParsedEntity[];
  spans: MatchSpan[];
}

const KNOWN_NAMES = new Set([...AR_PERSON_NAMES, ...EN_PERSON_NAMES].map((n) => n.toLowerCase()));
const KNOWN_LOCATIONS = new Set([...AR_LOCATION_KEYWORDS, ...EN_LOCATION_KEYWORDS].map((n) => n.toLowerCase()));

function extractPerson(text: string): { entity: ParsedEntity; span: MatchSpan } | null {
  // "مع <name>" — captures one Arabic word or "مع with <name>" for English.
  const arRe = /مع\s+([؀-ۿ]+)/;
  const enRe = /\bwith\s+([a-zA-Z]+)/i;
  const match = arRe.exec(text) ?? enRe.exec(text);
  if (!match) return null;
  const name = match[1];
  const nameStart = match.index + match[0].lastIndexOf(name);
  const known = KNOWN_NAMES.has(name.toLowerCase());
  return {
    entity: {
      type: "person",
      value: name,
      sourceText: name,
      confidence: known ? 0.9 : 0.6,
    },
    span: { start: nameStart, end: nameStart + name.length },
  };
}

function extractLocation(text: string): { entity: ParsedEntity; span: MatchSpan } | null {
  const arRe = /في\s+([؀-ۿ]+(?:\s[؀-ۿ]+)?)/;
  const enRe = /\bat\s+the\s+([a-zA-Z]+)/i;
  const match = arRe.exec(text) ?? enRe.exec(text);
  if (!match) return null;
  const place = match[1];
  const placeStart = match.index + match[0].lastIndexOf(place);
  const known = KNOWN_LOCATIONS.has(place.toLowerCase());
  // "في" is heavily overloaded (in/at/during) — only report it as a location entity when the
  // captured word is a recognized place keyword, to avoid false positives like "في الخميس".
  if (!known) return null;
  return {
    entity: {
      type: "location",
      value: place,
      sourceText: place,
      confidence: 0.55,
    },
    span: { start: placeStart, end: placeStart + place.length },
  };
}

export function extractEntities(text: string): EntityExtractionResult {
  const entities: ParsedEntity[] = [];
  const spans: MatchSpan[] = [];

  const person = extractPerson(text);
  if (person) {
    entities.push(person.entity);
    spans.push(person.span);
  }

  const location = extractLocation(text);
  if (location) {
    entities.push(location.entity);
    spans.push(location.span);
  }

  return { entities, spans };
}
