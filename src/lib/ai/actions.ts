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
import type { AIRefMap } from "./types";

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

/* --------------------------------------------------- proposed (wire) ------ */

/**
 * The wire shape of an action the assistant proposes. It references items by
 * their per-turn context `ref` (t1, h2, …), never a real id.
 */
export const aiProposedActionSchema = z.object({
  kind: z.string().min(1).max(40),
  ref: z.string().min(1).max(12).optional(),
  direction: z.union([z.literal(-1), z.literal(1)]).optional(),
  bucket: z.enum(["morning", "afternoon", "evening"]).optional(),
  reason: z.string().min(1).max(200),
});

/**
 * Turn the assistant's proposed actions into raw internal-action objects by
 * resolving each `ref` against the turn's ref-map. Anything unresolvable,
 * forbidden, or of an unknown kind is dropped — the survivors still go through
 * `parseAiAction` (Zod) inside the pipeline, so this is a convenience layer, not
 * a trust boundary.
 */
export function resolveProposedActions(raw: unknown, refMap: AIRefMap): unknown[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];

  for (const item of raw.slice(0, 5)) {
    const parsed = aiProposedActionSchema.safeParse(item);
    if (!parsed.success) continue;
    const p = parsed.data;
    if (isForbiddenActionKind(p.kind)) continue;
    if (!AI_ACTION_KINDS.includes(p.kind as AiActionKind)) continue;
    if (!p.ref) continue;
    const target = refMap[p.ref];
    if (!target) continue;

    switch (p.kind as AiActionKind) {
      case "deferTaskToTomorrow":
      case "lowerTaskPriority":
        if (target.type !== "task") continue;
        out.push({ kind: p.kind, taskId: target.id, reason: p.reason });
        break;
      case "markPlanItemDone":
        out.push({ kind: p.kind, refType: target.type, refId: target.id, reason: p.reason });
        break;
      case "moveItemToBucket":
        if (!p.bucket) continue;
        out.push({ kind: p.kind, refType: target.type, refId: target.id, bucket: p.bucket, reason: p.reason });
        break;
      case "reorderPlanItem":
        if (p.direction !== -1 && p.direction !== 1) continue;
        out.push({
          kind: p.kind,
          refType: target.type,
          refId: target.id,
          direction: p.direction,
          reason: p.reason,
        });
        break;
    }
  }
  return out;
}
