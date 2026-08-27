"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useSettings } from "@/lib/hooks/useSettings";
import { settingsRepository } from "@/lib/db/repositories";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { TranslationKey } from "@/lib/i18n/paths";
import { ROUTES } from "@/lib/constants/routes";
import type { IntelligenceSettings } from "@/lib/types";

// These settings are persisted for real and are genuinely read/write here — but the NLP
// engine that would actually *consume* autoFillConfidenceThreshold / suggestFreeSlots /
// conflictDetection to change app behavior is a separate, later phase not yet built.
// This page is an honest settings surface for that future engine, nothing more.
const CONFIDENCE_OPTIONS: { value: number; labelKey: TranslationKey }[] = [
  { value: 0.75, labelKey: "settings.confidenceConservative" },
  { value: 0.6, labelKey: "settings.confidenceBalanced" },
  { value: 0.45, labelKey: "settings.confidenceBold" },
];

export default function IntelligenceSettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();

  function update(patch: Partial<IntelligenceSettings>) {
    if (!settings) return;
    void settingsRepository.update({ intelligence: { ...settings.intelligence, ...patch } });
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.intelligenceTitle")} backHref={ROUTES.settings} />
      <section className="px-4">
        {!settings ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="flex flex-col gap-4">
            <Card className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {t("settings.intelligenceEnabled")}
                </p>
                <p className="text-xs text-text-tertiary">
                  {t("settings.intelligenceEnabledSubtitle")}
                </p>
              </div>
              <Switch
                checked={settings.intelligence.nlpEnabled}
                onCheckedChange={(v) => update({ nlpEnabled: v })}
              />
            </Card>

            {!settings.intelligence.nlpEnabled && (
              <p className="px-1 text-xs text-text-tertiary">
                {t("settings.intelligenceDisabledNote")}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-text-secondary">
                {t("settings.confidenceLevel")}
              </h3>
              <div className="flex gap-2">
                {CONFIDENCE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    selected={settings.intelligence.autoFillConfidenceThreshold === opt.value}
                    onClick={() => update({ autoFillConfidenceThreshold: opt.value })}
                  >
                    {t(opt.labelKey)}
                  </Chip>
                ))}
              </div>
            </div>

            <Card className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-sm text-text-primary">{t("settings.suggestFreeSlots")}</span>
                <Switch
                  checked={settings.intelligence.suggestFreeSlots}
                  onCheckedChange={(v) => update({ suggestFreeSlots: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-3 py-3 last:pb-0">
                <span className="text-sm text-text-primary">{t("settings.conflictDetection")}</span>
                <Switch
                  checked={settings.intelligence.conflictDetection}
                  onCheckedChange={(v) => update({ conflictDetection: v })}
                />
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
