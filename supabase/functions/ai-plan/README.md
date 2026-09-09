# `ai-plan` — server-side day-plan ranker (Gemini)

Optional. The deterministic client planner (`src/lib/planner/localPlanner.ts`) is
always the engine and the always-available fallback. This function only lets
Gemini **re-order** the day's candidates and rephrase their reasons.

## Contract

```
client  computePlan()  ──(user JWT)──▶  ai-plan  ──(GEMINI_API_KEY)──▶  Gemini
   { today, energy, locale, candidates:[{refId,refType,title,bucket,durationMinutes,reason}] }
   ◀── { order: string[], reasons?: {refId: string} }
```

- No notes, deadlines, or history are sent — titles + ids + durations only.
- The client re-validates `order` (must be refIds it sent) and drops anything odd.
- Any failure → the client keeps its own deterministic order (no user-visible break).

## Deploy (when ready — you do this; no key in chat/repo)

```bash
supabase functions deploy ai-plan
supabase secrets set GEMINI_API_KEY=your_key_here   # shared with ai-chat
```

`NEXT_PUBLIC_AI_ENDPOINT` overrides only `ai-chat`; `ai-plan` always resolves to
`${SUPABASE_URL}/functions/v1/ai-plan`.

## Budget / cost

`gemini-1.5-flash` free tier. Per-user soft cap `DAILY_BUDGET = 30` plan calls/day
(the client only calls this on an explicit "regenerate", never on render). No
auto-billing.
