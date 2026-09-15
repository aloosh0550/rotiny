"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config/env";
import { ROUTES } from "@/lib/constants/routes";
import { completeAuthCallback } from "@/lib/auth/completeCallback";

/**
 * OAuth / magic-link return target. The Supabase client is created with
 * `detectSessionInUrl: true`, so simply instantiating it here exchanges the
 * `?code=` in the URL for a session. We then wait for that session and route on.
 *
 * The polling/exchange logic itself lives in `completeAuthCallback` (unit
 * tested) — this component only wires it to the URL/router and guarantees a
 * visible outcome either way. `getSupabase()` failing outright used to leave
 * this stuck on "completing sign-in…" forever with no error shown; the
 * try/catch below closes that gap.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace(ROUTES.home);
      return;
    }
    let cancelled = false;

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) {
          if (!cancelled) router.replace(ROUTES.home);
          return;
        }

        const result = await completeAuthCallback(supabase, window.location.href, {
          isCancelled: () => cancelled,
        });
        if (cancelled) return;
        if (result === "success") router.replace(ROUTES.home);
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo size={40} />
      {failed ? (
        <>
          <p className="text-sm text-text-secondary">{t("auth.genericError")}</p>
          <button
            type="button"
            className="text-sm font-semibold text-accent-fg"
            onClick={() => router.replace(ROUTES.signIn)}
          >
            {t("auth.signInTitle")}
          </button>
        </>
      ) : (
        <p className="text-sm text-text-secondary">{t("auth.completingSignIn")}</p>
      )}
    </main>
  );
}
