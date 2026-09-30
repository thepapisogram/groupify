import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("@/lib/db", async () => await import("./helpers/fake-db"));
vi.mock("@/lib/mongodb", () => ({ default: Promise.resolve({}) }));
vi.mock("@auth/mongodb-adapter", () => ({ MongoDBAdapter: () => ({}) }));

import { authOptions } from "@/lib/auth";
import { claimUnprovenAccount, isSessionRevoked } from "@/lib/verification";
import { db, resetDb } from "./helpers/fake-db";

const addUser = (over: Record<string, unknown> = {}) => {
  const _id = new ObjectId();
  db.users.docs.push({ _id, email: "sam@example.com", emailVerified: null, password: "hash", ...over });
  return { id: _id.toHexString(), oid: _id };
};
const userDoc = (oid: ObjectId) => db.users.docs.find((d) => String(d._id) === String(oid))!;

const google = (over: Record<string, unknown> = {}) => ({
  account: { provider: "google" },
  profile: { email_verified: true },
  user: { id: "g1", email: "sam@example.com" },
  ...over,
});
const signIn = (args: ReturnType<typeof google>) =>
  authOptions.callbacks!.signIn!({ ...args, credentials: undefined } as never);
const jwt = (args: Record<string, unknown>) => authOptions.callbacks!.jwt!(args as never);

beforeEach(() => {
  resetDb();
  vi.stubEnv("RESEND_API_KEY", "re_test");
});
afterEach(() => vi.unstubAllEnvs());

describe("Google sign-in for an address that already has an email/password account", () => {
  it("lets Google link to the existing account instead of failing with OAuthAccountNotLinked", () => {
    const google = authOptions.providers.find((p) => p.id === "google") as { options?: { allowDangerousEmailAccountLinking?: boolean } };
    expect(google.options?.allowDangerousEmailAccountLinking).toBe(true);
  });

  it("takes over an account whose email was never proven: password removed, older sessions voided", async () => {
    const { id, oid } = addUser();
    const before = Date.now();
    expect(await signIn(google())).toBe(true);

    const doc = userDoc(oid);
    expect(doc.password).toBeUndefined();
    expect(new Date(doc.sessionsValidAfter as Date).getTime()).toBeGreaterThanOrEqual(before);
    // a session the squatter opened earlier no longer works; the one Google is about to start does
    expect(await isSessionRevoked(id, before - 60_000)).toBe(true);
    expect(await isSessionRevoked(id, Date.now() + 1)).toBe(false);
  });

  it("does the same when verification is switched off (the squatter's password must still go)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { oid } = addUser();
    await signIn(google());
    expect(userDoc(oid).password).toBeUndefined();
  });

  it("leaves an account alone when its owner confirmed the address by email link", async () => {
    const { oid } = addUser({ emailVerified: new Date() });
    expect(await signIn(google())).toBe(true);
    expect(userDoc(oid).password).toBe("hash");
    expect(userDoc(oid).sessionsValidAfter).toBeUndefined();
  });

  it("leaves an account alone when Google is already linked to it", async () => {
    const { oid } = addUser();
    db.accounts.docs.push({ userId: oid, provider: "google" });
    await signIn(google());
    expect(userDoc(oid).password).toBe("hash");
  });

  it("matches the address regardless of case or stray spaces", async () => {
    const { oid } = addUser({ email: "sam@example.com" });
    expect(await claimUnprovenAccount("  Sam@Example.com ")).toBe(true);
    expect(userDoc(oid).password).toBeUndefined();
  });

  it("does nothing for a brand-new Google user, or for someone else's account", async () => {
    const { oid } = addUser({ email: "other@example.com" });
    expect(await signIn(google())).toBe(true);
    expect(userDoc(oid).password).toBe("hash");
  });

  it("refuses a Google address Google says is unverified", async () => {
    const { oid } = addUser();
    expect(await signIn(google({ profile: { email_verified: false } }))).toBe(false);
    expect(userDoc(oid).password).toBe("hash");
  });

  it("refuses to sign in if the takeover step can't run, rather than link to a squatter's account", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const original = db.users.findOne;
    db.users.findOne = async () => { throw new Error("db down"); };
    try {
      expect(await signIn(google())).toBe(false);
    } finally {
      db.users.findOne = original;
    }
  });

  it("does not touch email/password sign-ins", async () => {
    const { oid } = addUser();
    expect(await signIn({ ...google(), account: { provider: "credentials" } } as never)).toBe(true);
    expect(userDoc(oid).password).toBe("hash");
  });
});

describe("a squatter's existing session after the real owner signs in with Google", () => {
  it("is voided, and the account now counts as verified for the real owner", async () => {
    const { id, oid } = addUser();
    // the squatter signs in with the password they set, before Google is involved
    const squatterToken = await jwt({ token: {}, user: { id }, account: { provider: "credentials" } });
    expect(squatterToken.emailProven).toBe(false);
    const startedAt = squatterToken.authAt as number;

    await new Promise((r) => setTimeout(r, 5));
    await signIn(google());
    // the real owner's Google sign-in
    db.accounts.docs.push({ userId: oid, provider: "google" });
    const ownerToken = await jwt({ token: {}, user: { id }, account: { provider: "google" } });
    expect(ownerToken.emailProven).toBe(true);
    expect(ownerToken.emailVerified).toBe(true);
    expect(ownerToken.sub).toBe(id);

    // the squatter's next request: token wiped, so they are signed out
    const after = await jwt({ token: squatterToken });
    expect(after).toEqual({});
    expect(squatterToken.authAt).toBe(startedAt);

    // the owner's own session keeps working
    expect(await jwt({ token: ownerToken })).toMatchObject({ sub: id, emailVerified: true });
  });

  it("also voids sessions when verification is switched off", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { id, oid } = addUser();
    const squatterToken = await jwt({ token: {}, user: { id }, account: { provider: "credentials" } });
    expect(squatterToken.emailVerified).toBe(true); // nothing is enforced...
    expect(squatterToken.emailProven).toBe(false); // ...but ownership still isn't proven
    await new Promise((r) => setTimeout(r, 5));
    await signIn(google());
    db.accounts.docs.push({ userId: oid, provider: "google" });
    expect(await jwt({ token: squatterToken })).toEqual({});
  });

  it("does not disturb ordinary sessions of accounts that were never taken over", async () => {
    const { id } = addUser();
    const token = await jwt({ token: {}, user: { id }, account: { provider: "credentials" } });
    expect(await jwt({ token })).toMatchObject({ sub: id, emailProven: false });
  });
});
