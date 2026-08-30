"use client";

import { Tabs } from "@/components/ui/Tabs";
import type { DhikrCategory } from "@/lib/types";

export interface CategoryTabsProps {
  categories: DhikrCategory[];
  value: string;
  onChange: (categoryId: string) => void;
}

/** The strip already lives on the Adhkar screen, so the repeated "أذكار " prefix
 * in every category title is noise — trim it for display only (data is untouched). */
function shortLabel(title: string): string {
  const trimmed = title.replace(/^\s*أذكار\s+/, "").trim();
  return trimmed.length > 0 ? trimmed : title;
}

export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  return (
    <Tabs
      fitted={false}
      items={categories.map((c) => ({ value: c.id, label: shortLabel(c.title) }))}
      value={value}
      onChange={onChange}
    />
  );
}
