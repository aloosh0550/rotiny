"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROUTES } from "@/lib/constants/routes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const { configured, loading: authLoading, user } = useAuth();
  const router = useRouter();

  // Cloud-first: when Supabase is configured, the app is gated behind sign-in.
  // When it is NOT configured, this is a no-op and the app runs locally as before.
  const needsSignIn = configured && !authLoading && !user;

  useEffect(() => {
    if (needsSignIn) {
      router.replace(ROUTES.signIn);
      return;
    }
    if (!needsSignIn && settings && !settings.onboardingCompleted) {
      router.replace(ROUTES.onboarding);
    }
  }, [needsSignIn, settings, router]);

  if (configured && authLoading) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (needsSignIn) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (!settings || !settings.onboardingCompleted) {
    return <div className="min-h-dvh bg-bg" />;
  }

  return <AppShell>{children}</AppShell>;
}
