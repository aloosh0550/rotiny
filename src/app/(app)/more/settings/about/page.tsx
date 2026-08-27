"use client";

import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";

// Not wired to package.json — a simple hardcoded display version is fine for this phase.
const APP_VERSION = "0.1.0";

export default function AboutSettingsPage() {
  const { t } = useTranslation();
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.aboutTitle")} backHref={ROUTES.settings} />
      <section className="px-4">
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <Logo size={60} className="shadow-glow-accent" />
          <div>
            <p className="text-lg font-bold text-text-primary">{t("common.appName")}</p>
            <p className="text-xs text-text-tertiary">
              {t("settings.aboutVersion")} <span dir="ltr">{APP_VERSION}</span>
            </p>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
            {t("settings.aboutDescription")}
          </p>
          {canInstall && (
            <Button icon={<Download className="size-4" />} onClick={() => void promptInstall()}>
              {t("settings.installApp")}
            </Button>
          )}
        </Card>
      </section>
    </div>
  );
}
