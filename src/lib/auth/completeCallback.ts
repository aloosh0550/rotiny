/**
 * The core of `/auth/callback`'s job — process the `?code=` param (if any)
 * and wait for a session to appear — extracted as a plain async function so
 * it's testable without a DOM. Takes the client and URL as arguments instead
 * of reading `window`/`getSupabase()` itself, so a test can inject a fake
 * client and skip the real delay between polls.
 *
 * Always resolves to "success" or "failed" — never throws, never hangs. This
 * matters: the previous inline version had no top-level try/catch, so an
 * unexpected rejection (e.g. `getSupabase()` itself failing) would leave the
 * page stuck on "completing sign-in…" forever with no visible error — one
 * concrete way the reported "blank/stuck page" could happen. Every failure
 * path here — a thrown exchange, a thrown session check, no code, no
 * session ever appearing — now converges on the same "failed" result the UI
 * already knows how to render.
 */

export interface CallbackSupabaseClient {
  auth: {
    exchangeCodeForSession(url: string): Promise<{ error: unknown }>;
    getSession(): Promise<{ data: { session: unknown } }>;
  };
}

export interface CompleteAuthCallbackOptions {
  /** @default 40 */
  maxAttempts?: number;
  /** @default 150 */
  delayMs?: number;
  /** Injectable for tests — real callers get a real timer. */
  sleep?: (ms: number) => Promise<void>;
  /** Checked between polls so an unmounted page stops cleanly, mid-loop. */
  isCancelled?: () => boolean;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function completeAuthCallback(
  supabase: CallbackSupabaseClient,
  urlHref: string,
  options: CompleteAuthCallbackOptions = {},
): Promise<"success" | "failed"> {
  const { maxAttempts = 40, delayMs = 150, sleep = defaultSleep, isCancelled = () => false } = options;

  try {
    const url = new URL(urlHref);
    if (url.searchParams.get("code")) {
      await supabase.auth.exchangeCodeForSession(urlHref).catch(() => {});
    }

    for (let i = 0; i < maxAttempts && !isCancelled(); i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return "success";
      await sleep(delayMs);
    }
    return "failed";
  } catch {
    // A thrown exchange/getSession call, or a malformed URL, must still
    // resolve to a visible state — never leave the caller awaiting forever.
    return "failed";
  }
}
