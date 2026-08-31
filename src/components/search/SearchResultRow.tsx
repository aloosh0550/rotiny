"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { IconTile, type TileColor } from "@/components/ui/IconTile";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";

export interface SearchResultRowProps {
  href: string;
  icon: ReactNode;
  color?: TileColor;
  title: string;
  subtitle?: string;
  /** Optional trailing indicator, e.g. a PriorityDot. */
  trailing?: ReactNode;
}

/** Compact tappable row used inside a SearchResultsSection — icon, title, secondary line. */
export function SearchResultRow({ href, icon, color = "slate", title, subtitle, trailing }: SearchResultRowProps) {
  return (
    <Link href={href}>
      <Card interactive padding="sm" className="flex items-center gap-3">
        <IconTile color={color}>{icon}</IconTile>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary" dir="auto">
            {title}
          </p>
          {subtitle && <p className="truncate text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        {trailing}
        <DirectionalIcon className="size-4 shrink-0 text-text-tertiary" />
      </Card>
    </Link>
  );
}
