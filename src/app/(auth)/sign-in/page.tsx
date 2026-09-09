"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROUTES } from "@/lib/constants/routes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { configured, user, loading, signInWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  // Already signed in, or cloud not configured → this screen has no purpose.
  useEffect(() => {
    if (!configured || (!loading && user)) router.replace(ROUTES.home);
  }, [configured, user, loading, router]);

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    setBusy("email");
    setFormError(undefined);
    const { error } = await signInWithEmail(trimmed);
    setBusy(null);
    if (error) setFormError(t("auth.genericError"));
    else setSent(true);
  }

  async function handleGoogle() {
    setBusy("google");
    setFormError(undefined);
    const { error } = await signInWithGoogle();
    if (error) {
      setBusy(null);
      setFormError(t("auth.genericError"));
    }
    // on success the browser navigates away to Google
  }

  if (!configured) return null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo size={44} />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-text-primary">{t("auth.signInTitle")}</h1>
          <p className="text-sm text-text-secondary">{t("auth.signInSubtitle")}</p>
        </div>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
          <CheckCircle2 className="size-8 text-accent-fg" />
          <p className="text-sm font-semibold text-text-primary">{t("auth.checkYourEmail")}</p>
          <p className="text-xs text-text-secondary">{t("auth.magicLinkSent")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={busy === "google"}
            onClick={() => void handleGoogle()}
          >
            {t("auth.continueWithGoogle")}
          </Button>

          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="h-px flex-1 bg-border" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={(e) => void handleEmail(e)} className="flex flex-col gap-3">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              label={t("auth.email")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(undefined);
              }}
              error={emailError}
            />
            <Button type="submit" fullWidth loading={busy === "email"}>
              {t("auth.continueWithEmail")}
            </Button>
          </form>

          {formError && <p className="text-center text-xs text-danger">{formError}</p>}
        </div>
      )}
    </main>
  );
}
