"use client";

import { useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CounterButton } from "./CounterButton";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { adhkarRepository, dhikrProgressRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { cn } from "@/lib/utils/cn";
import type { Dhikr, DhikrProgress } from "@/lib/types";

export interface DhikrCardProps {
  dhikr: Dhikr;
  progress?: DhikrProgress;
  onEdit: (dhikr: Dhikr) => void;
}

export function DhikrCard({ dhikr, progress, onEdit }: DhikrCardProps) {
  const { t } = useTranslation();
  const { show } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const count = progress?.count ?? 0;
  const completed = count >= dhikr.targetCount;

  async function handleIncrement() {
    await dhikrProgressRepository.increment(dhikr.id, todayKey(), dhikr.targetCount);
  }

  async function handleReset() {
    const prior = progress;
    if (!prior) return;
    await dhikrProgressRepository.resetForDate(dhikr.id, todayKey());
    show(t("adhkar.resetToday"), {
      action: {
        label: t("common.undo"),
        onClick: () => {
          void dhikrProgressRepository.create(prior);
        },
      },
    });
  }

  async function handleDelete() {
    await adhkarRepository.delete(dhikr.id);
    show(t("common.deleted"));
  }

  return (
    <Card
      padding="none"
      className={cn(
        "overflow-hidden transition-colors duration-200",
        completed && "border-accent-green/40 bg-accent-green-soft",
      )}
    >
      <div className="flex items-center justify-end gap-0.5 px-1.5 pt-1.5">
        {count > 0 && (
          <IconButton
            icon={<RotateCcw className="size-4" />}
            label={t("adhkar.resetToday")}
            size="sm"
            onClick={handleReset}
          />
        )}
        <IconButton
          icon={<Pencil className="size-4" />}
          label={t("common.edit")}
          size="sm"
          onClick={() => onEdit(dhikr)}
        />
        <IconButton
          icon={<Trash2 className="size-4" />}
          label={t("common.delete")}
          size="sm"
          onClick={() => setConfirmDeleteOpen(true)}
        />
      </div>

      <CounterButton
        count={count}
        target={dhikr.targetCount}
        completed={completed}
        onIncrement={handleIncrement}
        label={`${dhikr.text} — ${t("adhkar.progressLabel", { count, target: dhikr.targetCount })}`}
      >
        <p className="text-[20px] leading-arabic-relaxed text-text-primary" dir="auto">
          {dhikr.text}
        </p>
        {dhikr.transliteration && (
          <p className="text-sm leading-relaxed text-text-secondary">{dhikr.transliteration}</p>
        )}
        {dhikr.translation && (
          <p className="text-sm leading-relaxed text-text-tertiary">{dhikr.translation}</p>
        )}
        {dhikr.source && <p className="text-xs text-text-tertiary">{dhikr.source}</p>}
      </CounterButton>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        body={t("adhkar.deleteConfirm")}
      />
    </Card>
  );
}
