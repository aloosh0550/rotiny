# RoutinI / روتيني — Cloud-first build progress

Branch `redesign/routini-v2`. Plan: `IMPLEMENTATION_PLAN.md` (v3, cloud-first).

| Phase | State | Notes |
|---|---|---|
| **0 · Cloud-first plan** | ✅ done | `CURRENT_STATE.md` · `GAP_MATRIX.md` · `IMPLEMENTATION_PLAN.md` |
| **1 · Cloud foundation (auth)** | ✅ done + verified | Supabase client (env-gated, lazy), `AuthProvider` (Email magic-link + Google), `/sign-in`, `/auth/callback`, `routini://auth/callback`, auth gate in `(app)/layout`, `AccountCard` + sign-out on `/more`. Providers **live-verified** on the hosted project (Google + Email enabled). Dev server serves all auth routes 200. |
| **2 · DataStore + SyncEngine + cache** | ✅ done + verified | `CloudStore` (Supabase CRUD w/ RLS, pull cursor, upsert push, tombstone delete, realtime per-user, `profiles.settings` sync). `SyncEngine` (initial pull, realtime reconcile, outbox flush, server-version tracking, **cloud-wins conflict** + conflict inbox with re-apply/dismiss, one-time non-destructive local→cloud upload, sign-out wipe). Repos enqueue every mutation (env-gated). `useSyncState` + status UI on `/more/settings/sync`. **5 integration tests vs a real local Supabase, run 3× stable.** Hosted project has all 9 tables + RLS + realtime (probed via anon key). |
| **3 · Core UX + Navigation** | ✅ done | Nav: مواعيدي→اليوم (plan) as slot 2, Appointments→More. Home recomposed to the one-answer layout (الآن hero → compact progress → المتبقي → layers). `<ProgressMeter>` primitive. No-pressure pass + calm **متأخر** group on Tasks (overdue never hidden). Onboarding demo data now opt-in. |
| **4 · Home + Today + Daily Plan + Energy** | ✅ done | `daily_plans` + `daily_energy` (cloud tables, RLS, realtime, synced) + Dexie v3. `/plan` rewritten: persisted plan (auto-gen once/day), per-bucket reorder, complete-from-plan, "لماذا الآن؟", regenerate, past-days history. Morning `EnergyCheckIn` on Home feeds the planner. `LateMode` ("أنا متأخر") = deterministic triage + move-to-tomorrow (never auto-deletes). Integration test: plan + energy round-trip to cloud. |
| **5 · Tasks + Appointments** | ✅ done | `tasks` += `life_area_id, goal_id, energy_cost, context(jsonb), planned_for` (migration `20260908000000`, additive, nullable). TaskForm pickers: effort chips · plan-for-day · context tags. Planner ranking uses `energy_cost`. `CalendarProviderService` abstraction (device impl only, not advertised). Integration test: new fields round-trip. |
| **6 · Habits + Worship + Exercise + Water + Skills** | ✅ done | `habits` += `life_area_id, goal_id, tracker_kind`; new `measurements` cloud table (RLS, realtime, synced) + Dexie v4. Tracker presets (water/exercise/reading/skill) on the habits `+`. `HabitCard` count/duration targets show a real `<ProgressMeter>` (measured/target) with −/+ steppers that also keep the streak marker in sync. Integration test: measurement increments + Arabic unit round-trip. |
| **7 · Goals + Life Areas + Overview** | ✅ done | `life_areas` + `goals` + `goal_milestones` cloud tables (RLS, realtime, synced) + Dexie v5. `/areas` = Life Overview grid (counts + done-goals meter, reorder, CRUD). `/goals` + `/goals/detail` with milestones + **`computeGoalProgress`** (milestones → measurements → task completion, 6 tests). Area+Goal pickers wired into TaskForm/HabitForm. Nav: الأذكار→المجالات. 3 default areas seeded idempotently by key. Integration: area+goal+milestone round-trip. |
| **8 · Reviews + Analytics + Achievements** | ✅ done | `reviews` + `achievements` cloud tables (RLS, realtime, synced) + Dexie v6. `src/lib/analytics/periods.ts` + **`computeReview`** (deterministic day/week/month metrics — tasks done/due, habit expected-vs-done via recurrence, adhkar days, measurements, per-area completion %, strongest/weakest area, delta vs previous period; 8 tests). `/reviews` (Daily/Weekly/Monthly tabs, no-pressure copy, suggestion). `useReview` computes + persists one review per period. `achievements/catalog.ts` + `refreshAchievements` (streak_7/30, exercise_20, reading_week, first_goal, great_week — recomputed from real data, sticky unlock). `/achievements` grid (locked/unlocked + progress). Wired into `/more`. Integration test: reviews + achievements round-trip. |
| **9 · AI Assistant + Gemini (architecture-first)** | ✅ done | `ai_conversations` + `ai_memory` cloud tables (RLS, realtime, synced) + Dexie v7. **`AIProvider` abstraction** (`src/lib/ai/`): `GeminiProvider` holds **no key** — POSTs the turn + minimal context to a server proxy (`aiEndpoint()`, a Supabase Edge Function) with the user's JWT; `registry.getAIProvider()` returns `null` when AI is off / provider `none` / endpoint unconfigured → quiet fallback, rest of app unaffected. `AIUnavailableError` normalises every failure. Minimal PII-aware `buildAIContext` (today only: titles, energy, enabled memory — no ids/notes/history), sent only on a user turn and only when `shareContext` on. Deterministic `computeSuggestions` (overdue / energy / plan / streak / goal-deadline / all-done — **no AI, works offline**, 9 tests). `/assistant` chat page + suggestions. `/more/settings/ai` — enable, name, 5 personalities, memory on/off + view/disable/delete, context toggle, "what gets shared" + setup notice. New `ai` block in `UserSettings` (default **off**) with top-level backfill. Edge Function skeleton + README at `supabase/functions/ai-chat/` (not deployed). 18 AI unit tests + integration round-trip. Nav: assistant in Sidebar + `/more`. |
| 9b · Notifications + interactive actions | ⬜ | (plan phase 9 — deferred behind AI) |
| **10 · Widgets / PWA + Push** | 🟡 partial | **J3 PWA/SW done + verified**: `public/sw.js` v2 — precache every top-level route (incl. assistant/reviews/achievements/areas/goals), per-URL navigation cache, `/offline/` fallback, **Background Sync + Periodic Sync** flush the outbox on reconnect (`src/lib/pwa/outboxSync.ts` → `syncEngine.flush()`); `scripts/pwa-check.mjs` (`npm run pwa:check`) drives Chromium offline and asserts all 12 routes render + unknown→offline. **J2 widget snapshot done + verified**: `buildSnapshot()` += `v`, `now` (deterministic planner item+reason), `energy`, `goals` (real `computeGoalProgress`, ≤3 active) — one-way from the replica; existing widget Java `optString`/`optJSONArray` ignores new fields (no APK change). 4 `tests/widget/snapshot.test.ts`. **J1 native widget rendering** + **J4 FCM push** → `docs/PHASE_10_REMAINING.md` (blocked: no Android SDK/device; needs Firebase project). Migration `20260913000000_phase10_devices.sql` **created, NOT applied** (awaits approval; client sync wiring deferred until applied). |
| **11 · AI Planning + Smart Rescheduling + Autonomy** | ✅ done (see `docs/PHASE_11.md`) | `AiSettings.autonomy` (conservative/balanced/automatic) + settings selector. **`src/lib/ai/`**: `actions.ts` (5 Zod action kinds, no delete, appt-mutation forbidden), `policy.ts` (`decideAction → auto/confirm/forbidden` per autonomy; hard invariants), `pipeline.ts` (`raw → Zod+guard → policy → repos → log`; **AI never touches DB**; `processActions`/`confirmAction`/`rejectAction`). **`src/lib/planner/`**: `reschedule.ts` (deterministic — move past-window items, defer overflow tasks lowest-priority-first; no delete/no appt; loop guard = 6/day + per-item from history; Arabic reasons), `aiPlan.ts` (`computePlan` — always `buildLocalPlan`, AI re-orders/rephrases only, silent fallback, never on render). `buildLocalPlan` excludes tasks `plannedFor` a later day. `AIProvider.plan?()` + `GeminiProvider.plan()` + `ai-plan` Edge Function skeleton. `RescheduleSheet` replaces `LateMode` on `/plan`; regenerate button uses AI when available. `AiActionLog` + Dexie v8 `aiActions` (local-first). **29 new tests** (policy/pipeline/reschedule/aiPlan/localPlanner). Migration `20260914000000_phase11_ai_actions.sql` **created + local-verified, NOT applied**. |
| **12 · Gemini eval + prompt tuning** | ✅ done (see `docs/PHASE_12.md`) | **Model fix**: `gemini-1.5-flash` was **retired** (real calls 404 → assistant never answered) → **`gemini-flash-latest`** stable alias, overridable via `GEMINI_MODEL` secret. Shared `supabase/functions/_shared/gemini.ts` — timeout, `{error,code}` mapping (rate_limited/model/safety/server), safety/`finishReason` handling, lenient JSON parse. `ai-chat` prepends **immutable server-side rules** (defence vs a tampered client); memory extraction = separate strict-JSON call at temp 0. `ai-plan` deployed (JSON mode + server-side id re-validation). Prompts tuned (no-invention, concrete "لماذا الآن", never-execute). Client: 429→`rate-limited` + calm copy; "what gets shared" panel states the free-tier training caveat. `scripts/test-ai-function.mjs` extended (both functions, secret-free, 10/10). **`ai-chat` + `ai-plan` deployed to Production** (PAT, no key printed, no new key, no DB change). Real Gemini round-trip = owner-verified (needs a signed-in session). +7 tests. |
| 13 · AI Assistant deepening (voice, richer memory) | ⬜ | |
| 14 · Watch + Health + Location + Voice | ⬜ | |
| 15 · Security + Performance + Testing | ⬜ | |
| 16 · Production readiness | ⬜ | |

## Verification status (current)

- `tsc` clean · `lint` clean · `vitest` **131 pass / 11 integration skipped in CI**
- `next build` (cloud + `build:local`) clean · `cap sync android` clean
- Playwright QA (`build:local`): **36/36** screens, 360/393, RTL + dark, no overflow
- **AI functions** (`node scripts/test-ai-function.mjs`, secret-free): ai-chat + ai-plan —
  OPTIONS 200 · GET 405 · POST-no-session 401 (key present) · no key in any body — 10/10
- **PWA offline** (`npm run pwa:check`): SW installs + controls, app-shell cache = 19 entries,
  12/12 routes render offline, unknown route → `/offline/`
- **Local Supabase integration** (`RUN_SUPABASE_INTEGRATION=1 npm run test:integration`): 11/11
  1. local create → Supabase + RLS hides it from another user
  2. another device's change → local replica via realtime
  3. stale offline edit → filed as a conflict, cloud wins the replica
  4. daily plan + daily energy → round-trip to `daily_plans` / `daily_energy`
  4b. Phase-5 task fields · 4c. measurements + Arabic unit · 4d. life areas + goals + milestones → round-trip
  4e. reviews + achievements → round-trip to `reviews` / `achievements`
  4f. ai conversations + ai memory → round-trip + RLS isolates them from another user
  5. settings change → `profiles.settings`
  6. first sign-in → uploads pre-existing local rows, id-preserving, non-destructive
- **Hosted project** `qyrxtacuxojpdpujzjah`: migrations `20260906120000`, `20260906130000`,
  `20260907000000_phase4_daily` **applied** (owner-confirmed). RLS on, realtime reachable.
  `20260908000000_phase5` … `20260912000000_phase9_ai` **applied** (owner-confirmed, 2026-09-09).
  `ai_conversations` + `ai_memory` verified live (tables, `owner all` RLS policies,
  `supabase_realtime` membership) via read-only checks.
  Edge Functions `ai-chat` + `ai-plan` **deployed** to Production (`GEMINI_API_KEY` shared
  hosted secret; model `gemini-flash-latest`, overridable via `GEMINI_MODEL`; smoke test
  10/10 secret-free). Real Gemini round-trip: owner-verified (needs a signed-in session).
  **Pending (both additive, local-verified, NOT applied; client sync wiring held until applied):**
  `20260913000000_phase10_devices.sql` (Phase 10 J4 — `devices` for push + presence),
  `20260914000000_phase11_ai_actions.sql` (Phase 11 — `ai_actions` audit log).

## Not yet verified (needs a human)

A full authed round-trip **on the hosted project** — sign in with the real Google account / a
magic link, create a task on one device, see it on a second. The hosted project blocks throwaway
`@example.com` addresses, so an automated E2E there isn't possible; the identical schema + the
5 local integration tests cover the logic.

## The environment gate

With `NEXT_PUBLIC_SUPABASE_*` in `.env.local` (or Vercel env), the app is **cloud-first**: it
requires sign-in and syncs. Without them it runs exactly as the pre-cloud app (local IndexedDB,
no gate). `npm run build:local` produces the local-mode bundle used for visual QA.

**AI (phase 9):** entirely opt-in and independent of the sync gate. The assistant
stays unavailable until (a) the owner deploys the `ai-chat` Edge Function and sets
`GEMINI_API_KEY` as a Supabase secret — no key ever in the client/repo — and
(b) the user turns it on in Settings → AI assistant. `NEXT_PUBLIC_AI_ENDPOINT` is
optional (defaults to `${SUPABASE_URL}/functions/v1/ai-chat`). Deterministic
suggestions work with none of this.

## Redirect URLs to add in Supabase (Authentication → URL Configuration)

`http://localhost:3000/auth/callback` · `<your Vercel URL>/auth/callback` · `routini://auth/callback`
