"use client";

import { Tabs } from "@/components/ui/Tabs";
import type { DhikrCategory } from "@/lib/types";

export interface CategoryTabsProps {
  categories: DhikrCategory[];
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  return (
    <Tabs
      items={categories.map((c) => ({ value: c.id, label: c.title }))}
      value={value}
      onChange={onChange}
    />
  );
}
