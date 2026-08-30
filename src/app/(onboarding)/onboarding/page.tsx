"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Moon, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { settingsRepository } from "@/lib/db/repositories";
import { seedIfNeeded, CURRENT_SEED_VERSION } from "@/lib/db/seed";
import { ROUTES } from "@/lib/constants/routes";
import { DEFAULT_NOTIFICATION_PREFERENCES, type ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Step = "language" | "theme" | "notifications";
const STEPS: Step[] = ["language", "theme", "notifications"];

export default function OnboardingPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [notificationsWanted, setNotificationsWanted] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const step = STEPS[stepIndex];

  async function finish() {
    setFinishing(true);
    let notifStatus: NotificationPermission = "default";
    if (notificationsWanted && typeof Notification !== "undefined") {
      try {
        notifStatus = await Notification.requestPermission();
      } catch {
        notifStatus = "denied";
      }
    }
    await seedIfNeeded();
    await settingsRepository.update({
      locale,
      theme,
      onboardingCompleted: true,
      seedVersion: CURRENT_SEED_VERSION,
      notifications: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        enabled: notificationsWanted && notifStatus !== "denied",
      },
    });
    router.replace(ROUTES.home);
  }

  function next() {
    if (stepIndex === STEPS.length - 1) {
      void finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-between px-6 py-10">
      <div className="flex flex-col items-center gap-1 pt-4">
        <Logo size={60} className="mb-2 shadow-glow-accent" />
        <h1 className="text-xl font-bold text-text-primary">{t("onboarding.welcomeTitle")}</h1>
        <p className="text-sm text-text-tertiary">{t("onboarding.welcomeSubtitle")}</p>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {step === "language" && (
              <>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {t("onboarding.languageStepTitle")}
                  </h2>
                  <p className="text-sm text-text-tertiary">{t("onboarding.languageStepSubtitle")}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <OptionCard
                    selected={locale === "ar"}
                    onClick={() => setLocale("ar")}
                    label={t("onboarding.arabicLabel")}
                  />
                  <OptionCard
                    selected={locale === "en"}
                    onClick={() => setLocale("en")}
                    label={t("onboarding.englishLabel")}
                  />
                </div>
              </>
            )}

            {step === "theme" && (
              <>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-text-primary">
                    {t("onboarding.themeStepTitle")}
                  </h2>
                  <p className="text-sm text-text-tertiary">{t("onboarding.themeStepSubtitle")}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <OptionCard
                    selected={theme === "light"}
                    onClick={() => setTheme("light" as ThemeMode)}
                    label={t("onboarding.themeLight")}
                    icon={<Sun className="size-5" />}
                  />
                  <OptionCard
                    selected={theme === "dark"}
                    onClick={() => setTheme("dark" as ThemeMode)}
                    label={t("onboarding.themeDark")}
                    icon={<Moon className="size-5" />}
                  />
                  <OptionCard
                    selected={theme === "system"}
                    onClick={() => setTheme("system" as ThemeMode)}
                    label={t("onboarding.themeSystem")}
                    icon={<SunMoon className="size-5" />}
                  />
                </div>
              </>
            )}

            {step === "notifications" && (
              <>
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Bell className="size-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {t("onboarding.notificationsStepTitle")}
                  </h2>
                  <p className="text-sm text-text-tertiary">
                    {t("onboarding.notificationsStepSubtitle")}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <OptionCard
                    selected={notificationsWanted}
                    onClick={() => setNotificationsWanted(true)}
                    label={t("onboarding.enableNotifications")}
                    icon={<Bell className="size-5" />}
                  />
                  <button
                    type="button"
                    onClick={() => setNotificationsWanted(false)}
                    className="text-sm text-text-tertiary hover:text-text-secondary"
                  >
                    {t("onboarding.skipForNow")}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === stepIndex ? "w-6 bg-accent" : "w-1.5 bg-border-strong",
              )}
            />
          ))}
        </div>
        <Button size="lg" onClick={next} loading={finishing} fullWidth>
          {stepIndex === STEPS.length - 1 ? t("onboarding.getStarted") : t("onboarding.next")}
        </Button>
      </div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  label,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-start transition-colors duration-150",
        selected
          ? "border-accent bg-accent/10 text-text-primary"
          : "border-border bg-surface text-text-secondary hover:bg-surface-hover",
      )}
    >
      {icon}
      <span className="flex-1 text-sm font-medium">{label}</span>
      {selected && <Check className="size-5 text-accent" />}
    </button>
  );
}
