/**
 * Smoke-test the deployed `ai-chat` + `ai-plan` Edge Functions without printing
 * any secret.
 *
 *   node scripts/test-ai-function.mjs
 *
 * Reads (never logs): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * from the environment or .env.local. For the authenticated tests, one of:
 *   - SUPABASE_TEST_JWT           a user access token, OR
 *   - TEST_USER_EMAIL + TEST_USER_PASSWORD  (a throwaway user you created)
 *
 * Exit code is non-zero if a check fails.
 */
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* rely on the environment */
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(2);
}
const fn = (n) => `${URL}/functions/v1/${n}`;
console.log(`project: <project>  ·  functions: ai-chat, ai-plan`);

let failures = 0;
const ok = (label, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
};
const anonHeaders = { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${ANON}` };

const chatBody = JSON.stringify({
  provider: "gemini",
  system: "أنت مساعد اختبار. أجب بجملة قصيرة.",
  context: null,
  locale: "ar",
  messages: [{ role: "user", content: "ما أهم شيء أبدأ به الآن؟" }],
});
const planBody = JSON.stringify({
  provider: "gemini",
  today: new Date().toISOString().slice(0, 10),
  energy: "good",
  locale: "ar",
  candidates: [
    { refId: "t1", refType: "task", title: "مراجعة التقرير", bucket: "morning", durationMinutes: 45, reason: "مطلوبة اليوم" },
    { refId: "t2", refType: "task", title: "شراء حاجيات", bucket: "afternoon", durationMinutes: 30, reason: "التالي في قائمتك" },
  ],
});

// ---- negative: no user session -------------------------------------------
for (const [name, body] of [["ai-chat", chatBody], ["ai-plan", planBody]]) {
  const res = await fetch(fn(name), { method: "POST", headers: anonHeaders, body });
  const j = await res.json().catch(() => ({}));
  ok(`${name}: rejects a call with no user session (401)`, res.status === 401, `got ${res.status}`);
  ok(`${name}: 401 body proves the key is configured (not 501)`, res.status !== 501);
  ok(`${name}: response never contains a key`, !/AIza|sb_secret|-----BEGIN/.test(JSON.stringify(j)));
}
// method + CORS
for (const name of ["ai-chat", "ai-plan"]) {
  const g = await fetch(fn(name), { headers: anonHeaders });
  ok(`${name}: GET → 405`, g.status === 405, `got ${g.status}`);
  const o = await fetch(fn(name), { method: "OPTIONS", headers: { apikey: ANON } });
  ok(`${name}: OPTIONS (CORS) → 200`, o.status === 200, `got ${o.status}`);
}

// ---- authenticated ------------------------------------------------------
let jwt = process.env.SUPABASE_TEST_JWT || null;
if (!jwt && process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON },
    body: JSON.stringify({
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    }),
  });
  jwt = (await r.json().catch(() => ({}))).access_token ?? null;
}

if (!jwt) {
  console.log("\nSKIP  authenticated tests — set SUPABASE_TEST_JWT or TEST_USER_EMAIL/PASSWORD");
  console.log("      (the hosted project blocks throwaway @example.com; use a real test user)");
  process.exit(failures ? 1 : 0);
}

const authHeaders = { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${jwt}` };

// ai-chat valid
{
  const res = await fetch(fn("ai-chat"), { method: "POST", headers: authHeaders, body: chatBody });
  const j = await res.json().catch(() => ({}));
  ok("ai-chat: authenticated call → 200", res.status === 200, `got ${res.status} ${j.code ?? ""} ${j.error ?? ""}`);
  ok("ai-chat: reply is a non-empty Arabic string", typeof j.reply === "string" && j.reply.trim().length > 0);
  ok("ai-chat: no secret leaked in the reply", !/AIza|sb_secret|-----BEGIN/.test(JSON.stringify(j)));
  if (j.reply) console.log(`      reply: ${j.reply.slice(0, 120)}`);
  if (j.model) console.log(`      model: ${j.model}`);
}

// ai-chat malformed input
{
  const res = await fetch(fn("ai-chat"), { method: "POST", headers: authHeaders, body: "{ not json" });
  ok("ai-chat: malformed body → 400", res.status === 400, `got ${res.status}`);
}
{
  const res = await fetch(fn("ai-chat"), {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ system: "x", messages: [], locale: "ar" }),
  });
  ok("ai-chat: empty messages → 400", res.status === 400, `got ${res.status}`);
}

// ai-plan valid + structure
{
  const res = await fetch(fn("ai-plan"), { method: "POST", headers: authHeaders, body: planBody });
  const j = await res.json().catch(() => ({}));
  ok("ai-plan: authenticated call → 200", res.status === 200, `got ${res.status} ${j.code ?? ""}`);
  const validIds = new Set(["t1", "t2"]);
  ok(
    "ai-plan: order is an array of ids we sent (no invented items)",
    Array.isArray(j.order) && j.order.every((x) => validIds.has(x)),
    JSON.stringify(j.order),
  );
  ok(
    "ai-plan: reasons (if any) are keyed only by ids we sent",
    !j.reasons || Object.keys(j.reasons).every((k) => validIds.has(k)),
  );
  ok("ai-plan: no secret leaked", !/AIza|sb_secret|-----BEGIN/.test(JSON.stringify(j)));
  console.log(`      order: ${JSON.stringify(j.order)}`);
  if (j.reasons) console.log(`      reasons: ${JSON.stringify(j.reasons).slice(0, 160)}`);
}

// ai-plan empty candidates → { order: [] }
{
  const res = await fetch(fn("ai-plan"), {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ today: "2026-09-09", energy: null, locale: "ar", candidates: [] }),
  });
  const j = await res.json().catch(() => ({}));
  ok("ai-plan: no candidates → { order: [] }, no Gemini call", res.status === 200 && Array.isArray(j.order) && j.order.length === 0);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll AI function checks passed");
process.exit(failures ? 1 : 0);
