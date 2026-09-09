# Phase 13 — AI Assistant Deepening

Wires the Phase 9–12 capabilities together so the assistant is genuinely useful
inside the app — without letting the AI do anything outside the guarded pipeline.

## 1. Proposed actions (chat → real change)

```
user message
  → ai-chat: reply  +  1 strict-JSON call → { memory[], actions[] }
  → client: resolveProposedActions(actions, refMap)   // refs → real ids, drop the rest
  → processActions()  →  parseAiAction (Zod)  →  isForbiddenActionKind guard
                      →  decideAction(kind, autonomy)  →  applyAction() via repositories
                      →  ai_actions log
```

**Item references never carry a real id.** `buildAIContext` now returns
`{ context, refMap }`: each task/habit/plan item gets an opaque per-turn ref
(`t1`, `h2`, `p3`), shown in the context as `[t1] title`. The `refMap`
(ref → `{type,id}`) stays on the device. The assistant proposes
`{ kind, ref, …, reason }`; `resolveProposedActions` swaps the ref for the real
local id and drops anything unresolvable, forbidden, or of an unknown kind. The
survivors still go through `parseAiAction` (Zod) inside the pipeline — this is a
convenience layer, not a trust boundary.

Allowed kinds (unchanged, from `actions.ts`): `deferTaskToTomorrow`,
`lowerTaskPriority`, `markPlanItemDone`, `moveItemToBucket`, `reorderPlanItem`.
No delete kind exists; `delete*` / `*appointment*` / unknown → dropped at resolve
**and** rejected by the pipeline.

## 2. Assistant UI — `ProposedActionCard`

Under the assistant's reply, one card per proposed action:
- **What will happen** — human sentence (`actKind*` i18n, e.g. "أجّل «التقرير» إلى الغد")
- **Why** — the deterministic/AI reason
- **Affected item** — the item title (looked up locally)
- **Apply** / **Dismiss** — for a `proposed` action
- "طبّقه المساعد تلقائيًا" — for one the autonomy setting auto-applied

Autonomy is fully honoured (it's `processActions` doing the deciding):
`conservative` → every card is Apply/Dismiss; `balanced` → trivial kinds
auto-apply, the rest ask; `automatic` → planning kinds auto-apply. `automatic`
**cannot** widen the forbidden set.

## 3. "لماذا الآن؟"

Already deterministic (`buildLocalPlan` `reason`). `computePlan` lets Gemini
*rephrase* a reason (via `ai-plan` `reasons`) but the client keeps the
deterministic reason on any failure, and the AI can't change data through it —
a `reason` is a string stored on a plan item, it never reaches the pipeline
(tested: a `{"kind":"deleteTask"}` string in `reasons` is just text).

## 4. "أنا متأخر" + `ai-plan`

`RescheduleSheet` still computes its safe proposals deterministically
(`planReschedule` — move past-window items, defer overflow tasks, never delete,
never touch an appointment, never defer a habit, loop-guarded 6/day + per-item).
After they're applied through the pipeline, if an AI planner is configured it
calls `regenerateDailyPlan` to re-order what's left — `computePlan` re-validates
every id and falls back to the deterministic order on any failure, under the same
run counter so it can't loop.

## 5. AI action history

`AiActionHistory` (Settings → AI assistant): the last 50 `ai_actions` rows —
what was proposed, applied, rejected or failed, its reason, source
(planner / reschedule / chat) and a relative time. **Local only. No raw prompts
or context are stored** (they aren't stored anywhere). "Clear history" soft-deletes.

## 6. Memory — unchanged

Same rules (Phase 9): a turn may write 0–2 `ai_memory` rows only when
`memoryEnabled` is on; the user views / disables / deletes them. The AI cannot
override a user setting — `useAssistant` gates every write on `ai.memoryEnabled`.

## 7. Security — the pipeline is the boundary, not the prompt

| Attempt | Result |
|---|---|
| `proposedActions: [{kind:"deleteTask", ref:"t1"}]` | dropped at `resolveProposedActions` (forbidden regex) + rejected by `parseAiAction` — data untouched (test) |
| `proposedActions: [{kind:"cancelAppointment", ref:"p1"}]` | dropped — no appointment kind exists |
| unknown kind / missing ref / non-array | dropped, `[]` |
| ref for an item not in this turn's map | dropped |
| `automatic` autonomy | still can't apply a forbidden kind — `decideAction` returns `forbidden` regardless |
| injection text in a task title / a `reason` | never parsed as an instruction — it's fenced context / a stored string |

`Zod + isForbiddenActionKind + policy.ts + the repositories + RLS` remain the
final defense. The prompt is defense-in-depth only.

## 8. Privacy

- Context: titles + opaque refs only. No real ids, no notes, no deadlines, no
  history. Sent only on a user message with "Share context" on.
- `proposedActions` add nothing to the wire — extracted from the same context.
- `ai-plan` unchanged (titles + durations).
- Free-tier training caveat already documented (Phase 12).

## 9. Offline / no AI

- `/assistant`: AI off / unreachable → calm "unavailable" card; suggestions
  (deterministic) still shown.
- `/plan` + RescheduleSheet: fully deterministic without Gemini; the AI step is a
  silent no-op on failure.
- All covered by tests (`computePlan` fallback, `regenerateDailyPlan` fallback,
  `useAssistant` catch path).

## Tests (+24, all green)

| file | covers |
|---|---|
| `tests/ai/proposed.test.ts` (8) | ref resolution per kind · unresolvable/forbidden/unknown dropped · non-array → [] · cap 5 · **injected delete never runs** · conservative→proposed · automatic→applied, task moved not deleted |
| `tests/ai/context.test.ts` (3) | every item gets a ref that maps back · **rendered context contains titles + refs but never a real id** · memory only when asked |
| `tests/planner/regenerateDailyPlan.test.ts` (3) | persists `generatedBy:"ai"` on success · **local fallback + `generatedBy:"local"` when AI throws** · AI off → no provider call |
| `tests/ai/provider.test.ts` (+2) | `proposedActions` passed through verbatim (non-objects filtered) · omitted when absent |
| Phase 11 pipeline/policy tests | still green — Gemini output can't bypass Zod / forbidden guard / policy / repositories |

Full: **147 pass / 11 integration skipped**. `tsc` + `lint` clean. `build`
(cloud + local) clean. QA 36/36. `pwa:check` passes. `test-ai-function.mjs`
(secret-free) 10/10.

## Deploy

`ai-chat` redeployed (proposedActions extraction). `ai-plan` unchanged. No new
key, no DB change. Real Gemini round-trip (does it actually emit good actions?) is
owner-verified from the app or with `SUPABASE_TEST_JWT`.

## Pending / external

- Migrations still pending (NOT applied): `20260913000000_phase10_devices.sql`,
  `20260914000000_phase11_ai_actions.sql`. `ai_actions` stays local until applied.
- No new migration in this phase.
- Optional: deploy `ai-plan` is already done; nothing else external needed for
  Phase 13.
