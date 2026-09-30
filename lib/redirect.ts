/**
 * Accept a post-login destination only if it is a same-site relative path.
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com") and backslash
 * tricks ("/\evil.com") that browsers treat as host separators.
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.includes("\\")) return fallback;
  // Control characters can be used to smuggle a scheme past naive checks.
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  return raw;
}

/** Read `?callbackUrl=` from the current location (client only). */
export function readCallbackUrl(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  return safeCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl"), fallback);
}
