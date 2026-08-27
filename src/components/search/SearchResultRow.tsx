"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface SearchResultRowProps {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Optional trailing indicator, e.g. a PriorityDot. */
  trailing?: ReactNode;
}

/** Compact tappable row used inside a SearchResultsSection — icon, title, secondary line. */
export function SearchResultRow({ href, icon, title, subtitle, trailing }: SearchResultRowProps) {
  const { dir } = useTranslation();
  const ChevronIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <Link href={href}>
      <Card interactive padding="sm" className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{title}</p>
          {subtitle && <p className="truncate text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        {trailing}
        <ChevronIcon className="size-4 shrink-0 text-text-tertiary" />
      </Card>
    </Link>
  );
}
