"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { HabitList } from "@/components/habits/HabitList";
import { HabitForm } from "@/components/habits/HabitForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useHabits } from "@/lib/hooks/useHabits";
import { ROUTES } from "@/lib/constants/routes";

function AddQueryWatcher({ onDetected }: { onDetected: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      onDetected();
    }
  }, [searchParams, onDetected]);
  return null;
}

export default function HabitsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { show } = useToast();
  const habits = useHabits();
  const [addOpen, setAddOpen] = useState(false);

  const closeAdd = useCallback(() => {
    setAddOpen(false);
    router.replace(ROUTES.habits);
  }, [router]);

  // Stable across re-renders (e.g. useHabits() emitting a fresh array right after a
  // save) so AddQueryWatcher's effect only re-runs when the query string itself
  // changes — otherwise a new inline closure here re-fires the effect while the URL
  // still momentarily reads "?add=1" (router.replace hasn't landed yet), reopening
  // the sheet right after closeAdd() closed it.
  const openAdd = useCallback(() => setAddOpen(true), []);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <Suspense fallback={null}>
        <AddQueryWatcher onDetected={openAdd} />
      </Suspense>

      {habits === undefined ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          title={t("habits.noHabits")}
          subtitle={t("habits.noHabitsSubtitle")}
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              {t("habits.addHabit")}
            </Button>
          }
        />
      ) : (
        <HabitList habits={habits} />
      )}

      <Sheet open={addOpen} onClose={closeAdd} title={t("habits.newHabitTitle")}>
        <HabitForm
          onSaved={() => {
            closeAdd();
            show(t("common.saved"), { tone: "success" });
          }}
          onCancel={closeAdd}
        />
      </Sheet>
    </div>
  );
}
