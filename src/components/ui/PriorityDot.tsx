import type { Priority } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const priorityClasses: Record<Priority, string> = {
  important: "bg-priority-important",
  normal: "bg-priority-normal",
  later: "bg-priority-later",
};

export function PriorityDot({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full shrink-0", priorityClasses[priority], className)}
      aria-hidden
    />
  );
}
