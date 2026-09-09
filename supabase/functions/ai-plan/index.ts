/**
 * Routini — ai-plan Edge Function  (server-side day-plan ranker)
 * =====================================================================
 * Input  : { today, energy, locale, candidates: [{refId,refType,title,bucket,durationMinutes,reason}] }
 * Output : { order: string[], reasons?: Record<string,string> }
 *
 * The deterministic client planner produces the candidates; this only asks
 * Gemini to RE-ORDER them and optionally rephrase a reason. It cannot add,
 * remove, or edit items — the client re-validates the response and falls back
 * to its own order on anything unexpected.
 *
 * NOT deployed automatically. Setup mirrors ai-chat:
 *   supabase functions deploy ai-plan
 *   supabase secrets set GEMINI_API_KEY=...        (never in the repo/client)
 * ===================================================================== */

// @ts-nocheck  — Deno runtime types are not part of the app's tsconfig.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

const DAILY_BUDGET = 30; // plan calls per user per day (≤1/morning + a few regens)
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

const SYSTEM = [
  "أنت مساعد ترتيب يوم داخل تطبيق «روتيني».",
  "ستصلك قائمة عناصر (مهام/مواعيد/عادات) مع مدّتها والسبب المبدئي لكل عنصر.",
  "أعِد ترتيبها فقط بما يخدم يوم المستخدم (المواعيد تبقى في وقتها، الأهم أولًا، راعِ الطاقة والوقت).",
  "ممنوع إضافة أو حذف أو تعديل أي عنصر أو مدّته.",
  'أجب بصيغة JSON فقط: {"order":["refId",...],"reasons":{"refId":"سبب مختصر"}}.',
].join(" ");

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  if (overBudget(userData.user.id)) return json({ error: "daily budget reached" }, 429);

  let payload: {
    candidates?: { refId: string; title: string; bucket: string; durationMinutes: number; reason: string }[];
    energy?: string | null;
    locale?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const candidates = (payload.candidates ?? []).slice(0, 40);
  if (candidates.length === 0) return json({ order: [] });

  const userPrompt =
    `الطاقة: ${payload.energy ?? "غير محددة"}\nالعناصر:\n` +
    candidates
      .map((c) => `- id=${c.refId} | ${c.title} | ${c.bucket} | ${c.durationMinutes}د | ${c.reason}`)
      .join("\n");

  try {
    const res = await fetch(GEMINI_URL(apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return json({ error: `gemini ${res.status}` }, 502);
    const g = await res.json();
    const text = g?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "{}";
    let parsed: { order?: unknown; reasons?: unknown };
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "gemini did not return json" }, 502);
    }
    const validIds = new Set(candidates.map((c) => c.refId));
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((x: unknown) => typeof x === "string" && validIds.has(x))
      : [];
    return json({ order, reasons: parsed.reasons ?? {} });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});
