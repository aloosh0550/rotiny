# Auth redirect goes to `localhost:3000` on Production — manual Supabase Dashboard fix

## What's happening

After signing in on `https://rotiny.vercel.app`, Supabase redirects the
browser to `http://localhost:3000/?code=...` instead of back to the deployed
app.

## Root cause (verified by code inspection, not guessed)

The client code was checked end to end — `AuthProvider.tsx`, `signInWithOAuth`,
`signInWithOtp`, the Supabase client (`src/lib/supabase/client.ts`), and the
callback page (`src/app/auth/callback/page.tsx`). There is **no hardcoded
`localhost` anywhere in this repository**, and `redirectTo` /
`emailRedirectTo` are computed at call time from `window.location.origin` —
the *actual* page origin the browser is on. On `https://rotiny.vercel.app`
that value is `https://rotiny.vercel.app`, never localhost. This is now a
pure, unit-tested function: `src/lib/auth/redirectUrl.ts` /
`tests/auth/redirectUrl.test.ts`.

Since the app is correctly *asking* Supabase to redirect to
`https://rotiny.vercel.app/auth/callback`, and the browser ends up at
`localhost:3000` instead, the mismatch is happening on Supabase's side: **the
Supabase Auth server only honors a requested `redirectTo` if it matches an
entry in the project's Redirect URLs allowlist — otherwise it silently falls
back to the project's configured Site URL.** A Supabase project's Site URL
defaults to `http://localhost:3000` when first created (that's the local dev
default), and if it was never updated for this project, this exact symptom is
what you get: the app asks correctly, Supabase ignores it and uses its own
stored default.

## The manual fix (Supabase Dashboard — 2 minutes, no secrets involved)

Go to your Supabase project → **Authentication → URL Configuration**, and set:

- **Site URL**: `https://rotiny.vercel.app`
- **Redirect URLs** (add both — the allowlist, not a single value):
  - `https://rotiny.vercel.app/auth/callback`
  - `https://rotiny.vercel.app/**` (wildcard — covers any other path Supabase
    might redirect to, and future preview-deployment testing if you ever add
    preview URLs here too)

None of these values are secrets — they're public URLs, safe to type directly
into the dashboard.

If you also test sign-in from a Vercel **preview** deployment, its URL
(e.g. `https://rotiny-git-<branch>-<org>.vercel.app`) would need its own entry
in Redirect URLs too, since Supabase's allowlist is exact-match/wildcard, not
"any HTTPS origin." This isn't required for Production to work.

## What was NOT changed

- No hardcoded URL existed to remove.
- No `NEXT_PUBLIC_SITE_URL` was introduced — a static env var would be a
  *regression* for preview deployments (it would point every environment at
  one fixed URL); the existing `window.location.origin`-based approach
  already does the right thing per-environment with zero configuration.
- Google login and email/password (magic-link) both go through the same
  `computeAuthRedirectUrl()` — fixing the Dashboard setting fixes both at
  once, no separate handling needed.
