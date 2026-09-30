import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { compare, hash } from "bcryptjs";

vi.mock("@/lib/db", async () => await import("./helpers/fake-db"));
vi.mock("@/lib/mongodb", () => ({ default: Promise.resolve({}) }));
vi.mock("@auth/mongodb-adapter", () => ({ MongoDBAdapter: () => ({}) }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => true) }));
vi.mock("@/lib/emails/reset-password", () => ({ ResetPasswordEmail: (props: unknown) => props }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(async () => ({ ok: true, retryAfter: 1 })),
}));

import { sendEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { authOptions } from "@/lib/auth";
import { RESET_TTL_MS, consumeResetToken, issueResetToken } from "@/lib/password-reset";
import { hashToken, isSessionRevoked } from "@/lib/verification";
import { db, resetDb } from "./helpers/fake-db";
import { POST as forgot } from "@/app/api/auth/password/forgot/route";
import { POST as reset } from "@/app/api/auth/password/reset/route";

const req = (url: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const ask = (email: unknown) => forgot(req("/api/auth/password/forgot", { email }));
const doReset = (token: unknown, password: unknown) => reset(req("/api/auth/password/reset", { token, password }));
const jwt = (args: Record<string, unknown>) => authOptions.callbacks!.jwt!(args as never);

const addUser = (over: Record<string, unknown> = {}) => {
  const _id = new ObjectId();
  const doc = { _id, email: "sam@example.com", emailVerified: null, password: "old-hash", ...over };
  db.users.docs.push(doc);
  return { id: _id.toHexString(), oid: _id, email: doc.email as string };
};
const userDoc = (oid: ObjectId) => db.users.docs.find((d) => String(d._id) === String(oid))!;
const sentLink = () => {
  const call = vi.mocked(sendEmail).mock.calls.at(-1)![0];
  return (call.react as unknown as { resetLink: string }).resetLink;
};
const tokenFromLink = (link: string) => new URL(link).searchParams.get("token")!;

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, retryAfter: 1 });
  vi.mocked(sendEmail).mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/auth/password/forgot", () => {
  it("emails a reset link to a registered address and stores only its hash", async () => {
    const { id } = addUser();
    const res = await ask("sam@example.com");
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe("sam@example.com");

    const raw = tokenFromLink(sentLink());
    expect(sentLink()).toMatch(/\/reset-password\?token=[0-9a-f]{64}$/);
    const doc = db.password_resets.docs[0];
    expect(doc._id).toBe(hashToken(raw));
    expect(doc._id).not.toBe(raw);
    expect(doc.userId).toBe(id);
    expect(new Date(doc.expiresAt as Date).getTime() - new Date(doc.createdAt as Date).getTime()).toBe(RESET_TTL_MS);
  });

  it("gives the same answer for an address with no account, and sends nothing", async () => {
    addUser();
    const known = await (await ask("sam@example.com")).json();
    vi.mocked(sendEmail).mockClear();
    const unknown = await ask("nobody@example.com");
    expect(unknown.status).toBe(200);
    expect(await unknown.json()).toEqual(known);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.password_resets.docs).toHaveLength(1);
  });

  it("still answers the same if the email can't be sent", async () => {
    addUser();
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("provider down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await ask("sam@example.com")).status).toBe(200);
  });

  it("finds the account whatever the case or spacing of the address", async () => {
    addUser();
    await ask("  SAM@Example.com ");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("keeps one live link per account: a new request replaces the old one", async () => {
    addUser();
    await ask("sam@example.com");
    const first = tokenFromLink(sentLink());
    await ask("sam@example.com");
    expect(db.password_resets.docs).toHaveLength(1);
    expect((await doReset(first, "brand new pass 1")).status).toBe(400);
    expect((await doReset(tokenFromLink(sentLink()), "brand new pass 1")).status).toBe(200);
  });

  it("rejects malformed addresses", async () => {
    expect((await ask("not-an-email")).status).toBe(400);
    expect((await ask(undefined)).status).toBe(400);
    expect((await ask({ $ne: "" })).status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("is rate limited per address and per IP", async () => {
    addUser();
    vi.mocked(checkRateLimit).mockImplementation(async (scope) => ({ ok: scope !== "reset-email", retryAfter: 60 }));
    expect((await ask("sam@example.com")).status).toBe(429);
    vi.mocked(checkRateLimit).mockImplementation(async (scope) => ({ ok: scope !== "reset-ip", retryAfter: 60 }));
    expect((await ask("sam@example.com")).status).toBe(429);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("says so when the site can't send email, instead of pretending", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    addUser();
    expect((await ask("sam@example.com")).status).toBe(503);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("works for a Google-only account, which can then also use a password", async () => {
    addUser({ password: undefined });
    expect((await ask("sam@example.com")).status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth/password/reset", () => {
  const request = async () => {
    const u = addUser({ password: await hash("old password 1", 4) });
    await ask(u.email);
    return { ...u, token: tokenFromLink(sentLink()) };
  };

  it("sets the new password, so the old one stops working", async () => {
    const { oid, token } = await request();
    expect((await doReset(token, "brand new pass 1")).status).toBe(200);
    const stored = userDoc(oid).password as string;
    expect(await compare("brand new pass 1", stored)).toBe(true);
    expect(await compare("old password 1", stored)).toBe(false);
  });

  it("works once only", async () => {
    const { token } = await request();
    expect((await doReset(token, "brand new pass 1")).status).toBe(200);
    const again = await doReset(token, "another pass 22");
    expect(again.status).toBe(400);
    expect((await again.json()).reason).toBe("invalid");
  });

  it("refuses an expired link, and spends it", async () => {
    const { token } = await request();
    db.password_resets.docs[0].expiresAt = new Date(Date.now() - 1000);
    const res = await doReset(token, "brand new pass 1");
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("expired");
    expect(db.password_resets.docs).toHaveLength(0);
  });

  it("refuses made-up, missing and wrongly typed tokens", async () => {
    await request();
    for (const bad of ["a".repeat(64), "", undefined, 123, { $ne: "" }, "x".repeat(500)]) {
      expect((await doReset(bad, "brand new pass 1")).status).toBe(400);
    }
  });

  it("checks the password before spending the link, so a typo can be fixed", async () => {
    const { token } = await request();
    expect((await doReset(token, "short")).status).toBe(400);
    expect((await doReset(token, undefined)).status).toBe(400);
    expect((await doReset(token, "x".repeat(200))).status).toBe(400);
    expect(db.password_resets.docs).toHaveLength(1);
    expect((await doReset(token, "brand new pass 1")).status).toBe(200);
  });

  it("does not apply a link to an account whose address has since changed", async () => {
    const { oid, token } = await request();
    userDoc(oid).email = "changed@example.com";
    const before = userDoc(oid).password;
    expect((await doReset(token, "brand new pass 1")).status).toBe(400);
    expect(userDoc(oid).password).toBe(before);
  });

  it("proves the inbox, so an unconfirmed account becomes verified (and outstanding confirm links are dropped)", async () => {
    const { id, oid, token } = await request();
    db.email_verifications.docs.push({ _id: "h", userId: id, email: "sam@example.com" });
    await doReset(token, "brand new pass 1");
    expect(userDoc(oid).emailVerified).toBeInstanceOf(Date);
    expect(db.email_verifications.docs).toHaveLength(0);
  });

  it("keeps an existing verification date", async () => {
    const when = new Date("2025-01-01");
    const u = addUser({ emailVerified: when });
    await ask(u.email);
    await doReset(tokenFromLink(sentLink()), "brand new pass 1");
    expect(userDoc(u.oid).emailVerified).toBe(when);
  });

  it("signs out everyone who was already signed in, including whoever knew the old password", async () => {
    const { id, token } = await request();
    const attacker = await jwt({ token: {}, user: { id }, account: { provider: "credentials" } });
    expect(await jwt({ token: attacker })).toMatchObject({ sub: id });

    await new Promise((r) => setTimeout(r, 5));
    await doReset(token, "brand new pass 1");

    expect(await isSessionRevoked(id, attacker.authAt as number)).toBe(true);
    expect(await jwt({ token: attacker })).toEqual({});
    // a session begun after the reset works
    const fresh = await jwt({ token: {}, user: { id }, account: { provider: "credentials" } });
    expect(await jwt({ token: fresh })).toMatchObject({ sub: id });
  });

  it("signs out sessions of a verified account too, not just unproven ones", async () => {
    const u = addUser({ emailVerified: new Date(), password: "old" });
    const session = await jwt({ token: {}, user: { id: u.id }, account: { provider: "credentials" } });
    expect(session.emailProven).toBe(true);
    await new Promise((r) => setTimeout(r, 5));
    await ask(u.email);
    await doReset(tokenFromLink(sentLink()), "brand new pass 1");
    expect(await jwt({ token: session })).toEqual({});
  });

  it("reads a voided session as signed out, without leaking the old name and email", async () => {
    const session = { user: { name: "Sam", email: "sam@example.com" }, expires: "2099-01-01" };
    const call = (token: unknown) => authOptions.callbacks!.session!({ session, token } as never);
    expect(await call({})).toEqual({});
    expect(await call({ sub: "u1", emailVerified: true })).toMatchObject({ user: { id: "u1", email: "sam@example.com" } });
  });

  it("is rate limited", async () => {
    const { token } = await request();
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfter: 60 });
    expect((await doReset(token, "brand new pass 1")).status).toBe(429);
    expect(db.password_resets.docs).toHaveLength(1);
  });

  it("issue + consume work directly and one account's token can't reset another", async () => {
    const a = addUser({ email: "a@example.com" });
    const b = addUser({ email: "b@example.com" });
    const tokenA = await issueResetToken(a.id, "a@example.com");
    await issueResetToken(b.id, "b@example.com");
    expect(db.password_resets.docs).toHaveLength(2);
    expect((await consumeResetToken(tokenA, "brand new pass 1")).ok).toBe(true);
    expect(userDoc(b.oid).password).toBe("old-hash");
  });
});
