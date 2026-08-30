import type {
  ClarificationQuestion,
  IIntentParser,
  Locale,
  ParsedIntent,
} from "@/lib/types";
import { normalizeText, removeSpans, type MatchSpan } from "./normalize";
import { extractDate, extractTime } from "./dateTimeExtractor";
import { extractDuration } from "./durationExtractor";
import { extractRecurrence } from "./recurrenceExtractor";
import { extractPriority } from "./priorityExtractor";
import { extractEntities } from "./entityExtractor";
import { extractCountTarget } from "./countTargetExtractor";
import { classifyIntent } from "./intentClassifier";
import { AR_HABIT_DESIRE_VERBS, AR_REMINDER_CUES } from "./lexicon.ar";
import { EN_HABIT_DESIRE_VERBS, EN_REMINDER_CUES } from "./lexicon.en";

const REMINDER_CUES = [...AR_REMINDER_CUES, ...EN_REMINDER_CUES].sort((a, b) => b.length - a.length);

function findReminderCueSpan(text: string): MatchSpan | undefined {
  for (const cue of REMINDER_CUES) {
    const esc = cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\s)(${esc})(?=\\s|$)`, "i");
    const m = re.exec(text);
    if (m && m[1]) {
      const start = m.index + m[0].indexOf(m[1]);
      return { start, end: start + m[1].length };
    }
  }
  return undefined;
}

/** "ذكرني قبل ساعة" / "remind me 10 minutes before" → minutes before the item. */
function extractReminderOffset(text: string): number | undefined {
  const before = /(?:قبل|before)\s+([^\s،.]+(?:\s+[^\s،.]+)?)/i.exec(text);
  if (!before) return undefined;
  const phrase = before[1].toLowerCase();
  if (/^(ساعة|hour|an hour)/.test(phrase)) return 60;
  if (/(نص|نصف|half)/.test(phrase)) return 30;
  const num = /(\d{1,3})/.exec(phrase);
  if (!num) return undefined;
  const n = Number(num[1]);
  if (/(ساعة|ساعات|hour|hr)/.test(phrase)) return n * 60;
  if (/(دقيقة|دقائق|دقايق|min)/.test(phrase)) return n;
  return undefined;
}

const FILLER_PHRASES = [...AR_HABIT_DESIRE_VERBS, ...EN_HABIT_DESIRE_VERBS].sort((a, b) => b.length - a.length);

/** "أبغى أمشي..." -> the desire verb itself is never part of a meaningful habit title. */
function findFillerSpan(text: string): MatchSpan | undefined {
  for (const phrase of FILLER_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\s)(${escaped})(?=\\s|$)`, "i");
    const match = re.exec(text);
    if (match && match[1]) {
      const start = match.index + match[0].indexOf(match[1]);
      return { start, end: start + match[1].length };
    }
  }
  return undefined;
}

export class RuleBasedIntentParser implements IIntentParser {
  parse(rawText: string, context?: { now?: Date; locale?: Locale }): ParsedIntent {
    const now = context?.now ?? new Date();
    const locale = context?.locale ?? "ar";
    const text = normalizeText(rawText);

    const date = extractDate(text, now);
    const duration = extractDuration(text);
    const recurrence = extractRecurrence(text);
    const countTarget = extractCountTarget(text);
    const reminderCueSpan = findReminderCueSpan(text);
    const reminderOffset = reminderCueSpan ? extractReminderOffset(text) : undefined;

    const excludedSpans: MatchSpan[] = [
      date?.span,
      duration?.span,
      recurrence?.span,
      countTarget?.span,
    ].filter((s): s is MatchSpan => !!s);
    const { field: time, ambiguousHour } = extractTime(text, { excludedSpans });

    const priority = extractPriority(text);
    const { entities, spans: entitySpans } = extractEntities(text);

    const classification = classifyIntent(text, {
      hasRecurrence: !!recurrence,
      hasPersonEntity: entities.some((e) => e.type === "person"),
      hasDateOrTime: !!(date || time),
    });

    // A "remind me to …" phrase is a strong task signal — override a weak guess.
    if (reminderCueSpan && (classification.intentType === "unknown" || classification.ambiguous)) {
      classification.intentType = "create_task";
      classification.ambiguous = false;
      classification.confidence = Math.max(classification.confidence, 0.75);
    }

    const clarifications: ClarificationQuestion[] = [];

    if (classification.ambiguous && classification.intentType !== "unknown") {
      clarifications.push({
        field: "intent",
        question:
          locale === "ar"
            ? "هل تقصد إضافة موعد، مهمة، أم عادة؟"
            : "Did you mean to add an appointment, a task, or a habit?",
        options: [
          { label: locale === "ar" ? "موعد" : "Appointment", value: "create_appointment" },
          { label: locale === "ar" ? "مهمة" : "Task", value: "create_task" },
          { label: locale === "ar" ? "عادة" : "Habit", value: "create_habit" },
        ],
      });
    }

    if (ambiguousHour !== undefined) {
      clarifications.push({
        field: "time",
        question:
          locale === "ar"
            ? `الساعة ${ambiguousHour} صباحًا أم مساءً؟`
            : `Is ${ambiguousHour} o'clock AM or PM?`,
        options: [
          { label: locale === "ar" ? "صباحًا" : "AM", value: `${String(ambiguousHour).padStart(2, "0")}:00` },
          {
            label: locale === "ar" ? "مساءً" : "PM",
            value: `${String(ambiguousHour + 12).padStart(2, "0")}:00`,
          },
        ],
      });
    }

    const fillerSpan =
      classification.intentType === "create_habit" ? findFillerSpan(text) : undefined;

    const strippedSpans: MatchSpan[] = [
      date?.span,
      time?.span,
      duration?.span,
      recurrence?.span,
      countTarget?.span,
      reminderCueSpan,
      priority.span.end > priority.span.start ? priority.span : undefined,
      fillerSpan,
    ].filter((s): s is MatchSpan => !!s);

    // Entity spans stay in the title (e.g. "اجتماع مع أحمد" keeps "أحمد") — only strip
    // date/time/duration/recurrence/priority spans, per spec.
    const titleText = removeSpans(text, strippedSpans) || text;

    const intent: ParsedIntent = {
      intentType: classification.intentType,
      confidence: classification.confidence,
      title: { value: titleText, confidence: classification.ambiguous ? 0.6 : 0.85 },
      entities,
      clarifications,
      rawText,
      locale,
    };

    if (date) intent.date = { value: date.value, confidence: date.confidence, sourceText: date.sourceText };
    if (time) intent.time = { value: time.value, confidence: time.confidence, sourceText: time.sourceText };
    if (duration)
      intent.durationMinutes = {
        value: duration.value,
        confidence: duration.confidence,
        sourceText: duration.sourceText,
      };
    if (recurrence)
      intent.recurrence = {
        value: recurrence.value,
        confidence: recurrence.confidence,
        sourceText: recurrence.sourceText,
      };
    if (classification.intentType === "create_task" || classification.intentType === "create_habit") {
      intent.priority = { value: priority.value, confidence: priority.confidence, sourceText: priority.sourceText };
    }
    if (countTarget) {
      intent.countTarget = {
        value: countTarget.value,
        confidence: countTarget.confidence,
        sourceText: countTarget.sourceText,
      };
    }
    if (reminderOffset !== undefined) {
      intent.reminderOffsetMinutes = { value: reminderOffset, confidence: 0.8 };
    }

    void entitySpans; // kept for symmetry with other extractors' span bookkeeping; entities aren't stripped from the title
    return intent;
  }
}

export const ruleBasedIntentParser = new RuleBasedIntentParser();
