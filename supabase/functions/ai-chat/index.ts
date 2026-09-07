/**
 * Routini — ai-chat Edge Function  (server-side AI proxy)
 * =====================================================================
 * The ONLY place a Gemini API key ever lives. The client (`GeminiProvider`)
 * POSTs { system, context, messages, locale } here with the user's Supabase
 * JWT; this function verifies the user, calls Gemini, and returns { reply }.
 *
 * NOT deployed automatically. To turn the assistant on for real:
 *   1. supabase functions deploy ai-chat
 *   2. supabase secrets set GEMINI_API_KEY=...        (never in the repo/client)
 *   3. (optional) set NEXT_PUBLIC_AI_ENDPOINT if the URL isn't the default
 * See ./README.md.
 *
 * Provider is swappable: replace `callGemini` + the model id, keep the contract.
 * ===================================================================== */

// @ts-nocheck  — Deno runtime types are not part of the app's tsconfig.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

// Per-user, per-day soft budget (calls). Cheap in-memory guard; move to a table
// if you need it durable across cold starts.
const DAILY_BUDGET = 60;
const counters = new Map<string, { day: string; n: number }>();

function overBudget(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const c = counters.get(userId);
  if (!c || c.day !== day) {
    counters.set(userId, { day, n: 1 });
    return false;
  }
  c.n += 1;
  return c.n > DAILY_BUDGET;
}

async function callGemini(apiKey: string, system: string, contents: unknown[]): Promise<string> {
  const res = await fetch(GEMINI_URL(apiKey), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  return (text ?? "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "method" }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY not set" }, 501);

  // verify the caller
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  if (overBudget(userData.user.id)) return json({ error: "daily budget reached" }, 429);

  let payload: {
    system?: string;
    context?: string | null;
    locale?: string;
    messages?: { role: string; content: string }[];
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const system = String(payload.system ?? "").slice(0, 4000);
  const history = (payload.messages ?? []).slice(-20);
  const contents: unknown[] = [];
  if (payload.context) {
    contents.push({ role: "user", parts: [{ text: String(payload.context).slice(0, 6000) }] });
    contents.push({ role: "model", parts: [{ text: "حسنًا." }] });
  }
  for (const m of history) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content).slice(0, 4000) }],
    });
  }

  try {
    const reply = await callGemini(apiKey, system, contents);
    if (!reply) return json({ error: "empty" }, 502);
    // Memory extraction is intentionally omitted here — add a second Gemini call
    // that returns strict JSON if you want it, and echo `memory: [...]`.
    return json({ reply });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});
