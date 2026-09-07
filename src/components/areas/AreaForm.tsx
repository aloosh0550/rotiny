"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { AreaIcon, AREA_ICONS } from "./AreaIcon";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { lifeAreasRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import type { LifeArea, LifeAreaKind } from "@/lib/types";

const COLORS = ["violet", "green", "cyan", "amber", "indigo", "orange", "red", "blue", "pink", "slate"];
const KIND_LABEL: Record<LifeAreaKind, "areas.kindWorship" | "areas.kindExercise" | "areas.kindHabits" | "areas.kindLearning" | "areas.kindWork" | "areas.kindHealth" | "areas.kindMoney" | "areas.kindFamily" | "areas.kindCustom"> = {
  worship: "areas.kindWorship",
  exercise: "areas.kindExercise",
  habits: "areas.kindHabits",
  learning: "areas.kindLearning",
  work: "areas.kindWork",
  health: "areas.kindHealth",
  money: "areas.kindMoney",
  family: "areas.kindFamily",
  custom: "areas.kindCustom",
};
const KINDS = Object.keys(KIND_LABEL) as LifeAreaKind[];

export function AreaForm({ area, onDone }: { area?: LifeArea; onDone: () => void }) {
  const { t } = useTranslation();
  const isEdit = Boolean(area);
  const [name, setName] = useState(area?.name ?? "");
  const [icon, setIcon] = useState(area?.icon ?? "circle");
  const [color, setColor] = useState(area?.color ?? "slate");
  const [kind, setKind] = useState<LifeAreaKind>(area?.kind ?? "custom");
  const [enabled, setEnabled] = useState(area?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit && area) {
        const u = await lifeAreasRepository.update(area.id, { name: name.trim(), icon, color, kind, enabled });
        await onEntityMutated({ type: "lifeArea", op: "update", entity: u });
      } else {
        const created: LifeArea = {
          id: generateId(),
          key: `custom-${generateId().slice(0, 8)}`,
          name: name.trim(),
          icon,
          color,
          kind,
          enabled,
          order: 999,
          sync: createSyncMeta(),
        };
        await lifeAreasRepository.create(created);
        await onEntityMutated({ type: "lifeArea", op: "create", entity: created });
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!area) return;
    await lifeAreasRepository.delete(area.id);
    await onEntityMutated({ type: "lifeArea", op: "delete", entity: { id: area.id } });
    onDone();
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <Input label={t("areas.fieldName")} value={name} dir="auto" onChange={(e) => setName(e.target.value)} required autoFocus={!isEdit} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-secondary">{t("areas.fieldIcon")}</span>
        <div className="flex flex-wrap gap-2">
          {AREA_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={`flex size-10 items-center justify-center rounded-lg border ${
                icon === ic ? "border-accent bg-accent-soft text-accent-fg" : "border-border text-text-secondary"
              }`}
            >
              <AreaIcon name={ic} className="size-5" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-secondary">{t("areas.fieldColor")}</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              style={{ background: `var(--accent-${c})` }}
              className={`size-8 rounded-full ${color === c ? "ring-2 ring-text-primary ring-offset-2 ring-offset-surface" : ""}`}
            />
          ))}
        </div>
      </div>

      <Select
        label={t("areas.fieldKind")}
        value={kind}
        onChange={(e) => setKind(e.target.value as LifeAreaKind)}
        options={KINDS.map((k) => ({ value: k, label: t(KIND_LABEL[k]) }))}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">{t("areas.enabled")}</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} label={t("areas.enabled")} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" fullWidth loading={saving}>{t("common.save")}</Button>
      </div>

      {isEdit && (
        <Button type="button" variant="ghost" onClick={() => void remove()} className="text-danger">
          <Trash2 className="size-4" />
          {t("areas.deleteArea")}
        </Button>
      )}
    </form>
  );
}
