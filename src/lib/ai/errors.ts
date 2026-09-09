/**
 * Thrown whenever the assistant cannot answer — endpoint down, no key configured
 * server-side, network offline, timeout, rate-limited. The UI catches this and
 * shows a calm fallback; the rest of the app is never affected.
 */
export class AIUnavailableError extends Error {
  readonly reason: "network" | "timeout" | "server" | "unconfigured" | "unauthorized";

  constructor(
    reason: AIUnavailableError["reason"],
    message = "AI is unavailable",
  ) {
    super(message);
    this.name = "AIUnavailableError";
    this.reason = reason;
  }
}
