"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useSettings } from "@/lib/hooks/useSettings";
import { ROUTES } from "@/lib/constants/routes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (settings && !settings.onboardingCompleted) {
      router.replace(ROUTES.onboarding);
    }
  }, [settings, router]);

  if (!settings || !settings.onboardingCompleted) {
    return <div className="min-h-dvh bg-bg" />;
  }

  return <AppShell>{children}</AppShell>;
}
