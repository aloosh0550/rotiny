# `ai-chat` — server-side AI proxy (Gemini)

The assistant is **optional**. The app runs fully without it; deterministic
suggestions (`src/lib/ai/suggestions.ts`) work with no backend at all. This
function only lights up the conversational assistant.

## Why a function at all

A model API key must never ship in a static client bundle. `GeminiProvider`
(client) therefore holds **no key** — it POSTs the turn to this function, which
is the only place `GEMINI_API_KEY` exists.

```
client GeminiProvider ──(user JWT)──▶ ai-chat Edge Function ──(GEMINI_API_KEY)──▶ Gemini
                        { system, context, messages, locale }        { reply }
```

## What the client sends

Only when the user sends a message, and only the minimum:

- `system` — persona + no-pressure rules (no user data)
- `context` — *optional* (off if `settings.ai.shareContext` is false): today's
  date, energy level, **titles** of today's tasks/habits/goals, enabled memory
  lines. No ids, no notes, no history.
- `messages` — this conversation's turns (`role` + `content` only)
- `locale`

## Deploy (when you're ready — do this yourself, no key goes in the repo)

```bash
supabase functions deploy ai-chat
supabase secrets set GEMINI_API_KEY=your_key_here
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically.

If your function URL is not `https://<project>.supabase.co/functions/v1/ai-chat`,
set `NEXT_PUBLIC_AI_ENDPOINT` in the web env.

Then, in the app: **Settings → AI assistant → Enable**.

## Free-tier

`gemini-1.5-flash` has a free tier. This function adds a per-user soft daily
budget (`DAILY_BUDGET`, in-memory) and caps history + token output. There is no
auto-billing and no mandatory paid service. If you later need durable budgeting,
move the counter into a Postgres table.

## Swapping providers

Replace `callGemini` and the model id; keep the `{ reply }` response contract and
the `GeminiProvider` client stays as-is. A different provider = a new client
class implementing `AIProvider` + a branch in `src/lib/ai/registry.ts`.
