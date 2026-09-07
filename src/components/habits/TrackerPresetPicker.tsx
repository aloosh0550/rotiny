"use client";

import { Droplets, Dumbbell, BookOpen, GraduationCap, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { habitsRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { habitFromPreset, TRACKER_ORDER } from "@/lib/trackers/presets";
import type { TrackerKind } from "@/lib/types";

const ICON: Record<TrackerKind, typeof Droplets> = {
  water: Droplets,
  exercise: Dumbbell,
  reading: BookOpen,
  skill: GraduationCap,
};

export function TrackerPresetPicker({
  onCustom,
  onCreated,
}: {
  onCustom: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();

  async function pick(kind: TrackerKind) {
    const habit = habitFromPreset(kind, t(`trackers.${kind}`));
    await habitsRepository.create(habit);
    await onEntityMutated({ type: "habit", op: "create", entity: habit });
    onCreated();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-text-secondary">{t("trackers.addTitle")}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {TRACKER_ORDER.map((kind) => {
          const Icon = ICON[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => void pick(kind)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-4 text-center transition-colors hover:border-accent"
            >
              <Icon className="size-6 text-accent-fg" />
              <span className="text-sm font-semibold text-text-primary">{t(`trackers.${kind}`)}</span>
              <span className="text-[11px] text-text-tertiary">{t(`trackers.${kind}Hint`)}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onCustom}
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <Plus className="size-4" />
        {t("trackers.custom")}
      </button>
    </div>
  );
}
