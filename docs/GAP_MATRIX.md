# RoutinI / روتيني — GAP_MATRIX (v3 — CLOUD-FIRST)

`Current → Target → Gap → Files → Risk → Phase`

Risk: **L** additive/revertible · **M** schema / native / new dep · **H** live backend / auth / secrets / external API.
Phase numbering = `IMPLEMENTATION_PLAN.md` v3.

> Cloud (Supabase Postgres) = source of truth. Dexie = replica + offline outbox only.
> No Anthropic. Gemini optional (Phase 12+). No paid service. Phone OTP deferred.
> Code is **env-gated**: with no Supabase env → app behaves exactly as today.

---

## A. Cloud foundation (Phase 1)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| A1 | No backend, no deps | `@supabase/supabase-js` client, env-gated (null when unconfigured) | dep + `src/lib/supabase/client.ts`, `src/lib/config/env.ts` | `package.json`, new files | **M** | **1** |
| A2 | No auth | Supabase Auth — **Email (magic link) + Google**; Phone OTP deferred | `src/lib/auth/AuthProvider.tsx`, sign-in screen, `routini://auth/callback` in `DeepLinkService`/`DeepLinkHandler`, `capacitor.config.ts` | **M** (code) / **H** (live) | **1** |
| A3 | No cloud schema | Postgres schema for existing entities (`profiles, tasks, appointments, task_categories, habits, habit_completions, dhikr_categories, adhkar, dhikr_progress`) + RLS + `updated_at`/`version` triggers + Realtime publication | **`supabase/migrations/0001_initial_schema.sql`** (review file, not run here) | **H** (when applied) | **1** (file) · owner runs it |
| A4 | `output:"export"` | **unchanged** — server logic → Supabase Edge Functions | — | — | — |
| A5 | No `.env` | `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (+ later `GEMINI_*` as Edge secrets, not here) | `.env.example` | **L** | **1** |
| A6 | No CI | `.github/workflows/ci.yml` — tsc + lint + vitest + build + client-bundle secret scan | new file | **L** | **1** |
| A7 | No account UI | Sign-in screen (only when Supabase configured); first sign-in → `profiles` row + onboarding | `src/app/(auth)/**`, `(app)/layout.tsx` | **M** | **1** |

## B. DataStore + Sync + cache (Phase 2)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| B1 | Repos wrap Dexie directly | `DataStore` seam behind the **same repo interface** | `src/lib/data/DataStore.ts`, `src/lib/db/repositories/*` | **M** | **2** |
| B2 | — | `CloudStore` (Supabase CRUD, RLS) + `CacheStore` (Dexie replica) | `src/lib/data/{CloudStore,CacheStore}.ts` | **M** | **2** |
| B3 | `syncQueue` populated, never sent | `SyncEngine` — initial pull · Realtime reconcile · outbox flush · conflict inbox | `src/lib/sync/SyncEngine.ts`, repurpose `syncQueue` | **M/H** | **2** |
| B4 | `LocalNoopSyncService` | replaced by `SyncEngine` when signed in; Noop when not | `src/lib/services/sync/*` | **L** | **2** |
| B5 | `EntityType = appointment\|task\|habit\|dhikr` | + all synced entities; `onEntityMutated` enqueues every type | `src/lib/types/shared.ts`, `src/lib/services/effects/appEffects.ts` | **L** | **2** |
| B6 | Local Dexie data only | one-time id-preserving local→cloud upload on first sign-in (confirmed, non-destructive) | `src/lib/sync/migrateLocalToCloud.ts` | **M** | **2** |
| B7 | — | sign-out wipes replica + outbox | `AuthProvider`, `SyncEngine` | **L** | **2** |
| B8 | `useLiveQuery` on Dexie | **unchanged** — components keep reading the replica | — | — | — |
| B9 | Backup destructive full-replace | pre-import snapshot + opt-in merge; `BACKUP_VERSION 2` | `src/app/(app)/more/settings/backup/page.tsx`, `schemas.ts` | **M** | **2** |

## C. Core UX + Navigation (Phase 3)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| C1 | 5-item nav: Home/Appts/Tasks/Habits/Adhkar | **الرئيسية · اليوم · العادات/التتبّع · المجالات · المزيد**; Tasks/Appts/Adhkar under المزيد + their area | `layout/{BottomNav,Sidebar}.tsx`, `routes.ts`, `section.tsx` | **M** | **3** |
| C2 | Home = ~9 stacked cards | Home = one answer: **الآن** first → compact progress → المتبقي → إنجازات; rest progressive-disclosure | `src/app/(app)/page.tsx`, `home/*` | **M** | **3** |
| C3 | Progress ad-hoc per screen | unified `<ProgressMeter current target unit />` | new `ui/ProgressMeter.tsx` | **L** | **3** |
| C4 | Streak can read as pressure | no-pressure copy; missed dated items → **متأخر** (never vanish) | i18n, `StreakBadge`, missed surface | **L** | **3** / 8 |
| C5 | Onboarding seeds demo into real data | opt-in checkbox + one-tap clear | `onboarding/page.tsx`, `seed.ts` | **L** | **3** |
| C6 | Inconsistent empty/skeleton/error | parity pass on every async screen | `ui/{EmptyState,Skeleton}.tsx`, list pages | **L** | **3** |

## D. Home · Today · Daily Plan · Energy (Phase 4) — Local Planner, not AI

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| D1 | `/plan` derived, nothing persisted | `daily_plans` table (cloud) — persisted, reviewable, regenerable, reorder + "لماذا الآن؟", history | `supabase/migrations/000x`, `dailyPlansRepository`, `plan/page.tsx` | **M** | **4** |
| D2 | No energy | `daily_energy` table + morning check-in (High/Good/Medium/Low), skippable | `daily_energy`, `home/EnergyCheckIn.tsx` | **M** | **4** |
| D3 | No planner; suggestion banner = 2 rules | **`src/lib/planner/localPlanner.ts`** — pure deterministic (fixed-time anchors → priority × deadline × energy-fit) → fills الآن/التالي/buckets. Unit-tested. No network/LLM. | new `src/lib/planner/*` + tests | **M** | **4** |
| D4 | Nothing recomputes on completion | complete-anywhere → leaves المتبقي → enters إنجازات → % updates → planner re-evaluates الآن | `onEntityMutated`, planner hook, home | **M** | **4** |
| D5 | No "busy day" / "I'm late" | deterministic overload trim + reschedule menu + "أنا متأخر" triage (AI upgrade Phase 13). Never auto-deletes. | `plan/LateMode.tsx`, planner | **M** | **4** (deterministic) / **13** (AI) |

## E. Tasks + Appointments (Phase 5)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| E1 | Task has category/priority/duration | `tasks` += `life_area_id, goal_id, energy_cost, context, planned_for` (cloud columns nullable) | migration, `models.ts`, `TaskForm` | **M** | **5** |
| E2 | Appointment core complete | travel-time slot **hidden until Location** (Phase 14); keep every feature | `AppointmentForm` | **L** | **5** |
| E3 | Device calendar mirror works | keep; `CalendarProviderService` abstraction (interface + device impl) — not advertised | `services/calendar/*` | **L** | **5** |

## F. Habits + Worship + Exercise + Water + Skills (Phase 6)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| F1 | Habit has `target{count\|duration}` | += `life_area_id, goal_id`; streak/recurrence untouched | migration, `models.ts`, `HabitForm` | **M** | **6** |
| F2 | Water/Exercise = generic habits | `measurements` table + first-class trackers (Water N/day, Exercise N min×M days, Reading N pages/day) — real math, tuned UI | `measurements`, `components/trackers/*` | **M** | **6** |
| F3 | Sections fixed | **every section a `+` to add its own items** (activity/duration/time/daily-or-weekly recurrence) | tracker forms, section detail pages | **M** | **6** |
| F4 | Skills — none | Skill = goal-linked tracker (`measurements` + milestones) | `goals` + `measurements` | **L** | **6** / 7 |
| F5 | Adhkar own section | surfaced as العبادات Life Area (data unchanged) | `life_areas` link | **L** | **6** / 7 |

## G. Goals + Life Areas + Overview (Phase 7)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| G1 | Domains hard-coded | `life_areas` table — CRUD (name/icon/color/order/enabled/kind), progress + trend | migration, `areas/**`, `components/areas/*` | **M** | **7** |
| G2 | No goals | `goals` + `goal_milestones` — long→month→week→daily, current/target, deadline, status | migration, `goals/**` | **M** | **7** |
| G3 | — | goal **progress rollup** = f(milestones, linked measurements, task completion) — real, tested | `src/lib/goals/progress.ts` + tests | **M** | **7** |
| G4 | Weekly Summary only | **Life Overview** — per-area %/trend/goals/habits/tasks | `areas/page.tsx` | **L** | **7** |

## H. Reviews + Analytics + Achievements (Phase 8)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| H1 | Weekly Summary + Statistics | Daily/Weekly/Monthly/Yearly analytics — trends, streaks, area+goal progress, energy trends; **no fake numbers, all traceable** | `more/statistics/*`, `src/lib/analytics/*` + tests | **L** | **8** |
| H2 | No reviews | `reviews` table — Daily/Weekly/Monthly: أنجزت / تعثّر / تحسّن / مجالات تحتاج اهتمام / اقتراح — **deterministic, no blame** | `reviews`, `reviews/**` | **M** | **8** (AI sentence: 13) |
| H3 | No achievements | `achievements` table — calm, positive, unlock on real data only | `achievements`, `achievements/page.tsx` | **L** | **8** |

## I. Notifications (Phase 9)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| I1 | Tap = deep link only | **Complete / Snooze / Reschedule / Skip** → native `BroadcastReceiver` → **same repos → CloudStore** (no copy) | `android/.../notifications/*`, `AndroidManifest.xml`, `ReminderScheduler.ts`, JS handler | **M** | **9** |
| I2 | 6 channels, deterministic FNV ids, cap 100 | keep all; add action plumbing without breaking dedupe/ids | `ReminderScheduler.ts` | **L** | **9** |
| I3 | Denied-permission banner | honest disabled state at every entry point | notification settings | **L** | **9** |

## J. Widgets + PWA + Push (Phase 10)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| J1 | 1 widget layout, scales | **responsive content** — Now/Progress/Tasks/Habits/Goals variants by size | `android/.../widget/*`, `res/xml`, `res/layout`, `WidgetBridgeService` | **M** | **10** |
| J2 | Widget reads its own snapshot | one-way derived from the replica, no 2nd store (keep invariant) | `WidgetBridgeService.ts` | **L** | **10** |
| J3 | SW offline-first | cover new routes; background/periodic sync where supported | `public/sw.js` | **M** | **10** |
| J4 | No push | **FCM** (free) — Edge Fn sends the interactive notifications from Phase 9 | `src/lib/integrations/push/*`, `supabase/functions/push`, Firebase project | **H** | **10** |

## K. AI architecture prep — NO external AI (Phase 11)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| K1 | No AI | `AIProvider` interface + `MockProvider` (wraps `localPlanner` + canned replies, **labelled Mock**) + `GeminiProvider` **stub** | `src/lib/ai/{AIProvider,providers/*}.ts` | **M** | **11** |
| K2 | — | `actionSchemas.ts` (Zod/kind) + `policy.ts` (autonomy; delete/appt-move/sensitive always confirm) + `pipeline.ts` (`AIResult → AIAction → Zod → policy → business logic → DB`; never AI→DB) | `src/lib/ai/*` | **M** | **11** |
| K3 | — | `ai_conversations, ai_memory, ai_actions` tables (cloud, RLS) | migration, types | **M** | **11** |
| K4 | — | guardrail tests: injection in a task title must not execute an action; schema-constrained | `tests/ai/guardrails.test.ts` | **L** | **11** |
| K5 | No voice | Voice/STT **capability layer** interface + web-speech impl; native STT → Phase 14 | `src/lib/integrations/voice/*` | **M** | **11** (layer) / **14** (native) |
| K6 | — | Edge Function skeletons `ai-chat/ai-plan/ai-act` (no Gemini call yet) | `supabase/functions/*` | **L** | **11** |

## L. Gemini integration (Phase 12)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| L1 | Stub | **Investigate current Gemini free tier / limits / function-calling / Arabic → report** | doc | — | **12** |
| L2 | — | Implement `GeminiProvider` + wire the Edge Functions; `GEMINI_API_KEY` = Supabase secret. Paid feature needed → **stop, present, no Anthropic fallback** | `providers/GeminiProvider.ts`, `supabase/functions/*` | **H** | **12** |

## M. AI Assistant / Planning / Memory (Phase 13) — only if L delivered a provider

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| M1 | — | `/assistant` tab + Home prompt/mic; Arabic NL → `AIProvider.chat` → `{reply, proposedActions[]}` via the pipeline | `(app)/assistant/**`, `src/lib/ai/*` | **M** | **13** |
| M2 | Deterministic plan (Phase 4) | `AIProvider.plan` upgrades ranking; ≤1/morning + regen; deterministic `localPlanner` stays the fallback | planner, provider | **M** | **13** |
| M3 | — | autonomy MANUAL/ASSISTED/AUTO via `policy.ts`; delete never auto; appt-move always confirms; logged + undoable | `src/lib/ai/*`, settings | **M** | **13** |
| M4 | — | AI "أنا متأخر" upgrade (deterministic version in Phase 4) | `plan/LateMode.tsx` | **M** | **13** |
| M5 | — | `ai_memory` view/edit/delete/disable; preference\|pattern\|fact; unclear info never a fact; disable → nothing written/injected; assistant **name + personality** | `more/settings/ai/page.tsx`, context builder | **M** | **13** |
| M6 | — | app **100% usable with AI disabled** — deterministic path for plan/priorities/reschedule/reviews/analytics | all planner + review + analytics code | **L** (invariant) | **13** |

## N. Watch · Health · Location · Voice (Phase 14)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| N1 | No watch | `wear/` Compose module — current task, complete/snooze/skip, quick add, voice, notifications, sync to same Supabase. Minimal. | `wear/**`, `settings.gradle` | **H** | **14** |
| N2 | No health | Health Connect — READ sleep+activity, opt-in, aggregates → `health_data_refs` (cloud, RLS); planner uses only with consent | `src/lib/integrations/health/*`, migration, native dep, manifest | **H** | **14** |
| N3 | No location | Location abstraction — permission-based, on-demand, **no history**; travel-time + context | `src/lib/integrations/location/*`, `@capacitor/geolocation`, manifest | **M** | **14** |
| N4 | Device calendar only | Google/Apple/MS via Edge Fn OAuth — **only if actually wired**; abstraction ready from Phase 5 | `services/calendar/providers/*`, `supabase/functions/*` | **H** | **14** (or deferred) |
| N5 | Voice layer stub | native STT — `@capacitor-community/speech-recognition`; not ready → abstraction only, no fake | `src/lib/integrations/voice/*` | **M** | **14** |

## O. Security · Performance · Testing (Phase 15)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| O1 | No CSP | CSP + `X-Content-Type-Options` + `Referrer-Policy` + `Permissions-Policy` (static host config) | Vercel config / headers | **M** | **15** |
| O2 | — | per-user rate + daily AI budget (Edge Fn); reject unknown action kinds; Zod every boundary; size limits | `supabase/functions/*` | **M** | **12** (budget) / **15** |
| O3 | Reset + backup | local "Export my data" + "Delete all local"; **account delete/export** (cascade + `auth.users`) via Edge Fn | settings, `supabase/functions/account-delete` | **M** | **2** (local) / **15** (account) |
| O4 | — | RLS policy tests (user A ≠ user B); `security-review` skill; CI client-bundle secret scan | tests, CI | **M** | **15** |
| O5 | 46 pure-logic tests | + planner (P4), goal-progress (P7), analytics fixture (P8), AI-pipeline+guardrail with MockProvider (P11), component + Playwright e2e for the key flows, sync-conflict | `tests/**` | **M** | **4–11, 15** |
| O6 | Full `toArray()` scans | use compound indexes for hot per-date reads; optimistic-update/debounce audit; cold-Home perf budget | repos, hooks, CI | **L** | **15** |
| O7 | No CI | full gate incl. e2e + "no AI call on render/click/scroll" + perf budget | `.github/workflows/ci.yml` | **L** | **1** (basic) / **15** (full) |

## P. Production (Phase 16)

| # | Current | Target | Gap | Files | Risk | Phase |
|---|---|---|---|---|---|---|
| P1 | Manual build | full QA sweep; APK rebuild + `aapt` verify + root `Routini-debug.apk`; web deploy; release notes; **honest device-pending list** | scripts, docs | **L** | **16** |

---

## Cross-cutting invariants (every phase)

- Cloud = source of truth; Dexie = replica + outbox; server wins conflicts; conflicts surfaced.
- Env-gated: no Supabase env → app behaves exactly as today (Dexie local), all tests green.
- RLS on every table; user JWT only; **no secret in any client bundle or Git**; no secrets in logs.
- No Anthropic. AI optional, never required. Deterministic planner never called "AI".
- Free-first; Phone OTP deferred + flagged; no automatic billing.
- Additive, reversible migrations; existing user data → cloud losslessly (confirmed before local cleanup).
- Teal + section accents, Arabic-first, RTL-first, no-pressure copy, PWA, performance preserved.
- `output:"export"` unchanged; `appId com.routini.app`; label روتيني; Adhkar content + seeding untouched.
- Existing 46 tests stay green (extend, don't rewrite). No feature "done" unless end-to-end. No fake data/AI.
- `tsc` + `lint` + `vitest` + `build` (+ `assembleDebug` when native) after every phase.
