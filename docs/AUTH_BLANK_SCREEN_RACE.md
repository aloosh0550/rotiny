# Blank screen after Google sign-in — root cause and fix (2026-09-15)

## Symptom

Google sign-in completes (Supabase shows the new user in Authentication →
Users), but the Production app renders a blank screen afterward, or fails to
load the app shell correctly. Intermittent — sometimes it works.

This is a **different, later bug** than the two already fixed on this branch
(the missing Vercel env vars, and the `getSupabase()` multi-client race). Both
of those are confirmed still fixed; this is a third, separate defect found by
reproducing live against Production after those fixes landed.

## Root cause — proven live, not guessed

`SyncProvider` (`src/components/shared/SyncProvider.tsx`, mounted globally in
`src/app/providers.tsx`) decided what to do based on `user` alone:

```ts
if (user) { syncEngine.start(user.id); }
else { syncEngine.wipeLocal(); }        // ← fired even while still loading
```

`user` is `null` in two completely different situations: **the initial
session check hasn't resolved yet**, and **there is definitely no session**.
The code treated them the same, so `wipeLocal()` fired on *every* mount
before the real session was known — racing `DbBootstrap`'s
`ensureDefaults()` (also mounted globally, also fires on mount) for the
local Dexie `settings` row. Whichever finished last won:

- `ensureDefaults()` creates `settings` (fast — pure IndexedDB).
- `wipeLocal()` deletes it along with everything else (slightly slower — it
  calls `stop()` then clears every synced table, the sync queue, and
  `settings`).

If the wipe finished after the create, `settings` was gone — and **nothing
ever recreated it**: `(app)/layout.tsx`'s onboarding redirect itself requires
`settings` to exist first (`computeAuthGate`'s `needsOnboarding` is
`hasSettings && !onboardingCompleted`), so once `hasSettings` is false there
is no redirect left to fire and no way to reach the onboarding flow that
would normally create it. The layout renders a blank `<div>` forever. This
is worst for a **brand-new sign-up** specifically, because there's also no
pre-existing cloud settings row for `SyncEngine.start()`'s `pullSettings()`
to restore afterward — exactly matching the reported symptom.

### Reproduced live, read-only, no login required

A fresh anonymous visit to `https://rotiny.vercel.app/` was inspected via a
real headless browser, reading the actual IndexedDB `settings` row over
time:

| Time after load | `settings` row |
|---|---|
| 200ms | exists (`ensureDefaults()` won) |
| 500ms onward (checked to 4s) | **gone, permanently** |

This confirms the race exists and resolves the wrong way in practice on the
live deployment, independent of any specific login attempt.

## The fix

`src/components/shared/SyncProvider.tsx` now also reads `loading` from
`useAuth()` and does nothing until it resolves:

```ts
const action = computeSyncAction({ configured, loading, user });
// "idle" while configured is false OR the session check is still in flight
// "start" once a real session is confirmed
// "wipe" only once it's confirmed there is NO session (the real sign-out case)
```

The decision itself is extracted to `src/lib/auth/syncGate.ts`
(`computeSyncAction`) so it's unit-tested directly — mirroring the same
pattern already used for `routeGate.ts`, `redirectUrl.ts`, and
`completeCallback.ts` earlier on this branch.

This does not change the intended sign-out behavior (a *genuinely*
signed-out visitor still gets `wipeLocal()` once that's actually known) and
does not touch `SyncEngine`'s own account-switch guard (a separate,
already-tested mechanism in `SyncEngine.start()` that prevents one account's
data from leaking to another on the same device).

## What was NOT changed

- The GoTrueClient singleton fix (`src/lib/supabase/client.ts`) — still correct, unrelated to this bug.
- The redirect URL computation (`src/lib/auth/redirectUrl.ts`) — still correct.
- `DbBootstrap` — left as is; the race is closed from the other side (deferring the wipe), which is the smaller, safer change.
- RLS, CSP, security headers, or any Supabase/Vercel setting.
