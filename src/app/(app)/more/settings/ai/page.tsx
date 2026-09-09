"use client";

import { useState } from "react";
import { Info, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAiMemory } from "@/lib/hooks/useAiMemory";
import { settingsRepository } from "@/lib/db/repositories";
import { isAiEndpointConfigured } from "@/lib/config/env";
import { ROUTES } from "@/lib/constants/routes";
import type { TranslationKey } from "@/lib/i18n/paths";
import type { AiAutonomy, AiPersonality } from "@/lib/types";

const PERSONALITIES: { value: AiPersonality; labelKey: TranslationKey }[] = [
  { value: "supportive", labelKey: "assistantSettings.personalitySupportive" },
  { value: "direct", labelKey: "assistantSettings.personalityDirect" },
  { value: "concise", labelKey: "assistantSettings.personalityConcise" },
  { value: "playful", labelKey: "assistantSettings.personalityPlayful" },
  { value: "analytical", labelKey: "assistantSettings.personalityAnalytical" },
];

const AUTONOMY: { value: AiAutonomy; labelKey: TranslationKey; hintKey: TranslationKey }[] = [
  {
    value: "conservative",
    labelKey: "assistantSettings.autonomyConservative",
    hintKey: "assistantSettings.autonomyConservativeHint",
  },
  {
    value: "balanced",
    labelKey: "assistantSettings.autonomyBalanced",
    hintKey: "assistantSettings.autonomyBalancedHint",
  },
  {
    value: "automatic",
    labelKey: "assistantSettings.autonomyAutomatic",
    hintKey: "assistantSettings.autonomyAutomaticHint",
  },
];

export default function AiSettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const memory = useAiMemory();
  const ai = settings?.ai;
  const [name, setName] = useState<string | null>(null);

  const patch = (p: Partial<NonNullable<typeof ai>>) => {
    if (!ai) return;
    void settingsRepository.update({ ai: { ...ai, ...p } });
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <SubpageHeader title={t("assistantSettings.title")} backHref={ROUTES.settings} />

      {ai && (
        <div className="flex flex-col gap-6 px-4">
          {!isAiEndpointConfigured() && (
            <Card padding="sm" className="flex gap-2.5 border-warning/30 bg-warning/5 text-xs text-text-secondary">
              <Info className="size-4 shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-text-primary">{t("assistantSettings.needsSetupTitle")}</p>
                <p className="mt-0.5">{t("assistantSettings.needsSetupBody")}</p>
              </div>
            </Card>
          )}

          <Card className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{t("assistantSettings.enable")}</p>
              <p className="text-xs text-text-tertiary">{t("assistantSettings.enableHint")}</p>
            </div>
            <Switch checked={ai.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
          </Card>

          {/* Autonomy governs the deterministic planner + rescheduler too, so it
              stays visible even when the AI assistant is off. */}
          <section className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold text-text-secondary">
                {t("assistantSettings.autonomy")}
              </h3>
              <p className="text-xs text-text-tertiary">{t("assistantSettings.autonomyHint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AUTONOMY.map((a) => (
                <Chip
                  key={a.value}
                  selected={ai.autonomy === a.value}
                  onClick={() => patch({ autonomy: a.value })}
                >
                  {t(a.labelKey)}
                </Chip>
              ))}
            </div>
            <p className="px-1 text-xs text-text-tertiary">
              {t(AUTONOMY.find((a) => a.value === ai.autonomy)!.hintKey)}
            </p>
          </section>

          {ai.enabled && (
            <>
              <section className="flex flex-col gap-2">
                <Input
                  label={t("assistantSettings.name")}
                  value={name ?? ai.assistantName}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    const v = (name ?? "").trim();
                    if (v && v !== ai.assistantName) patch({ assistantName: v });
                    setName(null);
                  }}
                />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-text-secondary">
                  {t("assistantSettings.personality")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITIES.map((p) => (
                    <Chip
                      key={p.value}
                      selected={ai.personality === p.value}
                      onClick={() => patch({ personality: p.value })}
                    >
                      {t(p.labelKey)}
                    </Chip>
                  ))}
                </div>
              </section>

              <Card className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {t("assistantSettings.shareContext")}
                  </p>
                  <p className="text-xs text-text-tertiary">{t("assistantSettings.shareContextHint")}</p>
                </div>
                <Switch checked={ai.shareContext} onCheckedChange={(v) => patch({ shareContext: v })} />
              </Card>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-text-secondary">
                  {t("assistantSettings.memory")}
                </h3>
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {t("assistantSettings.memoryEnable")}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {t("assistantSettings.memoryEnableHint")}
                    </p>
                  </div>
                  <Switch
                    checked={ai.memoryEnabled}
                    onCheckedChange={(v) => patch({ memoryEnabled: v })}
                  />
                </Card>

                {memory.items && memory.items.length > 0
                  ? memory.items.map((m) => (
                      <Card key={m.id} padding="sm" className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm ${m.enabled ? "text-text-primary" : "text-text-tertiary line-through"}`}
                          >
                            {m.text}
                          </p>
                        </div>
                        <Switch
                          checked={m.enabled}
                          onCheckedChange={(v) => void memory.setEnabled(m.id, v)}
                        />
                        <button
                          type="button"
                          aria-label={t("assistantSettings.remove")}
                          onClick={() => void memory.remove(m.id)}
                          className="text-text-tertiary hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </Card>
                    ))
                  : (
                    <p className="px-1 text-xs text-text-tertiary">
                      {t("assistantSettings.memoryEmpty")}
                    </p>
                  )}

                {memory.items && memory.items.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-start text-danger"
                    onClick={() => void memory.clearAll()}
                  >
                    {t("assistantSettings.clearAll")}
                  </Button>
                )}
              </section>
            </>
          )}

          <Card padding="sm" className="text-xs text-text-tertiary">
            <p className="font-semibold text-text-secondary">{t("assistantSettings.whatIsShared")}</p>
            <p className="mt-1 leading-relaxed">{t("assistantSettings.whatIsSharedBody")}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
