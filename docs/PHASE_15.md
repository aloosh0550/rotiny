# Phase 15 — Security + Production Hardening

Review of the whole stack (headers, CSP, auth, RLS, Edge Functions, AI pipeline,
PWA/SW, client storage, env, deps, indexes) + the fixes that were safe to make.
No Production DB change. No auth-config change. No new secret.

---

## A. Security posture — what was already solid

| Area | Status |
|---|---|
| **RLS** | **19/19 Production tables** have RLS enabled + exactly one `user_id = auth.uid()` policy (profiles: separate read/write on `id = auth.uid()`). Read-only Production audit: **zero policies without `auth.uid()`**, none permissive/`true`. |
| **Secrets** | `NEXT_PUBLIC_*` = URL + anon key only. **No secret in the client bundle** (verified: the `uuid` in the bundle is Zod's format validator, not the npm package; `GEMINI_API_KEY` appears only as an env-var *name* in a help string). **No secret ever in Git history.** CI has a client-bundle secret-scan. |
| **Edge Functions** | JWT verified (`auth.getUser`), input capped/coerced, per-user daily budget, 22 s timeout, `{error,code}` shapes, key sent only as `x-goog-api-key` to Google — never in a response, no payload/prompt logging. |
| **AI pipeline** | `resolveProposedActions (ref map) → parseAiAction (Zod) → isForbiddenActionKind → decideAction (autonomy) → repositories → RLS`. No `delete*` kind exists; appointments can't be represented. Extensively tested (Phases 11/13/15). |
| **Service Worker** | Only caches **same-origin GET** static content (HTML shells, `_next/static`, icons). Supabase is cross-origin → its API responses / tokens are **never** seen or cached by the SW. Navigations network-first, cached only on `2xx`. |
| **Client storage** | Dexie holds the user's own rows (mirrored, wiped on sign-out). No tokens in Dexie (the Supabase SDK keeps the session in its own `localStorage` key and clears it on `signOut`). Backup export = the user's own data, no tokens/secrets. |
| **`handle_new_user`** | `SECURITY DEFINER` with `search_path` set; only inserts a `profiles` row. |
| **Auth flow** | App gated behind sign-in when Supabase is configured (`(app)/layout.tsx`); `routini://auth/callback` for native; sign-out clears the SDK session **and** wipes the local replica. |

---

## B. Findings + fixes

| # | Sev | Finding | Fix (this phase) |
|---|---|---|---|
| **S1** | **High** (missing control) | No security headers or CSP at all. `output: "export"` makes `next.config.headers()` a no-op. | **`vercel.json`** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (all sensors denied), `Strict-Transport-Security` (2 y, preload — Vercel is HTTPS-only, no localhost impact), and a full `Content-Security-Policy` header incl. `frame-ancestors 'none'`. **Plus** a `<meta http-equiv="Content-Security-Policy">` in every page (`src/lib/security/csp.ts`) so the Android WebView + any non-Vercel host are covered too. `default-src 'self'`; `connect-src` locked to `'self' https://*.supabase.co wss://*.supabase.co` (Gemini is server-side only → **not** allowlisted); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-src 'none'`, `upgrade-insecure-requests`. **`script-src` allows `'unsafe-inline'`** — required: a static export injects a per-route RSC-payload inline `<script>` whose hash differs per page and there is no server for a nonce. Residual risk is low — the app has **no user-controlled HTML sink** (React escapes everything; the only two `dangerouslySetInnerHTML` are static build-fixed bootstrap scripts) and `connect-src` blocks exfiltration. `'unsafe-eval'` is **not** allowed. Verified with a new `npm run csp:check` (real browser, 19 routes, 0 violations). |
| **S2** | **Moderate** | `SyncEngine.wipeLocal` (sign-out) cleared `SYNCED_TABLES` but **not** `db.aiActions` (task titles + reasons) — leaked to the next account on a shared device. `routini:reschedule:*` localStorage also not cleared. | `wipeLocal` now clears `aiActions` (via `EXTRA_LOCAL_TABLES`) and both the `routini:sync:` and `routini:reschedule:` key prefixes. Device prefs (`routini:theme`, `routini:locale`) are deliberately kept. Test: `tests/security/local-wipe.test.ts`. |
| **S3** | **Moderate** | Interrupted sign-out (or a direct account switch race) → `SyncEngine.start(userB)` could `uploadLocalOnce` **user A's leftover local rows stamped with user B's id**, and `pullAll` would leave stale A rows behind. | `start(userId)` now reads `routini:sync:account`; if it's set to a **different** user it does a **full `wipeLocal()` first**, before any cloud call. The marker is written after the first successful pull and cleared by `wipeLocal`. Integration test: "account guard: signing in as B wipes A's leftover local rows before syncing". |
| **S4** | **Low** | Edge Function error responses forwarded Gemini's raw error text / `String(e)` — minor info disclosure of upstream internals. | `_shared/gemini.ts`: `GeminiError` now carries `detail` (server-log only) separate from `message`. Both functions return a **generic** `clientMessageFor(code)` string and `console.error` the detail server-side. `String(e)` for an unexpected error is replaced with a fixed message. |
| **S5** | **Low** (advisor) | `set_updated_at` / `set_updated_at_simple` trigger functions have a mutable `search_path` (Supabase `function_search_path_mutable`). Not practically exploitable (`authenticated` can't create objects in `public`), but a clean hardening. | **Migration `20260915000000_phase15_harden.sql`** — `create or replace` the 3 functions with `set search_path = ''` + fully-qualified `pg_catalog.now()` / `pg_catalog.coalesce`. Trigger bindings untouched. **Created + local-verified, NOT applied to Production.** |
| **S6** | Low / Info | `npm audit`: **`js-yaml` HIGH** (GHSA-2883-xcg3-v3hh) — dev-only, via `eslint`. **`uuid`/`xcode`/`@capacitor/cli` MODERATE** — iOS-only CLI build tooling, `uuid@7` v3/v5/v6-with-buffer, **not in the shipped bundle**, not reachable (Android-only project). | `npm audit fix` (non-`--force`) → `js-yaml` 4.3.1 → 4.3.2 (dev patch, no runtime change). The capacitor/xcode/uuid chain is **left as-is** — forcing it downgrades `@capacitor/cli` (breaking) to fix a non-exploitable transitive dep. Re-check every phase. |
| **S7** | Info | Supabase Auth config (leaked-password protection, OTP/JWT expiry, allowed redirect URLs) not audited/changed — the owner asked not to touch Production auth. | **Report only** — see §D. |

---

## C. Performance / indexes (reviewed, no change)

Every synced table already carries the indexes the hot queries need:
`(user_id, updated_at)` on the pull path (via the per-table `*_user_idx` /
`_user_updated_idx` added in each migration), `(user_id, status)` on `ai_actions`,
`[refType+refId]` on `measurements`, `[period+periodKey]` on `reviews`,
`(user_id, date)` on `daily_*`. The client repos still do `toArray()` scans on
Dexie — fine at a single user's data volume; **no index added without evidence of
a slow query** (per the brief). If a user accrues years of history, the compound
Dexie indexes (`[habitId+date]` etc., already declared) can be switched on then.

---

## D. What needs YOUR decision (Production / external — not touched)

1. **Apply `20260915000000_phase15_harden.sql`** — additive, corrective, local-verified. Fixes the `search_path` advisor warnings. Say the word.
2. **Supabase Auth dashboard** (Authentication → Providers / Policies):
   - Enable **"Leaked password protection"** (HaveIBeenPwned) — free, no downside.
   - Review **OTP / magic-link expiry** (default 1 h is fine; ≤ 1 h recommended).
   - **URL Configuration → Redirect URLs**: confirm the allowlist is exactly
     `https://<your-vercel-domain>/auth/callback` + `routini://auth/callback`
     and nothing wildcard.
   - These are dashboard toggles; I did not change them.
3. **`vercel.json` takes effect on the next Vercel deploy** — verify the headers
   with `curl -I https://<domain>` afterwards (look for `content-security-policy`,
   `strict-transport-security`, `x-frame-options`).
4. Still pending (unchanged): `20260913000000_phase10_devices.sql`,
   `20260914000000_phase11_ai_actions.sql`.

---

## E. Tests

| file | covers |
|---|---|
| `tests/security/csp.test.ts` (7) | restrictive `default-src`/`object-src`/`base-uri`/`form-action`; **no `unsafe-eval`, no wildcard, no `http:`**; `connect-src` = self + Supabase only, **no `generativelanguage`/`googleapis`**; `frame-ancestors` absent from meta (header-only); `upgrade-insecure-requests` |
| `tests/security/local-wipe.test.ts` (3) | sign-out clears every synced table **+ `aiActions`** + settings; clears `routini:sync:*` and `routini:reschedule:*`; **keeps** `theme`/`locale` |
| `tests/security/ai-boundary.test.ts` (7) | `delete*/cancel*/drop*/wipe*` forbidden at every layer + autonomy; appointment mutation unrepresentable; **injected delete via proposedActions → dropped, data untouched**; forged / cross-turn / path-traversal refs dropped; `automatic` can't widen the forbidden set; malformed payload → no actions; conservative never auto-applies |
| `tests/integration/sync.integration.test.ts` (+3) | **RLS: user B can't INSERT a row with A's `user_id`** (with-check); **B can't UPDATE/DELETE A's row**; **account guard wipes A's leftover local rows before B syncs, and never uploads them to B** |
| existing Phase 11/13 pipeline/policy/proposed tests | still green |

Full run: **164 pass / 14 integration skipped in CI**. `tsc` + `lint` clean.
`build` (cloud + local) clean. QA 36/36. **`csp:check` 0 violations / 19 routes**.
`pwa:check` passes. Local Supabase integration: 14/14. CI gains a `hardening`
job (`csp:check` + `pwa:check` with a real browser).

---

## F. Remaining from Phase 10

- **J1** native widget rendering — needs an Android SDK / device.
- **J4** FCM push — needs a Firebase project + `@capacitor/push-notifications`.
- Migrations `20260913000000_phase10_devices.sql` (+ Phase 11 `ai_actions`) — not applied.
- All still backlog.

---

## G. Suggested next phase

**Phase 14 (from the plan) is device/service-heavy** (Watch, Health, Location) —
mostly needs hardware + external setup. The safe, high-value slice:

1. **Voice / STT capability layer** (`§K5`) — `VoiceService` interface + a
   **Web Speech API** implementation (fully testable in the browser), wired to
   the `/assistant` input and Smart Add. Native STT stays documented as
   device-pending.
2. **Location abstraction** (`§N3`) — `LocationService` interface + a lazy
   `@capacitor/geolocation` impl, **on-demand only, no history**, behind a
   settings toggle + a contextual permission prompt. Used for the
   appointment travel-time slot (hidden until enabled). Web geolocation is
   testable.
3. Then, when you're ready for the external setup: J4 (Firebase) or Phase 12's
   Wear OS module.

Alternatively, a small **Phase 15b**: deploy the header changes (`vercel.json`),
apply the `search_path` migration, flip on leaked-password protection, and
`curl -I` verify — closing this phase end-to-end on Production.
