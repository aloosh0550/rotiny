# `ai-plan` — server-side day-plan ranker (Gemini)

Optional. The deterministic client planner (`src/lib/planner/localPlanner.ts`) is
always the engine and the always-available fallback. This function only lets
Gemini **re-order** the day's candidates and rephrase their reasons.

## Contract

```
client  computePlan()  ──(user JWT)──▶  ai-plan  ──(GEMINI_API_KEY)──▶  Gemini
   { today, energy, locale, candidates:[{refId,refType,title,bucket,durationMinutes,reason}] }
   ◀── { order: string[], reasons?: {refId: string} }   |   { error, code }
```

- No notes, deadlines, or history are sent — titles + ids + durations only.
- Gemini is asked for **strict JSON** (`responseMimeType: application/json`); the
  function also parses leniently (strips ``` fences).
- The function re-validates: `order` and `reasons` keys must be refIds it sent —
  anything else is dropped. The client re-validates again and keeps its own
  deterministic order on any failure (no user-visible break).
- It **cannot** add, remove, edit, or re-time an item, and it never emits an action —
  a `reason` string can't reach the action pipeline (`src/lib/ai/pipeline.ts`).

## Model / privacy / deploy

Same as `ai-chat` — shares `GEMINI_API_KEY` and the optional `GEMINI_MODEL` secret,
default `gemini-flash-latest`. Free-tier training caveat applies (see ai-chat README);
this path sends even less (titles + durations, no messages).

```bash
supabase functions deploy ai-plan          # GEMINI_API_KEY already set for ai-chat
```

Per-user soft cap: 30 plan calls/day. The client only calls this on an explicit
"regenerate" tap — never on render.
