"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CategoryTabs } from "@/components/adhkar/CategoryTabs";
import { DhikrCard } from "@/components/adhkar/DhikrCard";
import { DhikrForm, type DhikrFormValues } from "@/components/adhkar/DhikrForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useDhikrCategories, useDhikrForCategory, useDhikrProgressForDate } from "@/lib/hooks/useAdhkar";
import { adhkarRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { ROUTES } from "@/lib/constants/routes";
import type { Dhikr, DhikrProgress } from "@/lib/types";

function AdhkarPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();

  const categories = useDhikrCategories();
  const requestedCategoryId = searchParams.get("category");
  const selectedCategoryId =
    (requestedCategoryId && categories?.some((c) => c.id === requestedCategoryId)
      ? requestedCategoryId
      : categories?.[0]?.id) ?? undefined;

  const dhikrList = useDhikrForCategory(selectedCategoryId);
  const progress = useDhikrProgressForDate(todayKey());
  const progressMap = useMemo(() => {
    const map = new Map<string, DhikrProgress>();
    progress?.forEach((p) => map.set(p.dhikrId, p));
    return map;
  }, [progress]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDhikr, setEditingDhikr] = useState<Dhikr | null>(null);

  const requestedAdd = searchParams.get("add") === "1";
  useEffect(() => {
    if (!requestedAdd) return;
    const id = window.setTimeout(() => {
      setEditingDhikr(null);
      setSheetOpen(true);
      const target = requestedCategoryId ? `${ROUTES.adhkar}?category=${requestedCategoryId}` : ROUTES.adhkar;
      router.replace(target, { scroll: false });
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedAdd]);

  function handleCategoryChange(categoryId: string) {
    router.replace(`${ROUTES.adhkar}?category=${categoryId}`, { scroll: false });
  }

  function openEdit(dhikr: Dhikr) {
    setEditingDhikr(dhikr);
    setSheetOpen(true);
  }

  async function handleFormSubmit(values: DhikrFormValues) {
    if (editingDhikr) {
      await adhkarRepository.update(editingDhikr.id, {
        text: values.text,
        targetCount: values.targetCount,
        categoryId: values.categoryId,
      });
      show(t("common.updated"), { tone: "success" });
    } else {
      const newDhikr: Dhikr = {
        id: generateId(),
        categoryId: values.categoryId,
        text: values.text,
        targetCount: values.targetCount,
        order: Date.now(),
        isCustom: true,
        sync: createSyncMeta(),
      };
      await adhkarRepository.create(newDhikr);
      show(t("common.saved"), { tone: "success" });
    }
    setSheetOpen(false);
  }

  if (!categories) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  const allComplete =
    (dhikrList?.length ?? 0) > 0 &&
    dhikrList!.every((d) => (progressMap.get(d.id)?.count ?? 0) >= d.targetCount);

  return (
    <div className="flex flex-col gap-3 p-4">
      <CategoryTabs
        categories={categories}
        value={selectedCategoryId ?? ""}
        onChange={handleCategoryChange}
      />

      {allComplete && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green-soft px-4 py-2.5 text-[13px] font-semibold text-accent-green">
          <CheckCircle2 className="size-4 shrink-0" />
          {t("adhkar.allCompleteTitle")}
        </div>
      )}

      {dhikrList === undefined ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : dhikrList.length === 0 ? (
        <EmptyState title={t("adhkar.noAdhkar")} />
      ) : (
        <div className="flex flex-col gap-3">
          {dhikrList.map((dhikr) => (
            <DhikrCard
              key={dhikr.id}
              dhikr={dhikr}
              progress={progressMap.get(dhikr.id)}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingDhikr ? t("adhkar.editDhikrTitle") : t("adhkar.newDhikrTitle")}
      >
        <DhikrForm
          categories={categories}
          initial={
            editingDhikr
              ? {
                  text: editingDhikr.text,
                  targetCount: editingDhikr.targetCount,
                  categoryId: editingDhikr.categoryId,
                }
              : selectedCategoryId
                ? { text: "", targetCount: 33, categoryId: selectedCategoryId }
                : undefined
          }
          onSubmit={handleFormSubmit}
          onCancel={() => setSheetOpen(false)}
        />
      </Sheet>
    </div>
  );
}

export default function AdhkarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      }
    >
      <AdhkarPageContent />
    </Suspense>
  );
}
