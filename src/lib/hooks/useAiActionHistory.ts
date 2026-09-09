"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { aiActionsRepository } from "@/lib/db/repositories";
import type { AiActionLog } from "@/lib/types";

export interface UseAiActionHistory {
  items: AiActionLog[] | undefined;
  clear: () => Promise<void>;
}

/** Transparent, local-only log of what the planner/assistant proposed + what
 *  happened to it. Read-only view + a clear button. No raw prompts are stored. */
export function useAiActionHistory(limit = 50): UseAiActionHistory {
  const items = useLiveQuery(() => aiActionsRepository.getRecent(limit), [limit]);
  return {
    items,
    clear: () => aiActionsRepository.clearHistory(),
  };
}
