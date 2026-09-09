/**
 * The action pipeline — the single, guarded path from a proposed action to a
 * real data change:
 *
 *   raw action → parseAiAction (Zod + forbidden-kind guard)
 *              → decideAction(kind, autonomy)
 *              → "auto"    : applyAction() via repositories, log "applied"
 *                "confirm" : log "proposed" — the UI shows it, the user taps
 *                "forbidden": log "rejected", never runs
 *
 * The model NEVER reaches the database. `applyAction` only ever calls the same
 * repositories the UI uses; there is no delete and no appointment mutation
 * anywhere in this file.
 */

import {
  aiActionsRepository,
  tasksRepository,
  habitCompletionsRepository,
  dailyPlansRepository,
} from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { todayKey, dateKey, addDays } from "@/lib/time/dateUtils";
import { parseAiAction, type AiAction } from "./actions";
import { decideAction, type PolicyDecision } from "./policy";
import type { AiActionSource, AiAutonomy, DailyPlanBucket, Priority } from "@/lib/types";

export interface ProcessedAction {
  kind: string;
  reason: string;
  params: Record<string, unknown>;
  decision: PolicyDecision;
  outcome: "applied" | "proposed" | "rejected" | "failed";
  logId: string | null;
  error?: string;
}

function paramsOf(a: AiAction): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...(a as unknown as Record<string, unknown>) };
  delete rest.kind;
  delete rest.reason;
  return rest;
}

/* ------------------------------------------------------------- apply -------- */

/**
 * Execute one validated action through the repositories. Throws on a hard
 * failure (missing row); a no-op (already done) resolves silently.
 */
export async function applyAction(action: AiAction): Promise<void> {
  switch (action.kind) {
    case "markPlanItemDone": {
      if (action.refType === "appointment") return; // appointments aren't "completed"
      if (action.refType === "task") {
        const task = await tasksRepository.getById(action.refId);
        if (!task) throw new Error("task not found");
        if (task.status === "completed") return;
        const updated = await tasksRepository.update(action.refId, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        await onEntityMutated({ type: "task", op: "update", entity: updated });
        return;
      }
      // habit
      const done = await habitCompletionsRepository.isCompletedOn(action.refId, todayKey());
      if (done) return;
      await habitCompletionsRepository.toggleForDate(action.refId, todayKey());
      await onEntityMutated({ type: "habit", op: "update", entity: { id: action.refId } });
      return;
    }

    case "deferTaskToTomorrow": {
      const task = await tasksRepository.getById(action.taskId);
      if (!task) throw new Error("task not found");
      // move it OUT of today's plan without touching its real deadline
      const plannedFor = dateKey(addDays(new Date(), 1));
      if (task.plannedFor === plannedFor) return;
      const updated = await tasksRepository.update(action.taskId, { plannedFor });
      await onEntityMutated({ type: "task", op: "update", entity: updated });
      return;
    }

    case "lowerTaskPriority": {
      const task = await tasksRepository.getById(action.taskId);
      if (!task) throw new Error("task not found");
      const next: Priority = task.priority === "important" ? "normal" : "later";
      if (task.priority === next) return; // already lowest
      const updated = await tasksRepository.update(action.taskId, { priority: next });
      await onEntityMutated({ type: "task", op: "update", entity: updated });
      return;
    }

    case "reorderPlanItem":
    case "moveItemToBucket": {
      const plan = await dailyPlansRepository.getForDate(todayKey());
      if (!plan) throw new Error("no plan for today");
      const items = plan.items.map((it) => ({ ...it }));
      const target = items.find((it) => it.refType === action.refType && it.refId === action.refId);
      if (!target) throw new Error("item not in plan");

      if (action.kind === "moveItemToBucket") {
        if (target.bucket === action.bucket) return;
        target.bucket = action.bucket as DailyPlanBucket;
      } else {
        const inBucket = items
          .filter((it) => it.bucket === target.bucket)
          .sort((a, b) => a.order - b.order);
        const idx = inBucket.findIndex((it) => it.refId === target.refId);
        const swap = inBucket[idx + action.direction];
        if (!swap) return; // already at the edge
        const a = target.order;
        target.order = swap.order;
        const swapItem = items.find((it) => it.refId === swap.refId && it.refType === swap.refType)!;
        swapItem.order = a;
      }

      await dailyPlansRepository.upsertForDate(todayKey(), {
        energy: plan.energy ?? null,
        generatedBy: "manual",
        items,
        regeneratedAt: plan.regeneratedAt ?? null,
      });
      return;
    }
  }
}

/* ----------------------------------------------------------- process ------- */

export async function processActions(
  rawActions: unknown[],
  ctx: { autonomy: AiAutonomy; source: AiActionSource },
): Promise<ProcessedAction[]> {
  const out: ProcessedAction[] = [];

  for (const raw of rawActions) {
    const rawKind =
      raw && typeof raw === "object" && typeof (raw as { kind?: unknown }).kind === "string"
        ? (raw as { kind: string }).kind
        : "unknown";

    const action = parseAiAction(raw);
    if (!action) {
      const log = await aiActionsRepository
        .log({
          kind: rawKind,
          payload: {},
          reason: "",
          status: "rejected",
          autonomyAtTime: ctx.autonomy,
          source: ctx.source,
          error: "invalid or forbidden action",
        })
        .catch(() => null);
      out.push({
        kind: rawKind,
        reason: "",
        params: {},
        decision: "forbidden",
        outcome: "rejected",
        logId: log?.id ?? null,
        error: "invalid or forbidden action",
      });
      continue;
    }

    const decision = decideAction(action.kind, ctx.autonomy);
    const params = paramsOf(action);

    if (decision === "forbidden") {
      const log = await aiActionsRepository
        .log({
          kind: action.kind,
          payload: params,
          reason: action.reason,
          status: "rejected",
          autonomyAtTime: ctx.autonomy,
          source: ctx.source,
          error: "forbidden by policy",
        })
        .catch(() => null);
      out.push({ ...base(action, params), decision, outcome: "rejected", logId: log?.id ?? null });
      continue;
    }

    if (decision === "confirm") {
      const log = await aiActionsRepository
        .log({
          kind: action.kind,
          payload: params,
          reason: action.reason,
          status: "proposed",
          autonomyAtTime: ctx.autonomy,
          source: ctx.source,
        })
        .catch(() => null);
      out.push({ ...base(action, params), decision, outcome: "proposed", logId: log?.id ?? null });
      continue;
    }

    // auto
    try {
      await applyAction(action);
      const log = await aiActionsRepository
        .log({
          kind: action.kind,
          payload: params,
          reason: action.reason,
          status: "applied",
          autonomyAtTime: ctx.autonomy,
          source: ctx.source,
        })
        .catch(() => null);
      out.push({ ...base(action, params), decision, outcome: "applied", logId: log?.id ?? null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const log = await aiActionsRepository
        .log({
          kind: action.kind,
          payload: params,
          reason: action.reason,
          status: "failed",
          autonomyAtTime: ctx.autonomy,
          source: ctx.source,
          error: msg,
        })
        .catch(() => null);
      out.push({ ...base(action, params), decision, outcome: "failed", logId: log?.id ?? null, error: msg });
    }
  }

  return out;
}

function base(action: AiAction, params: Record<string, unknown>) {
  return { kind: action.kind, reason: action.reason, params };
}

/* ------------------------------------------------ confirm / reject -------- */

/** Apply a previously-proposed action after the user taps "apply". */
export async function confirmAction(logId: string): Promise<"applied" | "failed" | "gone"> {
  const rows = await aiActionsRepository.getAll();
  const log = rows.find((r) => r.id === logId);
  if (!log || log.status !== "proposed") return "gone";

  const action = parseAiAction({ kind: log.kind, reason: log.reason || "…", ...log.payload });
  if (!action) {
    await aiActionsRepository.setStatus(logId, "rejected", "no longer valid");
    return "failed";
  }
  try {
    await applyAction(action);
    await aiActionsRepository.setStatus(logId, "applied");
    return "applied";
  } catch (e) {
    await aiActionsRepository.setStatus(logId, "failed", e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

/** The user dismissed a proposed action. */
export async function rejectAction(logId: string): Promise<void> {
  await aiActionsRepository.setStatus(logId, "rejected", "dismissed by user");
}
