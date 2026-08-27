"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { adhkarRepository, dhikrCategoriesRepository, dhikrProgressRepository } from "@/lib/db/repositories";
import type { Dhikr, DhikrCategory, DhikrProgress } from "@/lib/types";

export function useDhikrCategories(): DhikrCategory[] | undefined {
  return useLiveQuery(() => dhikrCategoriesRepository.getAllSorted(), []);
}

export function useDhikrForCategory(categoryId: string | undefined): Dhikr[] | undefined {
  return useLiveQuery(() => (categoryId ? adhkarRepository.getForCategory(categoryId) : []), [categoryId]);
}

export function useAllDhikr(): Dhikr[] | undefined {
  return useLiveQuery(() => adhkarRepository.getAll(), []);
}

export function useDhikrProgressForDate(date: string): DhikrProgress[] | undefined {
  return useLiveQuery(() => dhikrProgressRepository.getForDate(date), [date]);
}
