# Phase 11 — AI Planning + Smart Rescheduling + Autonomy

Built on the Phase 9 `AIProvider` abstraction. **The app works fully with AI off** —
every path here has a deterministic, offline fallback and the AI only ever
*re-orders* or *rephrases*, never adds/removes/edits.

## What was built

### Autonomy (`AiSettings.autonomy`: conservative | balanced | automatic)
- `src/lib/ai/policy.ts` — `decideAction(kind, autonomy) → "auto" | "confirm" | "forbidden"`.
  - **conservative**: every action is proposed; nothing auto-applies.
  - **balanced**: trivial reversible steps (`reorderPlanItem`, `markPlanItemDone`) auto-apply;
    `moveItemToBucket` / `deferTaskToTomorrow` / `lowerTaskPriority` are proposed.
  - **automatic**: all planning actions auto-apply.
  - Hard invariants at **every** level: nothing is ever deleted; appointments are never
    mutated; unknown / `delete*` / `*appointment*` kinds → `forbidden`.
- Selector in **Settings → AI assistant → Autonomy** (visible even with AI off — it also
  governs the deterministic rescheduler). Default `conservative`. Backfilled by
  `migrateSettingsShape`.

### Action vocabulary + pipeline
- `src/lib/ai/actions.ts` — 5 Zod-validated action kinds, all planning-scoped. No delete
  kind exists; a defensive `isForbiddenActionKind` regex rejects `delete/remove/cancel/…`
  and appointment-mutation even if a payload slips past the schema.
- `src/lib/ai/pipeline.ts` — the single guarded path:
  `raw → parseAiAction (Zod + guard) → decideAction → apply via repositories → log`.
  **The model never touches the DB** — `applyAction` only calls the same repositories the
  UI uses. `processActions`, `confirmAction`, `rejectAction`.
- `applyAction` semantics: `markPlanItemDone` (idempotent, no delete), `deferTaskToTomorrow`
  (sets `plannedFor` — the real deadline is untouched, the task is never lost),
  `lowerTaskPriority` (steps down one level, stops at `later`), `reorderPlanItem` /
  `moveItemToBucket` (edit today's `daily_plans` items).
- `buildLocalPlan` now excludes a pending task whose `plannedFor` is a future day, so a
  deferred task actually leaves today's plan.

### Deterministic Smart Rescheduling (`src/lib/planner/reschedule.ts`)
- Pure function over `buildLocalPlan` + time-left + energy. Proposes:
  `moveItemToBucket` (item stuck in a past window → the current one) and
  `deferTaskToTomorrow` (tasks that overflow the time left, lowest-priority first).
- **Never** proposes deleting anything or touching an appointment. Habits that overflow are
  surfaced, never deferred.
- **Loop-safe**: `MAX_RESCHEDULES_PER_DAY = 6` (tracked in `localStorage`) + a per-item
  guard from `ai_actions` history (never re-proposes for an item already acted on today).
- Every proposal carries a plain Arabic reason.
- `RescheduleSheet` (`/plan` → "أنا متأخر") previews the proposals, then applies them
  through the autonomy pipeline — auto-applied or left with an inline "تطبيق / تجاهل"
  depending on autonomy. Replaces the old `LateMode`.

### AI plan upgrade (`src/lib/planner/aiPlan.ts`)
- `computePlan(input, { ai, provider, accessToken, locale })` — always runs `buildLocalPlan`;
  if AI is enabled + a provider with `plan()` is configured, sends the candidate list
  (titles + ids + durations only — no notes/deadlines/history) and applies the returned
  ordering + reason rewrites. Any failure → silent local fallback (`fellBack: true`).
- `AIProvider.plan?()` added; `GeminiProvider.plan()` POSTs to `ai-plan` and re-validates
  the response (ids must be ones it sent; drops the rest).
- **Never on render** — only the `/plan` "regenerate" button calls it (explicit user
  action). The auto-generated daily plan stays 100 % local.
- `env.ts` → `aiFunctionUrl("ai-chat" | "ai-plan")`.

### Action log
- `AiActionLog` model + Dexie v8 store `aiActions` + `aiActionsRepository`
  (`log`, `setStatus`, `getPending`, `getRecent`). **Local-first** — works offline.

## Tests (all green)

| file | covers |
|---|---|
| `tests/ai/policy.test.ts` (7) | every autonomy level per kind; conservative ⊆ balanced ⊆ automatic; forbidden kinds; malformed payloads |
| `tests/ai/pipeline.test.ts` (9) | injection guardrail (a "deleteTask" action / arbitrary text is rejected, data untouched); conservative = all proposed; automatic = applied; balanced split; **never deletes** (row count stable); idempotency; confirm/reject; graceful failure |
| `tests/planner/reschedule.test.ts` (8) | clear day → nothing; overflow → defer lowest-priority first; no delete / no appointment; habits not deferred; loop guard (runs/day + per-item); every proposal has a reason |
| `tests/planner/aiPlan.test.ts` (5) | AI off → local; no `plan()` → local; provider throws → silent fallback; valid order applied; garbled ids dropped |
| `tests/planner/localPlanner.test.ts` (+1) | a task planned for a later day is excluded from today |

Full run: **126 pass / 11 integration skipped**. `tsc` + `lint` clean. `next build`
(cloud + local) clean. QA 36/36, no overflow. `npm run pwa:check` passes.

## Pending migration (NOT applied)

`supabase/migrations/20260914000000_phase11_ai_actions.sql` — `ai_actions` table
(cloud audit log; RLS "owner all", trigger, indexes, 2 CHECKs, FK CASCADE, realtime).
**Verified on the local stack.** Client keeps `ai_actions` local-only until it is applied
and added to `SYNCED_TABLES` (same pattern as Phase 10 `devices`, to avoid a realtime
channel binding to a table that isn't there yet).

## External setup (optional — for the AI *upgrade* only)

The AI plan ranker needs the `ai-plan` Edge Function deployed
(`supabase functions deploy ai-plan`, shares `GEMINI_API_KEY` with `ai-chat`). Skeleton +
README at `supabase/functions/ai-plan/`. Until then `computePlan` and the rescheduler run
fully deterministic — no user-visible difference beyond the "rescheduleAiUpgraded" badge.

## Not touched (backlog)

J1 native widget rendering · J4 FCM/Firebase · `devices` migration · AI rephrasing of the
"لماذا الآن؟" reasons on the plan list (Phase 13) · autonomy-gated AI *chat* actions
(the pipeline is ready; wiring the assistant's `proposedActions` into it is Phase 13).
