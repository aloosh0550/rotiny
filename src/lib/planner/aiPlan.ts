/**
 * Plan orchestration. The deterministic `buildLocalPlan` is always the engine
 * and the always-available fallback. When an AI provider with planning support
 * is configured + enabled, it may *re-order* the candidates and *rephrase* their
 * reasons — nothing else. Any failure (offline, quota, bad response) falls back
 * silently to the local order.
 *
 * `computePlan` never runs on render — only from an explicit user action
 * (the "regenerate" button). The auto-generated daily plan stays 100% local.
 */

import { buildLocalPlan, type LocalPlan, type PlannerInput } from "./localPlanner";
import { dailyPlansRepository } from "@/lib/db/repositories";
import type { AIProvider, AIPlanCandidate } from "@/lib/ai/types";
import type { AiSettings, DailyPlanItem } from "@/lib/types";
import { todayKey } from "@/lib/time/dateUtils";

export interface ComputePlanResult {
  items: DailyPlanItem[];
  source: "ai" | "local";
  /** set when AI was tried but fell back */
  fellBack?: boolean;
}

function candidatesFrom(local: LocalPlan): AIPlanCandidate[] {
  return local.remaining.map((i) => ({
    refType: i.type,
    refId: i.id,
    title: i.title,
    bucket: i.bucket,
    durationMinutes: i.durationMinutes,
    reason: i.reason,
    score: i.score,
  }));
}

function toItems(
  local: LocalPlan,
  order?: string[],
  reasons?: Record<string, string>,
): DailyPlanItem[] {
  let seq = local.remaining;
  if (order && order.length) {
    const byId = new Map(local.remaining.map((i) => [i.id, i]));
    const picked = order.map((id) => byId.get(id)).filter((x): x is (typeof seq)[number] => !!x);
    // keep any candidate the AI dropped, appended in local order
    const seen = new Set(picked.map((i) => i.id));
    seq = [...picked, ...local.remaining.filter((i) => !seen.has(i.id))];
  }
  return seq.map((i, idx) => ({
    refType: i.type,
    refId: i.id,
    bucket: i.bucket,
    order: idx,
    status: "pending" as const,
    reason: reasons?.[i.id] ?? i.reason,
  }));
}

export async function computePlan(
  input: PlannerInput,
  opts: {
    ai: AiSettings;
    provider: AIProvider | null;
    accessToken: string | null;
    locale: "ar" | "en";
  },
): Promise<ComputePlanResult> {
  const local = buildLocalPlan(input);

  const canUseAi = opts.ai.enabled && !!opts.provider?.plan;
  if (!canUseAi) {
    return { items: toItems(local), source: "local" };
  }

  try {
    const res = await opts.provider!.plan!(
      {
        today: todayKey(),
        energy: input.energy ?? null,
        candidates: candidatesFrom(local),
        locale: opts.locale,
      },
      { accessToken: opts.accessToken },
    );
    return { items: toItems(local, res.order, res.reasons), source: "ai" };
  } catch {
    return { items: toItems(local), source: "local", fellBack: true };
  }
}

export type ComputePlanOpts = {
  ai: AiSettings;
  provider: AIProvider | null;
  accessToken: string | null;
  locale: "ar" | "en";
};

/**
 * `computePlan` + persist today's plan. The single place both the `/plan`
 * "regenerate" button and the "أنا متأخر" flow write an AI-or-local plan.
 */
export async function regenerateDailyPlan(
  input: PlannerInput,
  opts: ComputePlanOpts,
): Promise<ComputePlanResult> {
  const result = await computePlan(input, opts);
  await dailyPlansRepository.upsertForDate(todayKey(), {
    energy: input.energy ?? null,
    generatedBy: result.source === "ai" ? "ai" : "local",
    items: result.items,
    regeneratedAt: new Date().toISOString(),
  });
  return result;
}
