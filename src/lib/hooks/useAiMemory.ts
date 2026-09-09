"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { aiMemoryRepository } from "@/lib/db/repositories";
import type { AiMemory } from "@/lib/types";

export interface UseAiMemory {
  items: AiMemory[] | undefined;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useAiMemory(): UseAiMemory {
  const items = useLiveQuery(() => aiMemoryRepository.getAll(), []);

  return {
    items: items
      ? [...items].sort((a, b) => b.sync.createdAt.localeCompare(a.sync.createdAt))
      : undefined,
    async setEnabled(id, enabled) {
      await aiMemoryRepository.setEnabled(id, enabled);
    },
    async remove(id) {
      await aiMemoryRepository.delete(id);
    },
    async clearAll() {
      const all = (await aiMemoryRepository.getAll()) ?? [];
      await Promise.all(all.map((m) => aiMemoryRepository.delete(m.id)));
    },
  };
}
