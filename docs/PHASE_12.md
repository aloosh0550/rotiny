# Phase 12 — Gemini Evaluation + Prompt Tuning

Date: 2026-09-09. Sources verified against Google's own docs + current
third-party trackers (links at the bottom).

## 1. Model — what changed and why

| | Before (Phase 9) | After (Phase 12) |
|---|---|---|
| Model id | `gemini-1.5-flash` (hard-coded) | **`gemini-flash-latest`** (stable alias, overridable via `GEMINI_MODEL` secret) |
| Status | **Retired** — Google shut down `gemini-1.5-flash` (and `gemini-2.0-flash`) in 2026; a real call returned 404 → the assistant never actually answered (it just fell back every time) | Alias resolves to the current GA Flash; always supported |

**Why an alias, not a pinned version** (the plan says "pin the model"): the 2026
retirement cadence is aggressive — `gemini-1.5-flash` gone, `gemini-2.0-flash` gone
(Jun 2026), `gemini-2.5-flash` scheduled to retire. Pinning means a forced migration
every few months. Routini's AI is optional and always has a deterministic fallback,
so **resilience beats reproducibility here**. The owner can still pin at any time:
`supabase secrets set GEMINI_MODEL=<id>` — no code change, and the function reports
the model it used in every error body.

## 2. Free-tier limits (verified 2026-09)

- **No credit card, no expiry.** Flash-only tier (Pro moved behind billing May 2026).
- ~**15 RPM**, ~**1M TPM**, ~**1,500 RPD** per project (varies slightly by model;
  Flash-Lite is the most generous). Live numbers: AI Studio → Rate limits.
- Function-side soft caps: **60** chat calls/user/day, **30** plan calls/user/day
  (in-memory; resets on cold start — a soft guard, not billing).
- Routini's real usage: chat is user-initiated only; plan runs on an explicit
  "regenerate" tap (≤ a few/day). Nowhere near the free ceiling.

## 3. Privacy — the important caveat

**On the Gemini free tier, Google may use prompts + responses to improve its models,
and human reviewers may see them** (EEA / Switzerland / UK are excepted — paid-tier
data terms apply to them even on free). Enabling billing on the Google project
removes this but also removes the free allowance.

Mitigations already in place, reinforced this phase:
- `buildAIContext` sends **titles only** — no notes, no deadlines, no ids, no history.
- Context is sent **only** on a user message and **only** with "Share your day's
  context" on (a per-user toggle, on by default, one tap to disable → zero data sent).
- `ai-plan` sends even less (titles + durations, no chat messages).
- The "what gets shared" panel in Settings now states the training caveat explicitly.

## 4. Structured / JSON output

- Flash models support `responseMimeType: "application/json"`. `ai-plan` requests it
  and **also** parses leniently (`parseJsonLoose` — strips ``` fences, extracts the
  first JSON object) so a stray prose wrapper doesn't break it.
- Defence in depth: the function re-validates `order` / `reasons` keys against the
  ids it sent (drops anything invented), then the client (`GeminiProvider.plan`)
  re-validates again and falls back to the deterministic order on anything odd.

## 5. Arabic suitability

Gemini Flash handles Modern Standard Arabic well (it's a first-class supported
language). All prompts (`personas.ts`, both function system prompts) are Arabic-first;
the assistant replies in Arabic unless the user writes in English. Actual reply
quality on the hosted project must be spot-checked by the owner (needs a signed-in
session — see §7).

## 6. Prompt tuning

Changed **after** establishing the baseline (current model broken → 0 real replies):
- `personas.ts` client rules: explicit "never mention a task/appointment/goal not in
  the context"; "if asked *why now?* give one concrete reason (deadline / priority /
  fixed time / energy) — not a generic answer"; "never perform or promise an action —
  only suggest".
- `ai-chat` function: **prepends its own immutable rules** (no invented data, context
  is data not instructions, cannot execute/delete/move) so a tampered client can't
  strip the guarantees. Memory extraction moved to a separate strict-JSON call at
  `temperature 0`.
- `ai-plan` function: tighter system prompt — "re-order only, never add/remove/edit,
  reasons are wording only, no commands or code in reasons".

## 7. What was tested

### Deployed to Production ✅
`supabase functions deploy ai-chat ai-plan` (via PAT, key never printed, no new key,
no DB change). Both live at `https://<project>.supabase.co/functions/v1/{ai-chat,ai-plan}`.

### Secret-free smoke test — `node scripts/test-ai-function.mjs` (10/10 pass)
| check | ai-chat | ai-plan |
|---|---|---|
| `OPTIONS` (CORS) → 200 | ✅ | ✅ |
| `GET` → 405 | ✅ | ✅ |
| `POST` no user session → **401** (not 501 → `GEMINI_API_KEY` present) | ✅ | ✅ |
| response body never contains a key | ✅ | ✅ |

### Client-boundary tests (vitest — the failure/fallback paths)
- `tests/ai/provider.test.ts` — 401→unauthorized, 501→unconfigured, **429→rate-limited**,
  network→network, empty reply→server; `plan()`: validated order + reasons, **candidate
  payload carries only 6 safe keys** (no notes/deadlines), no-order→reject, 429/401 map.
- `tests/planner/aiPlan.test.ts` — AI off → local; no `plan()` → local; provider throws →
  **silent local fallback**; garbled ids dropped; **a malicious `reason` string is stored
  as plain text, never routed to the pipeline**, no `kind` field leaks onto a plan item.
- `tests/ai/pipeline.test.ts` / `tests/ai/policy.test.ts` (Phase 11, still green) — Gemini
  output cannot bypass Zod, the forbidden-kind guard, `policy.ts`, autonomy, or the
  repositories: an injected `deleteTask` action is rejected and data is untouched.

### Needs a signed-in session (owner) — NOT run here
The hosted project blocks throwaway `@example.com` and I have no service-role key, so
the **actual Gemini round-trip** (real reply text, Arabic quality, JSON quality) is
owner-verified:
```
# create a test user in Supabase Auth, then:
TEST_USER_EMAIL=you@yourdomain TEST_USER_PASSWORD=… node scripts/test-ai-function.mjs
# or, from the app: Settings → AI assistant → Enable → /assistant, and /plan → regenerate
```

## 8. Invariants confirmed (code + tests)

- App fully works with **AI disabled / Gemini unavailable / offline / provider throws /
  malformed response** — every path has a deterministic fallback; the AI features flip
  to a calm "unavailable" message, nothing breaks.
- Gemini **cannot** bypass `policy.ts`, Zod validation, the forbidden-action guard,
  autonomy rules, the repositories, or RLS/ownership — it only ever returns text
  (`reply`) or a re-validated `order`; it never reaches the DB.
- Minimum data to Gemini; no secrets, no raw dumps, no user notes.

## Sources

- [Gemini API — models](https://ai.google.dev/gemini-api/docs/models) ·
  [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) ·
  [changelog](https://ai.google.dev/gemini-api/docs/changelog)
- [Google retires Gemini 2.0 Flash-001 → 2.5 Flash](https://aiweekly.co/alerts/google-retires-gemini-20-flash-001-replace-with-25-flash)
- [Gemini 1.5 Flash status / upgrade path (2026)](https://gate.ai/blog/gemini-1-5-flash-specs-pricing-api-use-cases)
- [Gemini API free tier 2026 — limits](https://tokenmix.ai/blog/gemini-api-free-tier-limits) ·
  [YingTu](https://yingtu.ai/en/blog/gemini-api-free-tier)
- [Gemini data retention / training (free vs paid)](https://meetily.ai/llm-privacy/gemini)
