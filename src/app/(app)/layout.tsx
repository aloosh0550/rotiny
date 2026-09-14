"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSyncState } from "@/lib/hooks/useSyncState";
import { ROUTES } from "@/lib/constants/routes";
import { computeAuthGate } from "@/lib/auth/routeGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const { configured, loading: authLoading, user } = useAuth();
  const sync = useSyncState();
  const router = useRouter();

  // Cloud-first: when Supabase is configured the app is gated behind sign-in.
  // When it is NOT configured this is a no-op and the app runs locally as
  // before (see AuthProvider's header comment — intentional, not a bypass).
  // The actual decision lives in computeAuthGate (unit-tested) so this
  // component only wires inputs to it and reacts to the result.
  const gate = computeAuthGate({
    configured,
    authLoading,
    user,
    syncReady: sync.ready,
    hasSettings: !!settings,
    onboardingCompleted: settings?.onboardingCompleted ?? false,
  });

  useEffect(() => {
    if (gate.needsSignIn) router.replace(ROUTES.signIn);
    else if (gate.needsOnboarding) router.replace(ROUTES.onboarding);
  }, [gate.needsSignIn, gate.needsOnboarding, router]);

  if (gate.showBlank) {
    return <div className="min-h-dvh bg-bg" />;
  }

  return <AppShell>{children}</AppShell>;
}
