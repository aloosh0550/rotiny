# RoutinI / روتيني — Cloud-first build progress

Branch `redesign/routini-v2`. Plan: `IMPLEMENTATION_PLAN.md` (v3, cloud-first).

| Phase | State | Notes |
|---|---|---|
| **0 · Cloud-first plan** | ✅ done | `CURRENT_STATE.md` · `GAP_MATRIX.md` · `IMPLEMENTATION_PLAN.md` |
| **1 · Cloud foundation (auth)** | ✅ done + verified | Supabase client (env-gated, lazy), `AuthProvider` (Email magic-link + Google), `/sign-in`, `/auth/callback`, `routini://auth/callback`, auth gate in `(app)/layout`, `AccountCard` + sign-out on `/more`. Providers **live-verified** on the hosted project (Google + Email enabled). Dev server serves all auth routes 200. |
| **2 · DataStore + SyncEngine + cache** | ✅ done + verified | `CloudStore` (Supabase CRUD w/ RLS, pull cursor, upsert push, tombstone delete, realtime per-user, `profiles.settings` sync). `SyncEngine` (initial pull, realtime reconcile, outbox flush, server-version tracking, **cloud-wins conflict** + conflict inbox with re-apply/dismiss, one-time non-destructive local→cloud upload, sign-out wipe). Repos enqueue every mutation (env-gated). `useSyncState` + status UI on `/more/settings/sync`. **5 integration tests vs a real local Supabase, run 3× stable.** Hosted project has all 9 tables + RLS + realtime (probed via anon key). |
| **3 · Core UX + Navigation** | ⏳ next | nav rework · Home "الآن" recompose · `<ProgressMeter>` · no-pressure copy · متأخر surface · empty/skeleton parity |
| **4 · Home + Today + Daily Plan + Energy** | 🟡 partial | `localPlanner` (deterministic, 9 tests) + `NowNextCard` on Home shipped. Remaining: `daily_plans` / `daily_energy` tables + persistence + history + energy check-in + "أنا متأخر". |
| 5 · Tasks + Appointments | ⬜ | |
| 6 · Habits + Worship + Exercise + Water + Skills | ⬜ | |
| 7 · Goals + Life Areas + Overview | ⬜ | |
| 8 · Reviews + Analytics + Achievements | ⬜ | |
| 9 · Notifications + interactive actions | ⬜ | |
| 10 · Widgets / PWA + Push | ⬜ | |
| 11 · AI architecture prep (no external AI) | ⬜ | |
| 12 · Gemini eval + integration | ⬜ | no Anthropic; free-tier only |
| 13 · AI Assistant + Planning + Memory | ⬜ | |
| 14 · Watch + Health + Location + Voice | ⬜ | |
| 15 · Security + Performance + Testing | ⬜ | |
| 16 · Production readiness | ⬜ | |

## Verification status (current)

- `tsc` clean · `lint` clean · `vitest` **59 pass / 5 integration skipped in CI**
- `next build` (cloud + `build:local`) clean · `cap sync android` clean
- Playwright QA (`build:local`): **26/26** screens, 360/393, RTL + dark, no overflow
- **Local Supabase integration** (`RUN_SUPABASE_INTEGRATION=1 npm run test:integration`): 5/5
  1. local create → Supabase + RLS hides it from another user
  2. another device's change → local replica via realtime
  3. stale offline edit → filed as a conflict, cloud wins the replica
  4. settings change → `profiles.settings`
  5. first sign-in → uploads pre-existing local rows, id-preserving, non-destructive
- **Hosted project** `qyrxtacuxojpdpujzjah`: migration applied, 9/9 tables, RLS on, realtime reachable

## Not yet verified (needs a human)

A full authed round-trip **on the hosted project** — sign in with the real Google account / a
magic link, create a task on one device, see it on a second. The hosted project blocks throwaway
`@example.com` addresses, so an automated E2E there isn't possible; the identical schema + the
5 local integration tests cover the logic.

## The environment gate

With `NEXT_PUBLIC_SUPABASE_*` in `.env.local` (or Vercel env), the app is **cloud-first**: it
requires sign-in and syncs. Without them it runs exactly as the pre-cloud app (local IndexedDB,
no gate). `npm run build:local` produces the local-mode bundle used for visual QA.

## Redirect URLs to add in Supabase (Authentication → URL Configuration)

`http://localhost:3000/auth/callback` · `<your Vercel URL>/auth/callback` · `routini://auth/callback`
