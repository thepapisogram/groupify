import { NextResponse } from "next/server";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the current window resets. */
  retryAfter: number;
}

/**
 * Fixed-window counter. `hit` increments the counter for `key` in the window
 * that starts at `windowStart` and returns the new count.
 */
export interface RateLimitStore {
  hit(key: string, windowStart: number, windowMs: number): Promise<number>;
}

/** In-memory store: used in tests and as a fallback when the database is unreachable. */
export function createMemoryStore(): RateLimitStore {
  const counts = new Map<string, number>();
  return {
    async hit(key, windowStart, windowMs) {
      const id = `${key}:${windowStart}`;
      const next = (counts.get(id) ?? 0) + 1;
      counts.set(id, next);
      if (counts.size > 5000) {
        // Drop windows that ended long ago so the map can't grow without bound.
        const cutoff = windowStart - windowMs;
        for (const k of counts.keys()) {
          if (Number(k.slice(k.lastIndexOf(":") + 1)) < cutoff) counts.delete(k);
        }
      }
      return next;
    },
  };
}

/**
 * MongoDB-backed store so limits hold across serverless instances. Documents
 * expire via a TTL index on `expireAt` (see lib/mongodb.ts).
 */
const mongoStore: RateLimitStore = {
  async hit(key, windowStart, windowMs) {
    // Imported lazily so unit tests using the memory store never need a database.
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await clientPromise;
    const doc = await client
      .db("groupify")
      .collection<{ _id: string; count: number; expireAt: Date }>("rate_limits")
      .findOneAndUpdate(
        { _id: `${key}:${windowStart}` },
        {
          $inc: { count: 1 },
          $setOnInsert: { expireAt: new Date(windowStart + windowMs * 2) },
        },
        { upsert: true, returnDocument: "after" },
      );
    return doc?.count ?? 1;
  },
};

export async function checkRateLimit(
  name: string,
  id: string,
  rule: RateLimitRule,
  store: RateLimitStore = mongoStore,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
  const retryAfter = Math.max(1, Math.ceil((windowStart + rule.windowMs - now) / 1000));
  try {
    const count = await store.hit(`${name}:${id}`, windowStart, rule.windowMs);
    return { ok: count <= rule.limit, retryAfter };
  } catch (error) {
    // Never lock real users out because the limiter's store is unavailable.
    console.error("Rate limiter unavailable, allowing request:", error);
    return { ok: true, retryAfter };
  }
}

/**
 * Best-effort client address. Behind Vercel or another trusted proxy the first
 * X-Forwarded-For entry is the client; elsewhere it can be spoofed, so treat
 * limits as abuse dampening rather than a security boundary.
 */
export function getClientIp(headers: { get(name: string): string | null } | Record<string, unknown>): string {
  const read = (name: string): string | null => {
    if (typeof (headers as { get?: unknown }).get === "function") {
      return (headers as { get(name: string): string | null }).get(name);
    }
    const value = (headers as Record<string, unknown>)[name];
    return typeof value === "string" ? value : null;
  };
  const forwarded = read("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return read("x-real-ip")?.trim() || "unknown";
}

export function tooManyRequests(retryAfter: number, message = "Too many requests. Please try again shortly.") {
  return NextResponse.json(
    { error: message, message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

// Shared rules. Schools often put a whole class behind one IP, so the public
// submission limit is deliberately generous; the per-form cap does the real work.
export const RULES = {
  submit: { limit: 120, windowMs: 60_000 },
  signup: { limit: 10, windowMs: 15 * 60_000 },
  loginPerIpAndEmail: { limit: 8, windowMs: 15 * 60_000 },
  loginPerEmail: { limit: 30, windowMs: 15 * 60_000 },
  createForm: { limit: 30, windowMs: 60 * 60_000 },
  invite: { limit: 20, windowMs: 60 * 60_000 },
  verifyAttempt: { limit: 30, windowMs: 15 * 60_000 },
  verifyResend: { limit: 5, windowMs: 60 * 60_000 },
  resetRequestPerIp: { limit: 10, windowMs: 60 * 60_000 },
  resetRequestPerEmail: { limit: 3, windowMs: 60 * 60_000 },
  resetAttempt: { limit: 30, windowMs: 15 * 60_000 },
  changePassword: { limit: 10, windowMs: 15 * 60_000 },
} satisfies Record<string, RateLimitRule>;
