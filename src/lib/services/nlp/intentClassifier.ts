import type { IntentType } from "@/lib/types";
import {
  AR_APPOINTMENT_CUES,
  AR_HABIT_ACTION_VERBS,
  AR_HABIT_DESIRE_VERBS,
  AR_SEARCH_QUESTION_WORDS,
  AR_TASK_VERBS,
} from "./lexicon.ar";
import {
  EN_APPOINTMENT_CUES,
  EN_HABIT_ACTION_VERBS,
  EN_HABIT_DESIRE_VERBS,
  EN_SEARCH_QUESTION_WORDS,
  EN_TASK_VERBS,
} from "./lexicon.en";

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w.toLowerCase()));
}

export interface ClassifierInput {
  hasRecurrence: boolean;
  hasPersonEntity: boolean;
  hasDateOrTime: boolean;
}

export interface ClassifierResult {
  intentType: IntentType;
  confidence: number;
  ambiguous: boolean;
}

const APPOINTMENT_CUES = [...AR_APPOINTMENT_CUES, ...EN_APPOINTMENT_CUES];
const TASK_VERBS = [...AR_TASK_VERBS, ...EN_TASK_VERBS];
const HABIT_DESIRE_VERBS = [...AR_HABIT_DESIRE_VERBS, ...EN_HABIT_DESIRE_VERBS];
const HABIT_ACTION_VERBS = [...AR_HABIT_ACTION_VERBS, ...EN_HABIT_ACTION_VERBS];
const SEARCH_QUESTION_WORDS = [...AR_SEARCH_QUESTION_WORDS, ...EN_SEARCH_QUESTION_WORDS];

export function classifyIntent(normalizedText: string, input: ClassifierInput): ClassifierResult {
  const text = normalizedText.toLowerCase();

  let appointment = 0;
  let task = 0;
  let habit = 0;
  let search = 0;

  if (includesAny(text, APPOINTMENT_CUES)) appointment += 3;
  if (input.hasPersonEntity && input.hasDateOrTime) appointment += 1.5;

  if (includesAny(text, TASK_VERBS)) task += 3;
  task += 0.5; // default fallback bias — an unrecognized imperative is most often a task

  if (includesAny(text, HABIT_DESIRE_VERBS) && input.hasRecurrence) habit += 3.5;
  else if (includesAny(text, HABIT_DESIRE_VERBS) && includesAny(text, HABIT_ACTION_VERBS)) habit += 2.5;
  else if (input.hasRecurrence && includesAny(text, HABIT_ACTION_VERBS)) habit += 2;
  else if (input.hasRecurrence) habit += 1;

  if (includesAny(text, SEARCH_QUESTION_WORDS)) search += 3;

  const scores: Record<IntentType, number> = {
    create_appointment: appointment,
    create_task: task,
    create_habit: habit,
    search_query: search,
    unknown: 0,
  };

  const entries = (Object.entries(scores) as [IntentType, number][]).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = entries[0];
  const [, secondScore] = entries[1];

  if (topScore === 0) {
    return { intentType: "unknown", confidence: 0, ambiguous: true };
  }

  const margin = topScore - secondScore;
  const confidence = Math.min(0.95, 0.55 + margin * 0.15);
  // Only a real competing signal (not just the task bucket's always-on default bias against
  // total silence elsewhere) counts as ambiguity — otherwise "task" winning by default would
  // spuriously prompt a clarification every time nothing else matched at all.
  const ambiguous = margin < 1 && secondScore > 0;

  return { intentType: topType, confidence, ambiguous };
}
