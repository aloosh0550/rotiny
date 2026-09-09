/**
 * Content-Security-Policy for Routini.
 *
 * The app is a static export (`output: "export"`), so there is no server to add a
 * per-request nonce. `script-src` therefore allows `'unsafe-inline'`:
 *   - Next.js injects a per-route inline RSC-payload `<script>` whose hash differs
 *     for every page, so a shared hash list isn't possible;
 *   - `scripts/harden-static.mjs` produces a stricter, per-file hash-based policy
 *     for the web deploy (see `npm run build:web`).
 *
 * The residual risk from `'unsafe-inline'` is low: the app has no user-controlled
 * HTML sink (React escapes everything; the only `dangerouslySetInnerHTML` are two
 * static, build-fixed bootstrap scripts), and `connect-src` is locked to
 * this origin + Supabase, so an injected script cannot exfiltrate anything.
 *
 * Gemini is called ONLY from the Edge Functions (server-side) — the browser
 * never talks to `generativelanguage.googleapis.com`, so it is not allowlisted.
 */

const DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"], // React sets style="" attributes; not hashable
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"], // next/font self-hosts the fonts
  "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
  "worker-src": ["'self'"],
  "manifest-src": ["'self'"],
  "media-src": ["'self'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": [],
  // `frame-ancestors` is intentionally omitted here — it is ignored in a <meta>
  // tag. Clickjacking is covered by the `X-Frame-Options: DENY` +
  // `Content-Security-Policy: frame-ancestors 'none'` HTTP headers in vercel.json.
};

export function buildCsp(overrides?: Record<string, string[]>): string {
  const merged: Record<string, string[]> = { ...DIRECTIVES, ...overrides };
  return Object.entries(merged)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

/** The policy embedded in every page's <head> (also covers the Android WebView). */
export const CSP_META = buildCsp();
