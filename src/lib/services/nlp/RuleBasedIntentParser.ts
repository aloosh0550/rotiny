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
import { classifyIntent } from "./intentClassifier";
import { AR_HABIT_DESIRE_VERBS } from "./lexicon.ar";
import { EN_HABIT_DESIRE_VERBS } from "./lexicon.en";

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

    const excludedSpans: MatchSpan[] = [date?.span, duration?.span, recurrence?.span].filter(
      (s): s is MatchSpan => !!s,
    );
    const { field: time, ambiguousHour } = extractTime(text, { excludedSpans });

    const priority = extractPriority(text);
    const { entities, spans: entitySpans } = extractEntities(text);

    const classification = classifyIntent(text, {
      hasRecurrence: !!recurrence,
      hasPersonEntity: entities.some((e) => e.type === "person"),
      hasDateOrTime: !!(date || time),
    });

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

    void entitySpans; // kept for symmetry with other extractors' span bookkeeping; entities aren't stripped from the title
    return intent;
  }
}

export const ruleBasedIntentParser = new RuleBasedIntentParser();
