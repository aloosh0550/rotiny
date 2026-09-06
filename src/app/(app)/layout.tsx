"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSyncState } from "@/lib/hooks/useSyncState";
import { ROUTES } from "@/lib/constants/routes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const { configured, loading: authLoading, user } = useAuth();
  const sync = useSyncState();
  const router = useRouter();

  // Cloud-first: when Supabase is configured the app is gated behind sign-in.
  // When it is NOT configured this is a no-op and the app runs locally as before.
  const needsSignIn = configured && !authLoading && !user;

  // With cloud on, wait for the first pull before judging onboarding — otherwise
  // a returning user briefly sees onboarding until their profile arrives.
  const cloudSettling = configured && !!user && !sync.ready;

  const needsOnboarding =
    !needsSignIn && !cloudSettling && !!settings && !settings.onboardingCompleted;

  useEffect(() => {
    if (needsSignIn) router.replace(ROUTES.signIn);
    else if (needsOnboarding) router.replace(ROUTES.onboarding);
  }, [needsSignIn, needsOnboarding, router]);

  if ((configured && authLoading) || needsSignIn || cloudSettling) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (!settings || !settings.onboardingCompleted) {
    return <div className="min-h-dvh bg-bg" />;
  }

  return <AppShell>{children}</AppShell>;
}
