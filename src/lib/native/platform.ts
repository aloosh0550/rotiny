interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True only inside the Capacitor Android/iOS shell (never on the web PWA or SSR). */
export function isNativePlatform(): boolean {
  return cap()?.isNativePlatform?.() === true;
}

export function nativePlatform(): "android" | "ios" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
}
