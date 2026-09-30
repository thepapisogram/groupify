/**
 * Hand-off with Jotter (https://github.com/thepapisogram/jotter).
 *
 * Jotter → Groupify: Jotter opens `/#jotter=<base64url JSON>` with the list of
 * names from a note. The payload travels in the URL fragment, which browsers
 * never send to a server, so the names stay out of access logs.
 *
 * Groupify → Jotter: "Save to Jotter" opens `<jotter>/#new=<base64url JSON>` with
 * the grouped text. Jotter shows it as a draft the user reviews before saving.
 */

export const MAX_HANDOFF_NAMES = 500;
const MAX_NAME_LENGTH = 120;
const MAX_TITLE_LENGTH = 120;
const MAX_PAYLOAD_CHARS = 200_000;

export interface JotterHandoff {
  names: string[];
  title: string;
  /** Jotter origin to send results back to, or null if it can't be trusted. */
  returnTo: string | null;
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toBase64Url(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The origin we're willing to link back to. A configured
 * NEXT_PUBLIC_JOTTER_URL always wins; otherwise the origin the hand-off came
 * from is accepted only if it is https (or localhost for development).
 */
export function resolveJotterOrigin(candidate: unknown, configured?: string): string | null {
  const source = configured?.trim() || (typeof candidate === "string" ? candidate : "");
  if (!source) return null;
  try {
    const url = new URL(source);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Parses `#jotter=…`. Returns null unless the payload is well-formed. */
export function parseJotterHandoff(hash: string, configuredJotterUrl?: string): JotterHandoff | null {
  const match = /(?:^#?|&)jotter=([A-Za-z0-9_-]+)/.exec(hash);
  if (!match || match[1].length > MAX_PAYLOAD_CHARS) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(match[1])) as {
      v?: unknown;
      names?: unknown;
      title?: unknown;
      returnTo?: unknown;
    };
    if (parsed.v !== 1 || !Array.isArray(parsed.names)) return null;

    const names = parsed.names
      .filter((name): name is string => typeof name === "string")
      .map((name) => name.replace(/[\r\n]+/g, " ").trim().slice(0, MAX_NAME_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_HANDOFF_NAMES);
    if (names.length === 0) return null;

    const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
    return { names, title, returnTo: resolveJotterOrigin(parsed.returnTo, configuredJotterUrl) };
  } catch {
    return null;
  }
}

/** Builds the link that opens a prefilled draft note in Jotter. */
export function buildJotterDraftUrl(origin: string, title: string, content: string): string {
  const payload = { title: title.slice(0, 200), content: content.slice(0, 50_000) };
  return `${origin}/#new=${toBase64Url(JSON.stringify(payload))}`;
}
