/**
 * JS regex `\b` is defined against ASCII `\w` ([A-Za-z0-9_]), so it silently fails to match
 * immediately after/before Arabic letters (e.g. `/دقيقة\b/` never matches at the end of
 * "30 دقيقة" because there's no ASCII word/non-word transition there). These Unicode-aware
 * equivalents use `\p{L}`/`\p{N}` (any-script letter/number) instead — always pair with the
 * regex `u` flag.
 */
export const WB_START = "(?<![\\p{L}\\p{N}_])";
export const WB_END = "(?![\\p{L}\\p{N}_])";
