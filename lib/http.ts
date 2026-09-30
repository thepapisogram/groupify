import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export type JsonBody = { ok: true; body: unknown } | { ok: false; response: NextResponse };

/**
 * Parse a JSON request body with a size ceiling, so public endpoints can't be
 * used to push megabytes of junk into the database.
 */
export async function readJson(req: Request, maxBytes = 32 * 1024): Promise<JsonBody> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    return { ok: false, response: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid payload" }, { status: 400 }) };
  }
  if (text.length > maxBytes) {
    return { ok: false, response: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

/** Public origin used in emailed links; falls back to the request's own origin. */
export function getAppUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return configured || new URL(req.url).origin;
}

/** Drop the cached public copy of a form immediately (edit, close/open, delete, link rotation). */
export function invalidateFormCache(formId: string): void {
  revalidateTag(`form-${formId}`, { expire: 0 });
}
