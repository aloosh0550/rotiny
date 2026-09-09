/**
 * Autonomy policy — turns the user's `ai.autonomy` setting into a concrete,
 * testable decision for every action kind:
 *
 *   "auto"      → apply it now, then tell the user what changed
 *   "confirm"   → surface it as a proposal; the user taps to apply
 *   "forbidden" → never (should be unreachable via the schema; a hard backstop)
 *
 * Hard invariants that hold at every autonomy level:
 *   • nothing is ever deleted
 *   • appointments are never mutated by the system
 *   • "automatic" still asks before anything that reschedules across days? — no;
 *     deferring a task to tomorrow is allowed on "automatic" (it is reversible and
 *     the task is never lost), but it is always proposed on the lower levels.
 */

import type { AiAutonomy } from "@/lib/types";
import { isForbiddenActionKind, type AiActionKind } from "./actions";

export type PolicyDecision = "auto" | "confirm" | "forbidden";

const MATRIX: Record<AiActionKind, Record<AiAutonomy, PolicyDecision>> = {
  // trivial + instantly reversible
  reorderPlanItem: { conservative: "confirm", balanced: "auto", automatic: "auto" },
  markPlanItemDone: { conservative: "confirm", balanced: "auto", automatic: "auto" },
  // structural — changes where/when work sits
  moveItemToBucket: { conservative: "confirm", balanced: "confirm", automatic: "auto" },
  deferTaskToTomorrow: { conservative: "confirm", balanced: "confirm", automatic: "auto" },
  lowerTaskPriority: { conservative: "confirm", balanced: "confirm", automatic: "auto" },
};

export function decideAction(kind: string, autonomy: AiAutonomy): PolicyDecision {
  if (isForbiddenActionKind(kind)) return "forbidden";
  const row = MATRIX[kind as AiActionKind];
  if (!row) return "forbidden"; // unknown kind
  return row[autonomy];
}

/** True when this kind auto-applies at the given autonomy level. */
export function autoApplies(kind: string, autonomy: AiAutonomy): boolean {
  return decideAction(kind, autonomy) === "auto";
}
