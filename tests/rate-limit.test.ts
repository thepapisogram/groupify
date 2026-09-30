import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, createMemoryStore, getClientIp } from "@/lib/rate-limit";

const rule = { limit: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks within the same window", async () => {
    const store = createMemoryStore();
    const now = 1_000_000;
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await checkRateLimit("t", "ip", rule, store, now)).ok);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("resets in the next window", async () => {
    const store = createMemoryStore();
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) await checkRateLimit("t", "ip", rule, store, now);
    expect((await checkRateLimit("t", "ip", rule, store, now)).ok).toBe(false);
    expect((await checkRateLimit("t", "ip", rule, store, now + rule.windowMs)).ok).toBe(true);
  });

  it("keeps separate counters per name and id", async () => {
    const store = createMemoryStore();
    const now = 5_000_000;
    for (let i = 0; i < 4; i++) await checkRateLimit("a", "1", rule, store, now);
    expect((await checkRateLimit("a", "2", rule, store, now)).ok).toBe(true);
    expect((await checkRateLimit("b", "1", rule, store, now)).ok).toBe(true);
  });

  it("reports how long until the window resets", async () => {
    const store = createMemoryStore();
    const windowStart = 10 * rule.windowMs;
    const r = await checkRateLimit("t", "ip", rule, store, windowStart + 45_000);
    expect(r.retryAfter).toBe(15);
  });

  it("fails open when the store errors, so real users are never locked out", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { hit: async () => { throw new Error("db down"); } };
    expect((await checkRateLimit("t", "ip", rule, broken)).ok).toBe(true);
    spy.mockRestore();
  });
});

describe("getClientIp", () => {
  it("prefers the first X-Forwarded-For entry", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1", "x-real-ip": "10.0.0.2" });
    expect(getClientIp(h)).toBe("203.0.113.9");
  });

  it("falls back to X-Real-IP then 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("reads plain header objects (NextAuth passes one to authorize())", () => {
    expect(getClientIp({ "x-forwarded-for": "192.0.2.1" })).toBe("192.0.2.1");
    expect(getClientIp({})).toBe("unknown");
  });
});
