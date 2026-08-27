"use client";

import { X } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { SearchFilter } from "@/lib/types";

export interface NLFilterChipProps {
  filter: SearchFilter;
  onClear: () => void;
}

/**
 * Dismissible chip showing what a natural-language query was understood as, e.g.
 * "Got it: with Ahmad · this week", with a clear (X) action back to plain search.
 *
 * This is the architected-but-currently-unused display for `SearchFilter.entity` /
 * `dateRangeStart` / `dateRangeEnd` — fields that `parseSearchFilter` doesn't populate
 * yet (see `@/lib/services/searchService`, a later NL-parsing phase). It naturally
 * renders nothing meaningful until that phase lands; the search page only mounts it
 * once `filter.entity || filter.dateRangeStart` is truthy.
 */
export function NLFilterChip({ filter, onClear }: NLFilterChipProps) {
  const { t } = useTranslation();

  const parts: string[] = [];
  if (filter.entity) parts.push(filter.entity);
  if (filter.dateRangeStart) {
    parts.push(
      filter.dateRangeEnd && filter.dateRangeEnd !== filter.dateRangeStart
        ? `${filter.dateRangeStart} – ${filter.dateRangeEnd}`
        : filter.dateRangeStart,
    );
  }
  const summary = parts.join(" · ");

  return (
    <Chip icon={<X className="size-3.5" />} tone="accent" onClick={onClear}>
      {t("search.understood")}: {summary}
    </Chip>
  );
}
