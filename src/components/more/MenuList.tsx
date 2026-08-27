"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconTile } from "@/components/ui/IconTile";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";

export interface MenuListItem {
  href: string;
  icon: ReactNode;
  label: string;
  subtitle?: string;
  badge?: string | number;
}

/** Reusable tappable row list — used by /more and /more/settings to link to subpages. */
export function MenuList({ items }: { items: MenuListItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <Card interactive className="flex items-center gap-3">
            <IconTile color="slate">{item.icon}</IconTile>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{item.label}</p>
              {item.subtitle && (
                <p className="truncate text-xs text-text-tertiary">{item.subtitle}</p>
              )}
            </div>
            {item.badge !== undefined && <Badge tone="accent">{item.badge}</Badge>}
            <DirectionalIcon className="size-4 shrink-0 text-text-tertiary" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
