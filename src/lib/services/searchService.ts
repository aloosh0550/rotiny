import {
  adhkarRepository,
  appointmentsRepository,
  habitsRepository,
  tasksRepository,
} from "@/lib/db/repositories";
import type { Appointment, Dhikr, Habit, SearchFilter, Task } from "@/lib/types";

export interface SearchResults {
  appointments: Appointment[];
  tasks: Task[];
  habits: Habit[];
  adhkar: Dhikr[];
}

const EMPTY_RESULTS: SearchResults = {
  appointments: [],
  tasks: [],
  habits: [],
  adhkar: [],
};

// Arabic combining diacritics (tashkeel/harakat, U+064B-U+065F, U+0670, U+06D6-U+06ED) —
// stripped so e.g. a fully-vocalized "Ahmad" still matches an unvocalized query.
const ARABIC_DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;

function normalize(value: string): string {
  return value.toLowerCase().replace(ARABIC_DIACRITICS, "");
}

function matchesAny(haystacks: Array<string | null | undefined>, needle: string): boolean {
  return haystacks.some((h) => !!h && normalize(h).includes(needle));
}

/**
 * Parses a raw search box query into a {@link SearchFilter}.
 *
 * NOTE — placeholder for now. This pass only ships plain substring search, so it
 * just carries the trimmed raw text through as `filter.text`. A later project phase
 * introduces a proper rule-based Arabic/English NLP parser (see `IIntentParser` in
 * `@/lib/types/nlp`) that will populate `entity`/`dateRangeStart`/`dateRangeEnd` from
 * phrases like "who am I meeting this week?". Swapping that parser in only requires
 * changing this function's body — callers (the search page) don't need to change,
 * they already handle a filter that carries those fields.
 */
export function parseSearchFilter(query: string): SearchFilter {
  return { text: query.trim() };
}

/**
 * Runs the actual search against local data. Case-insensitive, diacritic-tolerant
 * substring match across all four entity types. Fetches everything in parallel and
 * filters client-side — fine at personal-app data scale, no search index needed.
 *
 * An empty (or whitespace-only) `filter.text` intentionally returns empty result
 * sets rather than "everything", since the search page treats an empty query as its
 * own calm empty state, not a browse-all view.
 */
export async function search(filter: SearchFilter): Promise<SearchResults> {
  const text = filter.text?.trim();
  if (!text) return EMPTY_RESULTS;

  const needle = normalize(text);

  const [appointments, tasks, habits, adhkar] = await Promise.all([
    appointmentsRepository.getAll(),
    tasksRepository.getAll(),
    habitsRepository.getAll(),
    adhkarRepository.getAll(),
  ]);

  return {
    appointments: appointments.filter((a) =>
      matchesAny([a.title, a.notes, a.location, ...(a.participants ?? [])], needle),
    ),
    tasks: tasks.filter((t) => matchesAny([t.title, t.notes], needle)),
    habits: habits.filter((h) => matchesAny([h.title, h.notes], needle)),
    adhkar: adhkar.filter((d) => matchesAny([d.text, d.transliteration, d.translation], needle)),
  };
}
