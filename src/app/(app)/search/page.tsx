"use client";

import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchResultsSection } from "@/components/search/SearchResultsSection";
import { NLFilterChip } from "@/components/search/NLFilterChip";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { useDhikrCategories } from "@/lib/hooks/useAdhkar";
import { parseSearchFilter, search, type SearchResults } from "@/lib/services/searchService";

const EMPTY_RESULTS: SearchResults = { appointments: [], tasks: [], habits: [], adhkar: [] };

export default function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 250);

  // Seed from a `?q=` deep link (Smart Add search, widget) without needing a
  // Suspense boundary for useSearchParams under static export.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setQuery(q);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  const categories = useDhikrCategories();

  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  // The query text that `results` was computed for — lets render derive "still
  // searching" by comparison instead of a separate flag set synchronously in the
  // effect (React's set-state-in-effect rule wants setState to happen only from an
  // async callback, i.e. once the external work — the search — actually finishes).
  const [resultsForText, setResultsForText] = useState("");

  const filter = useMemo(() => parseSearchFilter(debouncedQuery), [debouncedQuery]);

  useEffect(() => {
    // Nothing to search — leave `results` as-is; the render below only reads it
    // once `hasQuery` is true, so stale/empty state here is never shown.
    if (!filter.text) return;

    let cancelled = false;
    void search(filter).then((next) => {
      if (!cancelled) {
        setResults(next);
        setResultsForText(filter.text ?? "");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  const hasQuery = query.trim().length > 0;
  const isDebouncePending = query !== debouncedQuery;
  const isPending = hasQuery && (isDebouncePending || resultsForText !== filter.text);

  const totalResults =
    results.appointments.length + results.tasks.length + results.habits.length + results.adhkar.length;

  // `entity`/`dateRangeStart` are never set by the current placeholder parseSearchFilter,
  // so this stays unmounted for now — see NLFilterChip's doc comment.
  const showNLFilter = Boolean(filter.entity || filter.dateRangeStart);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <SearchInput value={query} onChange={setQuery} />

      {showNLFilter && <NLFilterChip filter={filter} onClear={() => setQuery("")} />}

      {!hasQuery ? (
        <EmptyState icon={<SearchIcon className="size-6" />} title={t("search.startTyping")} />
      ) : isPending ? (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : totalResults === 0 ? (
        <EmptyState title={t("search.noResults")} subtitle={t("search.noResultsSubtitle")} />
      ) : (
        <div className="flex flex-col gap-5">
          {results.appointments.length > 0 && (
            <SearchResultsSection
              entity="appointment"
              title={t("search.sectionAppointments")}
              items={results.appointments}
            />
          )}
          {results.tasks.length > 0 && (
            <SearchResultsSection entity="task" title={t("search.sectionTasks")} items={results.tasks} />
          )}
          {results.habits.length > 0 && (
            <SearchResultsSection entity="habit" title={t("search.sectionHabits")} items={results.habits} />
          )}
          {results.adhkar.length > 0 && (
            <SearchResultsSection
              entity="dhikr"
              title={t("search.sectionAdhkar")}
              items={results.adhkar}
              categories={categories}
            />
          )}
        </div>
      )}
    </div>
  );
}
