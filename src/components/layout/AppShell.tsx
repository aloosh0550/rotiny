"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { QuickAddFab } from "@/components/shared/QuickAddFab";
import { QuickAddProvider } from "@/components/shared/QuickAddProvider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <QuickAddProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <OfflineBanner />
          <main className="flex-1 pb-24 md:pb-16">
            <div className="mx-auto w-full max-w-4xl md:px-8 md:py-6">{children}</div>
          </main>
          <QuickAddFab />
          <BottomNav />
        </div>
      </div>
    </QuickAddProvider>
  );
}
