/**
 * Client-safe helpers for talking to admin-only endpoints.
 *
 * Owners who arrive via a capability link (anonymous forms) hold an admin
 * token; it is sent in a header rather than the query string so it doesn't end
 * up in server logs or Referer headers. Signed-in owners and collaborators
 * don't need one: their session is enough.
 */
export const ADMIN_TOKEN_HEADER = "x-admin-token";

export function adminInit(token: string | undefined, init: RequestInit = {}): RequestInit {
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set(ADMIN_TOKEN_HEADER, token);
  return { ...init, headers };
}

export function adminFetch(url: string, token: string | undefined, init: RequestInit = {}) {
  return fetch(url, adminInit(token, init));
}

/** Page links only carry a token when the viewer arrived with one. */
export function adminPagePath(formId: string, page: "admin" | "edit", token?: string): string {
  const base = `/forms/${formId}/${page}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
