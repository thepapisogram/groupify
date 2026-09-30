import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { compare, hash } from "bcryptjs";

vi.mock("@/lib/db", async () => await import("./helpers/fake-db"));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(async () => ({ ok: true, retryAfter: 1 })),
}));

import { getServerSession } from "next-auth/next";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSessionRevoked } from "@/lib/verification";
import { db, resetDb } from "./helpers/fake-db";
import { POST as change } from "@/app/api/auth/password/change/route";

const call = (body: unknown) =>
  change(new NextRequest("http://localhost/api/auth/password/change", { method: "POST", body: JSON.stringify(body) }));
const signInAs = (id: string | null) =>
  vi.mocked(getServerSession).mockResolvedValue(id ? { user: { id } } : null);

const addUser = async (over: Record<string, unknown> = {}) => {
  const _id = new ObjectId();
  db.users.docs.push({ _id, email: "sam@example.com", password: await hash("current pass 1", 4), ...over });
  return { id: _id.toHexString(), oid: _id };
};
const stored = (oid: ObjectId) => db.users.docs.find((d) => String(d._id) === String(oid))!;

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, retryAfter: 1 });
  signInAs(null);
});

describe("POST /api/auth/password/change", () => {
  it("changes the password when the current one is right", async () => {
    const { id, oid } = await addUser();
    signInAs(id);
    const res = await call({ currentPassword: "current pass 1", newPassword: "a brand new one 2" });
    expect(res.status).toBe(200);
    expect(await compare("a brand new one 2", stored(oid).password as string)).toBe(true);
    expect(await compare("current pass 1", stored(oid).password as string)).toBe(false);
  });

  it("voids sessions started before the change", async () => {
    const { id } = await addUser();
    signInAs(id);
    const before = Date.now() - 1000;
    await call({ currentPassword: "current pass 1", newPassword: "a brand new one 2" });
    expect(await isSessionRevoked(id, before)).toBe(true);
    expect(await isSessionRevoked(id, Date.now() + 1)).toBe(false);
  });

  it("requires a session", async () => {
    await addUser();
    expect((await call({ currentPassword: "current pass 1", newPassword: "a brand new one 2" })).status).toBe(401);
  });

  it("refuses a wrong current password and changes nothing", async () => {
    const { id, oid } = await addUser();
    signInAs(id);
    const before = stored(oid).password;
    const res = await call({ currentPassword: "not it at all", newPassword: "a brand new one 2" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("wrong-password");
    expect(stored(oid).password).toBe(before);
    expect(stored(oid).sessionsValidAfter).toBeUndefined();
  });

  it("refuses a missing or wrongly typed current password", async () => {
    const { id } = await addUser();
    signInAs(id);
    for (const bad of [undefined, "", 123, { $ne: "" }]) {
      expect((await call({ currentPassword: bad, newPassword: "a brand new one 2" })).status).toBe(400);
    }
  });

  it("validates the new password", async () => {
    const { id, oid } = await addUser();
    signInAs(id);
    const before = stored(oid).password;
    for (const bad of [undefined, "short", "x".repeat(200), 12345678, { a: 1 }]) {
      const res = await call({ currentPassword: "current pass 1", newPassword: bad });
      expect(res.status).toBe(400);
    }
    expect(stored(oid).password).toBe(before);
  });

  it("refuses reusing the current password", async () => {
    const { id } = await addUser();
    signInAs(id);
    const res = await call({ currentPassword: "current pass 1", newPassword: "current pass 1" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("same-password");
  });

  it("points a Google-only account to the email flow instead of letting a session set a password", async () => {
    const { id, oid } = await addUser({ password: undefined });
    signInAs(id);
    const res = await call({ currentPassword: "anything", newPassword: "a brand new one 2" });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("no-password");
    expect(stored(oid).password).toBeUndefined();
  });

  it("only ever changes the signed-in user's own password", async () => {
    const a = await addUser({ email: "a@example.com" });
    const b = await addUser({ email: "b@example.com" });
    signInAs(a.id);
    await call({ currentPassword: "current pass 1", newPassword: "a brand new one 2" });
    expect(await compare("current pass 1", stored(b.oid).password as string)).toBe(true);
    expect(stored(b.oid).sessionsValidAfter).toBeUndefined();
  });

  it("is rate limited per account, counting wrong guesses", async () => {
    const { id } = await addUser();
    signInAs(id);
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfter: 60 });
    expect((await call({ currentPassword: "current pass 1", newPassword: "a brand new one 2" })).status).toBe(429);
    expect(vi.mocked(checkRateLimit).mock.calls[0][1]).toBe(id);
  });

  it("rejects an unknown or malformed session id", async () => {
    signInAs(new ObjectId().toHexString());
    expect((await call({ currentPassword: "x", newPassword: "a brand new one 2" })).status).toBe(401);
    signInAs("not-an-id");
    expect((await call({ currentPassword: "x", newPassword: "a brand new one 2" })).status).toBe(401);
  });
});
