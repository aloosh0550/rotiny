"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config/env";
import { ROUTES } from "@/lib/constants/routes";

/**
 * OAuth / magic-link return target. The Supabase client is created with
 * `detectSessionInUrl: true`, so simply instantiating it here exchanges the
 * `?code=` in the URL for a session. We then wait for that session and route on.
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
      const supabase = await getSupabase();
      if (!supabase) {
        router.replace(ROUTES.home);
        return;
      }

      // detectSessionInUrl runs on creation; also try an explicit exchange for
      // the ?code= param (harmless if already handled).
      const url = new URL(window.location.href);
      if (url.searchParams.get("code")) {
        await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {});
      }

      for (let i = 0; i < 40 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace(ROUTES.home);
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!cancelled) setFailed(true);
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
