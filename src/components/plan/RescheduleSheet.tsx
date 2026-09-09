"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Info, Sparkles, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { useTodayEnergy } from "@/lib/hooks/useLocalPlan";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAuth } from "@/lib/auth/AuthProvider";
import { aiActionsRepository } from "@/lib/db/repositories";
import { planReschedule } from "@/lib/planner/reschedule";
import { regenerateDailyPlan } from "@/lib/planner/aiPlan";
import { getAIProvider } from "@/lib/ai/registry";
import { processActions, confirmAction, rejectAction, type ProcessedAction } from "@/lib/ai/pipeline";
import { formatDuration } from "@/lib/time/dateUtils";
import { todayKey } from "@/lib/time/dateUtils";

const RUNS_KEY = () => `routini:reschedule:${todayKey()}`;

function readRuns(): number {
  try {
    return Number(localStorage.getItem(RUNS_KEY()) ?? "0") || 0;
  } catch {
    return 0;
  }
}
function bumpRuns() {
  try {
    localStorage.setItem(RUNS_KEY(), String(readRuns() + 1));
  } catch {
    /* private mode */
  }
}

/**
 * "أنا متأخر" → deterministic Smart Rescheduling. Previews safe proposals
 * (move past-window items to now, defer overflow tasks to tomorrow) with a plain
 * reason each, then applies them through the autonomy pipeline — auto-applied or
 * left for the user to confirm depending on their autonomy setting. Never
 * deletes; never touches an appointment.
 */
export function RescheduleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const tasks = useTasks();
  const appointments = useAppointments();
  const habits = useHabits();
  const completions = useCompletionsForDate(todayKey());
  const energy = useTodayEnergy();
  const settings = useSettings();
  const { session } = useAuth();
  const now = useNow(60_000);

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [ran, setRan] = useState<ProcessedAction[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<Record<string, "applied" | "failed" | "gone">>({});

  const autonomy = settings?.ai.autonomy ?? "conservative";
  const ready =
    !!tasks && !!appointments && !!habits && !!completions && energy !== undefined && !!settings;

  // recent reschedule actions today → per-item loop guard; reset on each open
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      const rows = await aiActionsRepository.getRecent(60);
      if (!alive) return;
      const today = todayKey();
      const keys = new Set<string>();
      for (const r of rows) {
        if (r.source !== "reschedule") continue;
        if (!r.sync.createdAt.startsWith(today)) continue;
        if (r.status === "rejected" || r.status === "failed") continue;
        const p = r.payload as { taskId?: string; refId?: string; refType?: string };
        if (p.taskId) keys.add(`task:${p.taskId}`);
        if (p.refId && p.refType) keys.add(`${p.refType}:${p.refId}`);
      }
      setTouched(keys);
      setRan(null);
      setConfirmed({});
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const result = useMemo(() => {
    if (!ready) return null;
    return planReschedule({
      now,
      energy: energy ?? null,
      tasks: tasks!,
      appointments: appointments!,
      habits: habits!,
      habitCompletions: completions!,
      runsToday: readRuns(),
      touchedKeys: touched,
    });
  }, [ready, now, energy, tasks, appointments, habits, completions, touched]);

  async function apply() {
    if (!result || result.proposals.length === 0) return;
    setBusy(true);
    const out = await processActions(result.proposals, { autonomy, source: "reschedule" });
    bumpRuns();

    // If AI planning is available, re-order what's left of the day (IDs verified +
    // deterministic fallback are built into regenerateDailyPlan). Same run counter,
    // so this can't loop. Never on failure — the day just keeps the local order.
    const provider = settings ? getAIProvider(settings.ai) : null;
    if (provider?.plan && tasks && appointments && habits && completions) {
      try {
        await regenerateDailyPlan(
          {
            now: new Date(),
            energy: energy ?? null,
            tasks,
            appointments,
            habits,
            habitCompletions: completions,
          },
          {
            ai: settings!.ai,
            provider,
            accessToken: session?.access_token ?? null,
            locale,
          },
        );
      } catch {
        /* the deterministic reschedule already applied — plan order is unchanged */
      }
    }

    setRan(out);
    setBusy(false);
  }

  async function onConfirm(logId: string) {
    const r = await confirmAction(logId);
    setConfirmed((c) => ({ ...c, [logId]: r }));
  }
  async function onReject(logId: string) {
    await rejectAction(logId);
    setConfirmed((c) => ({ ...c, [logId]: "gone" }));
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("plan.rescheduleTitle")}>
      <div className="flex flex-col gap-4 pb-2">
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="size-4 text-accent-fg" />
          {t("plan.lateTimeLeft", {
            time: formatDuration(result?.summary.minutesLeft ?? 0, locale),
          })}
        </p>
        <p className="text-xs text-text-tertiary">{t("plan.rescheduleIntro")}</p>

        {result?.note === "loop-guard" ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            <Info className="me-1.5 inline size-3.5" />
            {t("plan.rescheduleLoopGuard")}
          </p>
        ) : !result || result.proposals.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            {t("plan.rescheduleNone")}
          </p>
        ) : ran === null ? (
          <>
            <div className="flex flex-col gap-2">
              {result.proposals.map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                >
                  {p.reason}
                </div>
              ))}
            </div>
            <Button fullWidth onClick={apply} disabled={busy}>
              <Sparkles className="size-4" />
              {t("plan.rescheduleApply")}
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {ran.map((r, i) => {
              const state = r.logId ? confirmed[r.logId] : undefined;
              const settled =
                r.outcome === "applied" || state === "applied" || state === "gone";
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 text-text-primary">{r.reason || r.kind}</span>
                  {r.outcome === "applied" || state === "applied" ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-success">
                      <Check className="size-3.5" />
                      {t("plan.rescheduleApplied")}
                    </span>
                  ) : r.outcome === "failed" || state === "failed" ? (
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {t("plan.rescheduleFailed")}
                    </span>
                  ) : r.outcome === "proposed" && r.logId && !settled ? (
                    <span className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => void onConfirm(r.logId!)}>
                        {t("plan.rescheduleApplyOne")}
                      </Button>
                      <button
                        type="button"
                        aria-label={t("plan.dismiss")}
                        onClick={() => void onReject(r.logId!)}
                        className="text-text-tertiary"
                      >
                        <X className="size-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-text-tertiary">{t("plan.dismiss")}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Button variant="secondary" fullWidth onClick={onClose}>
          {t("common.done")}
        </Button>
      </div>
    </Sheet>
  );
}
