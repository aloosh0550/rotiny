/**
 * AIAction — the ONLY vocabulary the planner / assistant can use to change the
 * user's data. Every action is a small, reversible, planning-scoped operation:
 *
 *   AIResult → AIAction[] → Zod validate → policy(autonomy) → repositories → DB
 *
 * The model never writes SQL and never touches the database — it can only emit
 * these structured actions, which are re-validated here and applied through the
 * same repositories the UI uses (see `pipeline.ts`).
 *
 * Deliberately absent: any delete/remove kind, and any appointment mutation.
 * Appointments are read-only to the planner; deletion is always a human action.
 */

import { z } from "zod";

export const AI_ACTION_KINDS = [
  "reorderPlanItem",
  "moveItemToBucket",
  "deferTaskToTomorrow",
  "lowerTaskPriority",
  "markPlanItemDone",
] as const;

export type AiActionKind = (typeof AI_ACTION_KINDS)[number];

const refType = z.enum(["task", "appointment", "habit"]);
const bucket = z.enum(["morning", "afternoon", "evening"]);
/** every action carries a plain-language, deterministic reason shown to the user */
const reason = z.string().min(1).max(200);

export const aiActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reorderPlanItem"),
    refType,
    refId: z.string().min(1),
    direction: z.union([z.literal(-1), z.literal(1)]),
    reason,
  }),
  z.object({
    kind: z.literal("moveItemToBucket"),
    refType,
    refId: z.string().min(1),
    bucket,
    reason,
  }),
  z.object({
    kind: z.literal("deferTaskToTomorrow"),
    taskId: z.string().min(1),
    reason,
  }),
  z.object({
    kind: z.literal("lowerTaskPriority"),
    taskId: z.string().min(1),
    reason,
  }),
  z.object({
    kind: z.literal("markPlanItemDone"),
    refType,
    refId: z.string().min(1),
    reason,
  }),
]);

export type AiAction = z.infer<typeof aiActionSchema>;

/**
 * A second, defensive guard: reject anything that even *looks* like a
 * destructive or appointment-mutating instruction, in case a future kind or a
 * malformed/injected payload slips past the schema.
 */
const FORBIDDEN_KIND_RE = /delete|remove|destroy|drop|cancel|wipe|purge|moveappointment|editappointment/i;

export function isForbiddenActionKind(kind: string): boolean {
  return FORBIDDEN_KIND_RE.test(kind);
}

/** Parse an untrusted action; returns null on any validation failure. */
export function parseAiAction(raw: unknown): AiAction | null {
  if (
    raw &&
    typeof raw === "object" &&
    "kind" in raw &&
    typeof (raw as { kind: unknown }).kind === "string" &&
    isForbiddenActionKind((raw as { kind: string }).kind)
  ) {
    return null;
  }
  const parsed = aiActionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
