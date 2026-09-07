"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLifeAreas } from "@/lib/hooks/useAreasGoals";
import { goalsRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import type { Goal, GoalHorizon } from "@/lib/types";

const HORIZONS: { v: GoalHorizon; k: "goals.horizonLong" | "goals.horizonMonth" | "goals.horizonWeek" }[] = [
  { v: "long", k: "goals.horizonLong" },
  { v: "month", k: "goals.horizonMonth" },
  { v: "week", k: "goals.horizonWeek" },
];

export function GoalForm({
  goal,
  defaultAreaId,
  onDone,
}: {
  goal?: Goal;
  defaultAreaId?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const areas = useLifeAreas() ?? [];
  const isEdit = Boolean(goal);

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [horizon, setHorizon] = useState<GoalHorizon>(goal?.horizon ?? "month");
  const [lifeAreaId, setLifeAreaId] = useState(goal?.lifeAreaId ?? defaultAreaId ?? "");
  const [targetValue, setTargetValue] = useState(goal?.targetValue != null ? String(goal.targetValue) : "");
  const [targetUnit, setTargetUnit] = useState(goal?.targetUnit ?? "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const tv = Number(targetValue);
      const common = {
        title: title.trim(),
        description: description.trim() || null,
        horizon,
        lifeAreaId: lifeAreaId || null,
        targetValue: targetValue.trim() && Number.isFinite(tv) && tv > 0 ? tv : null,
        targetUnit: targetUnit.trim() || null,
        deadline: deadline || null,
      };
      if (isEdit && goal) {
        const u = await goalsRepository.update(goal.id, common);
        await onEntityMutated({ type: "goal", op: "update", entity: u });
      } else {
        const created: Goal = {
          id: generateId(),
          ...common,
          status: "active",
          parentGoalId: null,
          sync: createSyncMeta(),
        };
        await goalsRepository.create(created);
        await onEntityMutated({ type: "goal", op: "create", entity: created });
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!goal) return;
    await goalsRepository.delete(goal.id);
    await onEntityMutated({ type: "goal", op: "delete", entity: { id: goal.id } });
    onDone();
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <Input
        label={t("goals.fieldTitle")}
        placeholder={t("goals.fieldTitlePlaceholder")}
        value={title}
        dir="auto"
        onChange={(e) => setTitle(e.target.value)}
        required
        autoFocus={!isEdit}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-secondary">{t("goals.fieldHorizon")}</span>
        <div className="flex gap-2">
          {HORIZONS.map((h) => (
            <Chip key={h.v} selected={horizon === h.v} onClick={() => setHorizon(h.v)}>
              {t(h.k)}
            </Chip>
          ))}
        </div>
      </div>

      {areas.length > 0 && (
        <Select
          label={t("goals.fieldArea")}
          value={lifeAreaId}
          onChange={(e) => setLifeAreaId(e.target.value)}
          options={[
            { value: "", label: t("goals.noArea") },
            ...areas.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          label={t("goals.fieldTarget")}
          placeholder={t("common.optional")}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
        />
        <Input
          label={t("goals.fieldTargetUnit")}
          placeholder={t("common.optional")}
          value={targetUnit}
          dir="auto"
          onChange={(e) => setTargetUnit(e.target.value)}
        />
      </div>

      <DatePicker label={t("goals.fieldDeadline")} value={deadline} onChange={(e) => setDeadline(e.target.value)} />

      <Textarea
        label={t("goals.fieldDescription")}
        placeholder={t("common.optional")}
        value={description}
        dir="auto"
        onChange={(e) => setDescription(e.target.value)}
      />

      <Button type="submit" fullWidth loading={saving}>{t("common.save")}</Button>
      {isEdit && (
        <Button type="button" variant="ghost" onClick={() => void remove()} className="text-danger">
          <Trash2 className="size-4" />
          {t("common.delete")}
        </Button>
      )}
    </form>
  );
}
