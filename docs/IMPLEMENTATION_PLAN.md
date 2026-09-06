# RoutinI / روتيني — IMPLEMENTATION_PLAN (v3 — CLOUD-FIRST)

Companion to `CURRENT_STATE.md` + `GAP_MATRIX.md`. Mode = **AUTO** (execute phases, self-verify,
continue). Stop only for a genuinely dangerous decision (data loss / secret exposure / prod break)
— e.g. creating the live Supabase project, which needs the owner's account.

**Core decision (owner — supersedes all earlier local-first plans):**
_Routini is **CLOUD-FIRST**. Supabase PostgreSQL is the single **source of truth**. Every core user
record lives in the cloud, tied to the account. Sign in on any device → the same synced data.
IndexedDB/Dexie is a **cache + offline queue only**, never authoritative._

Non-negotiables: no Anthropic ever · Gemini optional & never required · no paid service enabled ·
Phone OTP deferred · Email + Google login only for now · offline shows the last synced state ·
RLS on every table · no secret in the client bundle or Git · don't break what works · additive,
reversible migrations · preserve PWA + performance + the teal/RTL/Arabic identity.

---

## 1. NEW ARCHITECTURE

```
┌──────────────────────── CLIENT (one Next.js static build, output:"export") ────────────────────┐
│  Web (Vercel static)  ·  Android/PWA (Capacitor, webDir = out)  ·  [Wear OS later]             │
│  UI (React 19 — existing components, unchanged)                                                 │
│   └ hooks (useTasks/useHabits/… — unchanged API)                                                │
│      └ repositories/* (SAME interface — new impl)                                               │
│         └ DataStore (new seam)                                                                  │
│            ├ CloudStore → @supabase/supabase-js (anon key, RLS)  reads/writes Postgres direct   │
│            │                                                     + Realtime (per-user rows)      │
│            └ CacheStore → Dexie/IndexedDB  = REPLICA (never authoritative; wiped on sign-out)   │
│               · hydrated from Cloud on load + Realtime · UI reads here · offline writes→outbox   │
│  AIProvider → GeminiProvider(Edge Fn) | MockProvider   ·   CapabilityLayer (web/android/wear)   │
└──────────────┬───────────────────────────────────────────────────────┬─────────────────────────┘
       HTTPS + user JWT                                        HTTPS + user JWT
┌──────────────▼──────────────────────────────┐   ┌──────────────────▼────────────────────────────┐
│ SUPABASE (managed, free tier)               │   │ Supabase Edge Functions (Deno, server-side)    │
│  · Auth: Email (magic link) · Google OAuth  │   │  · ai-chat → Gemini    · ai-plan → Gemini      │
│    · Phone OTP* (deferred, paid SMS)        │   │  · ai-act  → validate+apply AIAction           │
│  · Postgres 15 = SOURCE OF TRUTH            │   │  GEMINI_API_KEY = secret (never in client)     │
│  · RLS: user_id = auth.uid() on every table │   └───────────────────────────────────────────────┘
│  · Realtime (Postgres CDC → subscribers)    │
│  · Storage (only if needed later)           │
└─────────────────────────────────────────────┘
```

**Why:** No Next.js server — `output:"export"` stays; Supabase JS client hits Postgres directly
(RLS-guarded); server logic lives in Edge Functions (free). Repository *interface* unchanged → 84
components untouched; only the impl behind `repositories/*` changes. Dexie demoted to a
reconciled replica. AI fully optional.

---

## 2. DATA FLOW

- **Read:** UI → `useTasks()` → `tasksRepository.getAll()` → **CacheStore (Dexie replica)** — instant, offline-safe. SyncEngine keeps the replica identical to Postgres via initial pull + Realtime CDC.
- **Write (online):** `repository.update()` → optimistic Dexie write (UI re-renders now) → `CloudStore` → `supabase.from(t).update()` (RLS checks `user_id`) → DB trigger bumps `updated_at`/`version` → Realtime broadcasts to all the user's devices → on echo, reconcile the replica → on error, revert + re-queue.
- **Write (offline):** optimistic Dexie write + append to **outbox** (`syncQueue` table, repurposed) with base `version` + timestamp.
- **Settings:** `profiles.settings jsonb` (mirrors today's singleton `UserSettings`). Device-only prefs stay in Dexie, unsynced.

## 3. AUTHENTICATION FLOW

- Provider: **Supabase Auth**. Methods now: **Email (magic link)** + **Google OAuth**. **Phone OTP deferred** (needs paid SMS — §9).
- Web: standard redirect. Native: `routini://auth/callback` deep link (existing infra) → `exchangeCodeForSession()`.
- Session: SDK-managed access + rotating refresh token. Storage: web `localStorage`; native `@capacitor/preferences` adapter.
- `AuthProvider` context: `{ user, session, signInWithEmail, signInWithGoogle, signOut }`.
- App requires sign-in (cloud-first). First launch → sign-in screen. First sign-in → create `profiles` row + run onboarding. Sign-out → wipe replica + outbox.
- Flow: `sign-in → session → profile exists? (no→create+onboard) → SyncEngine.initialPull(user.id) → app ready`.

## 4. OFFLINE FLOW

- Launch offline: restore cached session (no network for a non-expired token) → UI reads the replica = "last synced state" → "غير متصل" chip.
- Reads: fully available (replica). Safe writes (complete, edit, add, log, energy, reorder): optimistic + outbox. Unsafe (account changes, AI actions): disabled with "يحتاج اتصال".
- Outbox visible: "عمليات في انتظار المزامنة: N".
- Reconnect: `flushOutbox()` in order, each op with optimistic-concurrency on `version` → success removes it; **conflict → CLOUD WINS**, local attempt → "تعارضات" inbox + "أعد تطبيق تغييري"; hard error → backoff/retry. Then `pull(since=lastPulledAt)` reconciles.
- **Guarantee:** open offline → see the last synced state, never blank (if signed in once here).

## 5. SYNC FLOW

- Every row: `id uuid`, `user_id uuid`, `created_at`, `updated_at`, `deleted_at` (tombstone), `version int` (DB trigger). Maps 1:1 to the existing Dexie `SyncMeta`.
- **Initial pull:** per table, `select * where updated_at >= lastPulledAt` → upsert into Dexie (tombstones → local delete). `lastPulledAt = max(updated_at)`.
- **Live sync:** `supabase.channel('user-data').on('postgres_changes', {filter: user_id=eq.<uid>}, apply→Dexie)`. RLS-filtered — only own rows.
- **Push:** online → straight to Supabase (Realtime echo reconciles); offline → outbox.
- **Conflict (cloud-first = server wins):** low-stakes fields (toggle, counter, energy) → LWW by `updated_at`; row edited on two devices → server wins, local → inbox; delete vs edit → delete wins; conflicts **surfaced, never silently dropped**.
- **One-time migration:** first sign-in on a device with pre-cloud local data → "رفع بياناتك المحلية إلى حسابك؟" → id-preserving `upsert` into Supabase (idempotent). Nothing deleted locally until confirmed.

## 6. MULTI-DEVICE FLOW

- Phone completes a task → Supabase UPDATE → CDC → Realtime fan-out to every open client of that `user_id`. Desktop (open) flips the card in ~1 s; tablet PWA (closed) catches up on next open via `initialPull(since)`.
- Device identity: local `deviceId` (uuid in Dexie) + a `devices` row (`user_id`, `kind`, `name`, `last_seen_at`, `push_token?`).
- "Near real-time" (Realtime latency typically < 1 s) — the spec language says *near*.

## 7. AI ARCHITECTURE  (No Anthropic. Gemini target. AI never required.)

```
src/lib/ai/  AIProvider.ts (chat/plan/isAvailable)  ·  providers/{GeminiProvider,MockProvider}.ts
             actionSchemas.ts (Zod per AIAction)  ·  policy.ts (autonomy allow-lists)
             pipeline.ts  →  AIResult → AIAction[] → Zod → policy → business logic (repos) → DB   [never AI→DB]
             memory.ts  (ai_memory CRUD: view/edit/delete/disable)
supabase/functions/  ai-chat (minimal context → Gemini function-calling → {reply, proposedActions})
                     ai-plan (deterministic candidates → Gemini ranks → DailyPlan)
                     ai-act  (re-validate → policy → apply)
```

- **Deterministic Local Planner (Phase 4) is the engine.** Gemini *upgrades* plan quality + powers chat. `GeminiProvider.isAvailable()` false (flag off / unreachable / quota) → "المساعد غير متاح الآن" + silent deterministic fallback for plan/priorities/energy/reschedule/reviews/analytics.
- **Autonomy real:** MANUAL (all proposed) · ASSISTED (propose + confirm) · AUTO (allowed kinds auto within user rules). Delete never auto; appointment-move always confirms; every action → `ai_actions` (logged, reversible).
- **Cost:** no AI call on render/click/scroll; `plan` ≤ 1/morning + explicit regen; chat user-initiated; small context; per-user daily cap.

## 8. SECURITY MODEL

| Concern | Control |
|---|---|
| Secrets in client | none — only Supabase **anon** key + URL (public by design). Gemini/service keys → Supabase secrets / Edge Fn env only. |
| Per-user isolation | **RLS on every table** `using (user_id = auth.uid())`; client uses the **user JWT**, never a service-role key. |
| Service role key | Edge Functions only, never shipped, never in Git. |
| Auth | Supabase Auth, PKCE for OAuth, short access token + rotating refresh, SDK-managed; native session in secure prefs. |
| Session | auth-state listener; sign-out wipes replica+outbox; expiry auto-refresh. |
| Input validation | Zod at every boundary (before CloudStore write, before Edge Fn acts, before AIAction applies) + Postgres `check`/`not null`/FK backstop. |
| AI action | `AI → AIAction → Zod → policy → business logic → DB`; LLM never emits SQL, never touches DB; `ai-act` re-validates + rejects unknown kinds. |
| Prompt injection | user content fenced + labelled untrusted; output schema-constrained; tool args re-checked server-side. |
| Rate/budget | per-user rate + daily AI budget in the Edge Fn; oversized payloads rejected. |
| Audit | `ai_actions` + optional `activity_log` for sensitive account events. |
| Account | "تصدير بياناتي" (all rows → JSON) + "حذف الحساب وكل البيانات" (cascade + `auth.users` via Edge Fn). |
| Transport | HTTPS only; CSP + security headers on the static host. |
| Sensitive (health/location, later) | opt-in, minimal scope, aggregates only, deletable. |

## 9. COST — free vs paid

| Service | Tier | Caveats |
|---|---|---|
| **Supabase** (DB + Auth + Realtime + Edge Fns + 1 GB storage) | **Free** | 500 MB DB · 50k MAU · 5 GB egress · 500k Edge Fn inv/mo. **Free project pauses after ~7 days idle** (1-click restore; active use won't pause). No daily backups on Free → periodic manual exports. Pro $25/mo only at scale. |
| **Google OAuth** | **Free** | consent-screen review only if > 100 users. |
| **Email (magic link)** | **Free** | default SMTP ~few/hour — fine for dev; add a free provider (Resend/Brevo) later if needed. |
| **Google Gemini API** (later) | **Free tier**, rate-limited | exact limits change — verify at Phase 12; **stop & present before any paid usage**. |
| **Vercel Hobby** | **Free** | personal use. |
| **FCM push** (later) | **Free** | needs a free Firebase project. |
| **Phone OTP SMS** (deferred) | **PAID** | Supabase has no free SMS. Twilio Verify ≈ $0.05/verification; MessageBird/Vonage per-SMS ≈ $0.01–0.10 (Gulf higher). **Only mandatory paid piece, gated behind a flag, not enabled without approval.** |

**Bottom line:** $0 on free tiers. Only Phone OTP costs money, and it's deferred + flagged. No
automatic billing; any paid step is presented first.

---

## 10. PHASES

Each phase ends with: `tsc` · `lint` · `vitest` · `build` (+ `cap sync` + `assembleDebug` when
native) · `qa.mjs`. Sensitive changes are made but the **live-backend steps** (creating the
Supabase project, running the migration on it, configuring OAuth) are the owner's — the code is
built so the app runs **exactly as today when Supabase env vars are absent**, and switches to
cloud-first once they're set.

| Phase | Content | DoD |
|---|---|---|
| **0 · Cloud-first plan** ✅ | this doc + `GAP_MATRIX.md` + `CURRENT_STATE.md` updated | committed |
| **1 · Cloud foundation (code, env-gated)** | `@supabase/supabase-js`; `src/lib/config/env.ts`; `src/lib/supabase/client.ts` (null when unconfigured); `src/lib/auth/AuthProvider.tsx` (Email + Google; inert when unconfigured); native `routini://auth/callback`; sign-in screen (shown only when Supabase is configured); `.env.example`; **`supabase/migrations/0001_initial_schema.sql`** (schema + RLS + triggers + realtime for the existing entities — a review file, NOT executed here); CI workflow | app unchanged when no env; `tsc/lint/test/build` green; APK builds; SQL reviewed by owner; **owner then creates the Supabase project + runs the migration + sets env** |
| **2 · DataStore + SyncEngine + cache** | `DataStore` seam; `CloudStore` + `CacheStore`; repos re-implemented (same interface); `SyncEngine` (initial pull · Realtime reconcile · outbox flush · conflict inbox); one-time local→cloud migration offer; sign-out wipe | with env set: two devices see each other in ~1 s; offline write → queued → flushed; conflict → inbox; fresh device works after pull. Without env: current Dexie behavior, all tests green. |
| **3 · Core UX + Navigation** | nav rework (الرئيسية · اليوم · العادات/التتبّع · المجالات · المزيد); Home "الآن" shell; `<ProgressMeter>`; no-pressure copy; **متأخر** surface; empty/skeleton/error parity; demo-data opt-in | QA 360/393 RTL+dark clean; existing screens relocated not changed; accents intact |
| **4 · Home + Today + Daily Plan + Energy** | `daily_plans` + `daily_energy` (+RLS/Realtime); `EnergyCheckIn`; **deterministic `localPlanner`** ("المخطط الذكي", not AI) — الآن/التالي/buckets from time+priority+deadline+energy; persisted plan + history + "لماذا الآن؟" + regenerate; overload trim; basic reschedule (never auto-delete); deterministic "أنا متأخر" | plan persists cloud-side + syncs; energy changes ordering; complete-anywhere updates الآن + % live; planner unit-tested |
| **5 · Tasks + Appointments** | `tasks` += `life_area_id, goal_id, energy_cost, context, planned_for`; `TaskForm` optional pickers; keep every feature; appointment travel-time slot hidden until Location; `CalendarProviderService` abstraction (device impl only) | no regression; device-calendar mirror still works; new columns nullable |
| **6 · Habits + Worship + Exercise + Water + Skills** | `habits` += `life_area_id, goal_id`; `measurements` table; first-class trackers (Water N/day, Exercise N min×M days, Reading N pages/day, Skills→goal) with real current/target; each section has a **`+` to add its own items** (activity/duration/time/daily-or-weekly recurrence); Adhkar = العبادات area | existing habit/streak/recurrence tests green; tracker create→log→progress end-to-end + syncs |
| **7 · Goals + Life Areas + Overview** | `life_areas, goals, goal_milestones` tables; Life Areas CRUD (name/icon/color/order/enabled/kind); goals long→month→week→daily; **progress rollup** = f(milestones, linked measurements, task completion); Life Overview page | area CRUD + reorder sync; goal progress from real activity; Overview from real data |
| **8 · Reviews + Analytics + Achievements** | `reviews, achievements` tables; Daily/Weekly/Monthly/Yearly analytics — trends, streaks, area/goal progress, energy trends, **all traceable, no fake numbers**; reviews deterministic + no blame; calm achievements on real milestones | metrics match a hand-computed fixture; reviews render offline; achievements only on real data |
| **9 · Notifications + interactive actions** | native `NotificationActionReceiver` — Complete/Snooze/Reschedule/Skip → through the **same repos → CloudStore** (no copy); `ReminderScheduler` `actionTypeId`; honest disabled state | actions mutate real cloud data on tap (JS-verified; on-device = device-pending); dedupe/ids intact; APK builds |
| **10 · Widgets / PWA + Push** | responsive widget content (Now/Progress/Tasks/Habits/Goals); widget reads the replica (one-way); **FCM push** (free) via Edge Fn; SW offline coverage for new routes | widget resizes change content; push → interactive notification (server→device tested; display = device-pending); PWA installable + offline |
| **11 · AI architecture prep** | `ai_conversations, ai_memory, ai_actions` tables; `AIProvider` + `MockProvider` + `GeminiProvider` stub; `actionSchemas` + `policy` + `pipeline`; Edge Fn skeletons (no Gemini call); guardrail tests | pipeline end-to-end with MockProvider (fake "plan day" → validate → policy → real `daily_plan`); injection payloads don't execute actions; no external call, no key |
| **12 · Gemini integration + free-tier eval** | investigate current Gemini free tier → report → implement `GeminiProvider` + `ai-*` Edge Fns; `GEMINI_API_KEY` = Supabase secret; if a needed feature is paid → **stop, present, no Anthropic fallback** | assistant answers in Arabic via Gemini free tier; key never in client; graceful "unavailable"; deterministic fallback intact |
| **13 · AI Assistant + Planning + Rescheduling + Memory** | `/assistant` tab + Home prompt/mic; `AIProvider.plan` upgrades the plan (≤1/morning + regen); autonomy wired; AI "أنا متأخر"; `ai_memory` view/edit/delete/disable + name/personality; reviews gain optional AI sentence | 3 autonomy levels differ (tested); nothing auto-deleted; memory user-controlled; **app 100% usable with AI off**; no AI call on render; budget enforced |
| **14 · Galaxy Watch + Health Connect + Location + Voice** | `wear/` Compose module (current task · complete/snooze/skip · quick add · voice · notifications · sync to same Supabase); Health Connect (READ sleep+activity, opt-in, aggregates→`health_data_refs`); Location (`@capacitor/geolocation`, on-demand, no history); Voice/STT capability layer | watch shows today + completes + syncs; health aggregates feed planner only with consent; location on-demand only |
| **15 · Security + Performance + Testing** | CSP + headers; rate/budget limits; secure token storage; **Phone OTP** enablement path documented + gated; account export + delete; RLS policy tests; `security-review`; index hot queries; component + Playwright e2e for the key flows; "no AI call on render" assertion | §8 checklist ticked; e2e green in CI; RLS tests (A≠B); perf budget met; no secret in any bundle |
| **16 · Production readiness** | full QA sweep; APK rebuild + `aapt` verify + root `Routini-debug.apk`; web deploy; release notes; honest device-pending list | every prior DoD holds; APK at path + root copy; web live; Supabase healthy |

---

## Invariants (every phase)

- **Cloud (Supabase Postgres) is the source of truth.** Dexie = wipe-and-rebuild replica + offline outbox, always reconciled server-wins.
- Signed in on any device → the same account data; any change propagates.
- Open offline → the **last synced** state (never blank, if signed in once here).
- **RLS on every table**; client uses the user JWT; **no service-role key, no secret in any client bundle or Git**.
- **No Anthropic.** AI = Gemini via `AIProvider`; AI **never** required — deterministic Local Planner + local analytics + local reviews are the always-on engine. The deterministic planner is **never** marketed as "AI".
- **Free-first.** No mandatory paid service except Phone OTP SMS (deferred, flagged). No automatic billing.
- Preserve identity: teal + section accents (home teal · appointments indigo · tasks amber · habits green · adhkar violet · more/search slate), Arabic-first, RTL-first, calm/no-pressure copy, PWA, performance.
- Additive, reversible schema changes; existing user data migrated to cloud losslessly (id-preserving upsert, confirmed before any local cleanup). Existing 46 tests stay green (extend, don't rewrite).
- `output:"export"` unchanged — server logic in Supabase Edge Functions.
- `appId com.routini.app`, label روتيني. Adhkar religious content + idempotent seeding untouched.
- No feature "done" unless end-to-end. No fake data / fake AI. Missing capability → stop and report.

---

## STOP points (owner intervention required)

1. **Create the Supabase project** — owner's account. Then provide `NEXT_PUBLIC_SUPABASE_URL` + anon key (safe). `service_role` key stays with the owner.
2. **Run `supabase/migrations/0001_initial_schema.sql`** on that project (owner runs it, or approves me applying it via the Supabase CLI once linked).
3. **Configure Google OAuth** (Google Cloud console → client ID/secret → paste into Supabase).
4. Later: Gemini API key (Phase 12), FCM (Phase 10), SMS provider if Phone OTP is ever wanted (Phase 15).

Until #1–#3 are done, the app keeps running in today's local Dexie mode; all cloud code is present
but inert (env-gated). Everything else — Phases 3–11 UI/logic/schema-file work — proceeds in AUTO.
