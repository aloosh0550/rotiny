# `ai-chat` — server-side AI proxy (Gemini)

The assistant is **optional**. The app works fully without it; deterministic
suggestions (`src/lib/ai/suggestions.ts`) and the deterministic day planner work
with no backend at all.

## Why a function at all

A model API key must never ship in a static client bundle. `GeminiProvider`
(client) holds **no key** — it POSTs the turn to this function, the only place
`GEMINI_API_KEY` exists.

```
client GeminiProvider ──(user JWT)──▶ ai-chat Edge Function ──(GEMINI_API_KEY)──▶ Gemini
                        { system, context, messages, locale }        { reply, memory? }
```

## Model (verified 2026-09)

- Default: **`gemini-flash-latest`** (Google's stable alias to the current GA Flash).
  Chosen deliberately over a pinned version: Google retired `gemini-1.5-flash` and
  `gemini-2.0-flash` in 2026 and `gemini-2.5-flash` is scheduled to retire — a pinned
  id needs a migration every few months. The alias always resolves to a supported
  model, and the client always has a deterministic fallback if behaviour drifts.
- Override without a code change: `supabase secrets set GEMINI_MODEL=gemini-3.5-flash`
  (or any current id). The function reports the model it used in error responses.
- Free tier (no card): ~15 RPM / 1M TPM / 1,500 RPD as of 2026 — well within a
  personal planner's use (+ per-user soft cap of 60 chat calls/day in the function).

## Privacy

**On the Gemini free tier Google may use prompts + responses to improve its models,
and human reviewers may see them** (EEA/CH/UK excepted). Mitigation: the client sends
the minimum — titles of today's items only, no notes, no deadlines, no ids, no
history — and only when the user sends a message with "Share context" on. Enabling
billing on the Google project removes this (paid-tier terms exclude training) but
also removes the free allowance.

## What the client sends

- `system` — persona + no-pressure rules (no user data). The function **prepends its
  own immutable rules** so a tampered client can't drop the safety guarantees.
- `context` — *optional*: today's date, energy, **titles** of today's tasks/habits/goals,
  enabled memory lines. Fenced in `<context>` and treated as data, not instructions.
- `messages` — this conversation's turns (`role` + `content` only)
- `locale`

## Deploy (you do this — no key in the repo)

```bash
supabase functions deploy ai-chat
supabase secrets set GEMINI_API_KEY=your_key_here
# optional:
supabase secrets set GEMINI_MODEL=gemini-3.5-flash
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` are injected automatically.
Then in the app: **Settings → AI assistant → Enable**.

## Failure handling

Returns `{ error, code, model? }` with `code ∈ rate_limited | model | safety | server`.
The client maps these to `AIUnavailableError` and shows a calm fallback — the rest of
the app is never affected.

## Verify

`node scripts/test-ai-function.mjs` — runs the unauthenticated checks always; add
`SUPABASE_TEST_JWT` or `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` (a real test user) for
the authenticated Gemini round-trip. Never prints a key.
