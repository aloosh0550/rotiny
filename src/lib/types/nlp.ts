import type { Priority, RecurrenceRule } from "./shared";
import type { Locale } from "./settings";

export type IntentType =
  | "create_appointment"
  | "create_task"
  | "create_habit"
  | "search_query"
  | "unknown";

export interface ParsedField<T> {
  value: T;
  confidence: number; // 0..1
  sourceText?: string;
}

export type EntityKind = "person" | "location";

export interface ParsedEntity {
  type: EntityKind;
  value: string;
  sourceText: string;
  confidence: number;
}

export type ClarificationField =
  | "intent"
  | "date"
  | "time"
  | "priority"
  | "duration"
  | "recurrence";

export interface ClarificationOption {
  label: string;
  value: unknown;
}

export interface ClarificationQuestion {
  field: ClarificationField;
  question: string;
  options?: ClarificationOption[];
}

export interface ParsedIntent {
  intentType: IntentType;
  confidence: number;
  title: ParsedField<string>;
  date?: ParsedField<string>;
  time?: ParsedField<string>;
  durationMinutes?: ParsedField<number>;
  recurrence?: ParsedField<RecurrenceRule>;
  priority?: ParsedField<Priority>;
  /** Habit count target, e.g. "8 أكواب" → { value: 8, unit: "كوب" }. */
  countTarget?: ParsedField<{ value: number; unit: string }>;
  /** "ذكرني قبل ساعة" → 60. Minutes before the item's time. */
  reminderOffsetMinutes?: ParsedField<number>;
  entities: ParsedEntity[];
  clarifications: ClarificationQuestion[];
  rawText: string;
  locale: Locale;
}

export interface SearchFilter {
  text?: string;
  entity?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface IIntentParser {
  parse(text: string, context?: { now?: Date; locale?: Locale }): ParsedIntent;
}
