"use client";

import { ChevronLeft, ChevronRight, type LucideProps } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * Chevron that points the right way for the current writing direction.
 * `direction="forward"` = "onward / into detail" (RTL → left, LTR → right).
 * `direction="back"` = the reverse.
 */
export function DirectionalIcon({
  direction = "forward",
  ...props
}: { direction?: "forward" | "back" } & LucideProps) {
  const { dir } = useTranslation();
  const pointsLeft = direction === "forward" ? dir === "rtl" : dir === "ltr";
  const Icon = pointsLeft ? ChevronLeft : ChevronRight;
  return <Icon {...props} />;
}
