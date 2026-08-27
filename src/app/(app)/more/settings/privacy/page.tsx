"use client";

import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";

export default function PrivacySettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.privacyTitle")} backHref={ROUTES.settings} />
      <section className="px-4">
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <ShieldCheck className="size-6" />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-text-secondary">
            {t("settings.privacyBody")}
          </p>
        </Card>
      </section>
    </div>
  );
}
