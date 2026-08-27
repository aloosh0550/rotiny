"use client";

import { useState, type FormEvent } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { DhikrCategory } from "@/lib/types";

export interface DhikrFormValues {
  text: string;
  targetCount: number;
  categoryId: string;
}

export interface DhikrFormProps {
  categories: DhikrCategory[];
  initial?: DhikrFormValues;
  onSubmit: (values: DhikrFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function DhikrForm({ categories, initial, onSubmit, onCancel, submitting }: DhikrFormProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial?.text ?? "");
  const [targetCount, setTargetCount] = useState(String(initial?.targetCount ?? 33));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [errors, setErrors] = useState<{ text?: string; targetCount?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedText = text.trim();
    const parsedCount = Number(targetCount);
    const nextErrors: { text?: string; targetCount?: string } = {};
    if (!trimmedText) nextErrors.text = t("adhkar.fieldText");
    if (!Number.isFinite(parsedCount) || parsedCount < 1) nextErrors.targetCount = t("adhkar.fieldCount");
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit({ text: trimmedText, targetCount: Math.round(parsedCount), categoryId });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Textarea
        label={t("adhkar.fieldText")}
        placeholder={t("adhkar.fieldTextPlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={errors.text}
        rows={4}
        required
      />
      <Input
        type="number"
        min={1}
        inputMode="numeric"
        label={t("adhkar.fieldCount")}
        value={targetCount}
        onChange={(e) => setTargetCount(e.target.value)}
        error={errors.targetCount}
        required
      />
      <Select
        label={t("adhkar.fieldCategory")}
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={categories.map((c) => ({ value: c.id, label: c.title }))}
      />
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" fullWidth loading={submitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
