"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuickAddTaskBar } from "@/components/tasks/QuickAddTaskBar";
import { TaskList } from "@/components/tasks/TaskList";
import { ROUTES } from "@/lib/constants/routes";

function QuickAddWithAutoFocus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoFocus = searchParams.get("add") === "1";

  const handleAutoFocused = useCallback(() => {
    router.replace(ROUTES.tasks);
  }, [router]);

  return <QuickAddTaskBar autoFocus={shouldAutoFocus} onAutoFocused={handleAutoFocused} />;
}

export default function TasksPage() {
  return (
    <div className="flex flex-col">
      <Suspense fallback={<QuickAddTaskBar />}>
        <QuickAddWithAutoFocus />
      </Suspense>
      <TaskList />
    </div>
  );
}
