/**
 * Smoke-test the deployed `ai-chat` Edge Function without printing any secret.
 *
 *   node scripts/test-ai-function.mjs
 *
 * Reads (never logs): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * from the environment or .env.local. Optionally, for the positive test, one of:
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
    /* no .env.local — rely on the environment */
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ENDPOINT =
  process.env.NEXT_PUBLIC_AI_ENDPOINT?.replace(/\/$/, "") || `${URL}/functions/v1/ai-chat`;

if (!URL || !ANON) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(2);
}
console.log(`endpoint: ${ENDPOINT.replace(URL, "<project>")}`);

const body = JSON.stringify({
  provider: "gemini",
  system: "أنت مساعد اختبار. أجب بكلمة واحدة.",
  context: null,
  locale: "ar",
  messages: [{ role: "user", content: "قل: تمام" }],
});

let failures = 0;
const ok = (label, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
};

// 1) negative: no user JWT → the function's getUser() check must reject (401)
{
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${ANON}` },
    body,
  });
  ok("rejects a call with no user session (401)", res.status === 401, `got ${res.status}`);
}

// 2) positive: real user JWT → 200 + non-empty reply
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
  const j = await r.json().catch(() => ({}));
  jwt = j.access_token ?? null;
  if (!jwt) console.log("SKIP  positive test — could not sign the test user in");
}

if (jwt) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${jwt}` },
    body,
  });
  const j = await res.json().catch(() => ({}));
  ok("authenticated call returns 200", res.status === 200, `got ${res.status}`);
  ok("reply is a non-empty string", typeof j.reply === "string" && j.reply.trim().length > 0);
  if (typeof j.reply === "string") console.log(`      reply: ${j.reply.slice(0, 80)}`);
} else {
  console.log("SKIP  positive test — set SUPABASE_TEST_JWT or TEST_USER_EMAIL/PASSWORD");
}

process.exit(failures ? 1 : 0);
