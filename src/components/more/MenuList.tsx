"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface MenuListItem {
  href: string;
  icon: ReactNode;
  label: string;
  subtitle?: string;
  badge?: string | number;
}

/** Reusable tappable row list — used by /more and /more/settings to link to subpages. */
export function MenuList({ items }: { items: MenuListItem[] }) {
  const { dir } = useTranslation();
  const ChevronIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <Card interactive className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{item.label}</p>
              {item.subtitle && (
                <p className="truncate text-xs text-text-tertiary">{item.subtitle}</p>
              )}
            </div>
            {item.badge !== undefined && <Badge tone="accent">{item.badge}</Badge>}
            <ChevronIcon className="size-4 shrink-0 text-text-tertiary" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
