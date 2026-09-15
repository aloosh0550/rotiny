/**
 * Build-time guard for Routini's public cloud configuration.
 *
 * Routini degrades silently by design: when the Supabase public vars are absent
 * `isSupabaseConfigured()` is false, auth/sync/AI switch off and the app runs
 * local-only (see AuthProvider's header comment). That is correct for a local
 * or offline build — but on a Vercel *production* deploy it is almost always a
 * misconfiguration, and it fails invisibly: users get a fully working app with
 * no sign-in and no sync, and nothing anywhere reports a problem.
 *
 * This guard turns that silent failure into a loud one. It runs as `prebuild`,
 * so it gates `npm run build` (what Vercel runs) but NOT `npm run build:local`,
 * which deliberately blanks the vars for the Capacitor/offline bundle.
 *
 * It only ever reads whether the variables are NON-EMPTY. It never reads, logs,
 * prints or forwards their values.
 */

import { readFileSync } from "node:fs";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

/**
 * Next.js loads `.env.local` / `.env` itself, but this guard runs as a plain
 * Node script before it, so `process.env` alone would report a correctly
 * configured local checkout as "missing". Mirror Next's lookup order just
 * enough to answer "will `next build` see a value?" — reading only whether a
 * name has a non-empty value, never the value itself.
 *
 * On Vercel the variables come from the real environment, so this is a no-op
 * there and the production gate is unaffected.
 *
 * @param {string[]} names
 * @param {string[]} files
 * @returns {Set<string>} names that are non-empty in one of the files
 */
export function namesSetInEnvFiles(names, files = [".env.local", ".env.production", ".env"]) {
  const found = new Set();
  for (const file of files) {
    let contents;
    try {
      contents = readFileSync(file, "utf8");
    } catch {
      continue; // absent / unreadable — nothing to learn from it
    }
    for (const rawLine of contents.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const name = line.slice(0, eq).trim().replace(/^export\s+/, "");
      if (!names.includes(name)) continue;
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (value.length > 0) found.add(name);
    }
  }
  return found;
}

/**
 * Pure decision function (exported for tests). `setInFiles` carries the names
 * found in local .env files — injected rather than read here so this stays
 * deterministic and filesystem-free under test.
 *
 * @param {Record<string, string | undefined>} env
 * @param {Set<string>} [setInFiles]
 * @returns {{ ok: boolean, level: "info" | "warn" | "error", missing: string[], message: string }}
 */
export function evaluateBuildEnv(env, setInFiles = new Set()) {
  const missing = REQUIRED.filter(
    (name) => (env[name] ?? "").trim().length === 0 && !setInFiles.has(name),
  );
  const configured = missing.length === 0;
  const allowLocalOnly = (env.ROUTINI_ALLOW_LOCAL_ONLY_BUILD ?? "").trim() === "1";
  const isVercelProduction = (env.VERCEL_ENV ?? "").trim() === "production";

  if (configured) {
    return {
      ok: true,
      level: "info",
      missing: [],
      message: "cloud mode — both Supabase public vars are present.",
    };
  }

  if (isVercelProduction && !allowLocalOnly) {
    return {
      ok: false,
      level: "error",
      missing,
      message:
        `This is a Vercel PRODUCTION build but ${missing.length === REQUIRED.length ? "no" : "not every"} ` +
        `Supabase public variable is set: missing ${missing.join(", ")}.\n\n` +
        "Without them the deployed app silently runs local-only: no sign-in screen, no cloud\n" +
        "sync, no AI — for every visitor. Set them in Vercel → Project → Settings →\n" +
        "Environment Variables, scoped to the Production environment, then redeploy.\n" +
        "Both are public, client-side values (they are embedded in the browser bundle by\n" +
        "design) — they are NOT secrets like service_role or an AI key.\n\n" +
        "If you genuinely intend to ship a local-only production build, re-run with\n" +
        "ROUTINI_ALLOW_LOCAL_ONLY_BUILD=1 to acknowledge it.",
    };
  }

  const partial = missing.length > 0 && missing.length < REQUIRED.length;
  return {
    ok: true,
    level: "warn",
    missing,
    message:
      `local-only build — missing ${missing.join(", ")}. Auth, cloud sync and AI will be off.` +
      (partial
        ? "\nNote: only SOME Supabase vars are set, which is usually a typo — cloud mode needs both."
        : ""),
  };
}

function main() {
  // On Vercel this returns an empty set (no .env files in the build) and the
  // real environment decides; locally it prevents a false "missing" warning.
  const result = evaluateBuildEnv(process.env, namesSetInEnvFiles(REQUIRED));
  const prefix = "[routini] cloud config:";

  if (!result.ok) {
    console.error(`\n${prefix} BUILD BLOCKED\n\n${result.message}\n`);
    process.exit(1);
  }
  if (result.level === "warn") console.warn(`${prefix} ${result.message}`);
  else console.log(`${prefix} ${result.message}`);
}

// Run only when executed directly (not when imported by a test).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
