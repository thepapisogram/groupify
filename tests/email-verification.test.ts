import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";

vi.mock("@/lib/db", async () => await import("./helpers/fake-db"));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => true) }));
vi.mock("@/lib/emails/verify-email", () => ({ VerifyEmail: (props: unknown) => props }));
vi.mock("@/lib/emails/invite-accepted", () => ({ InviteAcceptedEmail: () => null }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(async () => ({ ok: true, retryAfter: 1 })),
}));

import { getServerSession } from "next-auth/next";
import { sendEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  VERIFY_TTL_MS,
  consumeVerificationToken,
  hashToken,
  isUserVerified,
  isVerificationEnabled,
  issueVerificationToken,
  markVerifiedByProvider,
} from "@/lib/verification";
import { db, resetDb } from "./helpers/fake-db";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as verify } from "@/app/api/auth/verify/route";
import { POST as resend } from "@/app/api/auth/verify/resend/route";
import { GET as getAdmin } from "@/app/api/forms/[formId]/admin/route";
import { POST as acceptInvite } from "@/app/api/invites/[token]/accept/route";

const FORM_ID = "form01";
const mockSession = (user: { id?: string; email?: string } | null) =>
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);

const addUser = (over: Record<string, unknown> = {}) => {
  const _id = new ObjectId();
  db.users.docs.push({ _id, email: `u${db.users.docs.length}@x.com`, emailVerified: null, ...over });
  return { id: _id.toHexString(), oid: _id, email: (db.users.docs.at(-1) as { email: string }).email };
};

const jsonReq = (url: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

const userDoc = (oid: ObjectId) => db.users.docs.find((d) => String(d._id) === String(oid))!;

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, retryAfter: 1 });
  vi.mocked(sendEmail).mockResolvedValue(true);
  mockSession(null);
});

afterEach(() => vi.unstubAllEnvs());

describe("isVerificationEnabled / isUserVerified", () => {
  it("is on only when an email provider is configured", () => {
    expect(isVerificationEnabled()).toBe(true);
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isVerificationEnabled()).toBe(false);
  });

  it("treats everyone as verified when switched off, so nobody is locked out", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await isUserVerified("not-even-an-id")).toBe(true);
    expect(await isUserVerified(undefined)).toBe(true);
  });

  it("requires proof when on", async () => {
    const unverified = addUser({ emailVerified: null });
    const verified = addUser({ emailVerified: new Date() });
    expect(await isUserVerified(unverified.id)).toBe(false);
    expect(await isUserVerified(verified.id)).toBe(true);
    expect(await isUserVerified(new ObjectId().toHexString())).toBe(false); // no such user
    expect(await isUserVerified("garbage")).toBe(false);
    expect(await isUserVerified(undefined)).toBe(false);
  });

  it("trusts a linked Google account even though NextAuth stores emailVerified: null for it", async () => {
    const g = addUser({ emailVerified: null });
    db.accounts.docs.push({ _id: new ObjectId(), userId: g.oid, provider: "google" });
    expect(await isUserVerified(g.id)).toBe(true);

    const other = addUser({ emailVerified: null });
    db.accounts.docs.push({ _id: new ObjectId(), userId: other.oid, provider: "github" });
    expect(await isUserVerified(other.id)).toBe(false);
  });

  it("markVerifiedByProvider fills a missing value but never overwrites an existing date", async () => {
    const a = addUser({ emailVerified: null });
    await markVerifiedByProvider(a.id);
    expect(userDoc(a.oid).emailVerified).toBeInstanceOf(Date);

    const when = new Date("2020-01-01");
    const b = addUser({ emailVerified: when });
    await markVerifiedByProvider(b.id);
    expect(userDoc(b.oid).emailVerified).toBe(when);
  });
});

describe("verification tokens", () => {
  it("stores only a hash of the token and replaces earlier tokens for the user", async () => {
    const u = addUser();
    const first = await issueVerificationToken(u.id, u.email);
    const second = await issueVerificationToken(u.id, u.email);

    expect(db.email_verifications.docs).toHaveLength(1);
    expect(db.email_verifications.docs[0]._id).toBe(hashToken(second));
    expect(JSON.stringify(db.email_verifications.docs)).not.toContain(second);
    expect((await consumeVerificationToken(first)).ok).toBe(false); // superseded
  });

  it("verifies the account once, then the token is spent", async () => {
    const u = addUser();
    const token = await issueVerificationToken(u.id, u.email);

    const result = await consumeVerificationToken(token);
    expect(result).toEqual({ ok: true, email: u.email, userId: u.id });
    expect(userDoc(u.oid).emailVerified).toBeInstanceOf(Date);
    expect(await consumeVerificationToken(token)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects unknown, malformed and non-string tokens without touching anything", async () => {
    const u = addUser();
    await issueVerificationToken(u.id, u.email);
    for (const bad of ["x".repeat(64), "short", "", "a".repeat(500), undefined, null, 42, {}, ["a"]]) {
      expect((await consumeVerificationToken(bad)).ok).toBe(false);
    }
    expect(userDoc(u.oid).emailVerified).toBeNull();
    expect(db.email_verifications.docs).toHaveLength(1);
  });

  it("expires after 24 hours", async () => {
    const u = addUser();
    const token = await issueVerificationToken(u.id, u.email);
    (db.email_verifications.docs[0].expiresAt as Date) = new Date(Date.now() - 1000);
    expect(await consumeVerificationToken(token)).toEqual({ ok: false, reason: "expired" });
    expect(userDoc(u.oid).emailVerified).toBeNull();
    expect(VERIFY_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("cannot verify an address the account no longer has", async () => {
    const u = addUser({ email: "old@x.com" });
    const token = await issueVerificationToken(u.id, "old@x.com");
    userDoc(u.oid).email = "new@x.com";
    expect((await consumeVerificationToken(token)).ok).toBe(false);
    expect(userDoc(u.oid).emailVerified).toBeNull();
  });
});

describe("signup", () => {
  const post = (email = "Anna@Example.com") => signup(jsonReq("/api/auth/signup", { email, password: "correct horse 1", name: "Anna" }));

  it("creates an unverified account and emails a confirmation link", async () => {
    const res = await post();
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ verificationRequired: true, verificationSent: true });

    const user = db.users.docs[0];
    expect(user.email).toBe("anna@example.com");
    expect(user.emailVerified).toBeNull();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = vi.mocked(sendEmail).mock.calls[0][0] as unknown as { to: string; react: { verifyLink: string } };
    expect(mail.to).toBe("anna@example.com");
    const raw = new URL(mail.react.verifyLink).searchParams.get("token")!;
    expect(mail.react.verifyLink).toContain("/verify-email?token=");
    expect(db.email_verifications.docs[0]._id).toBe(hashToken(raw)); // the emailed token is the stored one
  });

  it("still creates the account when the email can't be sent, and says so", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    const res = await post();
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ verificationRequired: true, verificationSent: false });
    expect(db.users.docs).toHaveLength(1);
  });

  it("does nothing extra when verification is switched off", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const body = await (await post()).json();
    expect(body).toMatchObject({ verificationRequired: false, verificationSent: false });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.email_verifications.docs).toHaveLength(0);
  });
});

describe("POST /api/auth/verify", () => {
  it("verifies with a good token exactly once", async () => {
    const u = addUser();
    const token = await issueVerificationToken(u.id, u.email);

    const ok = await verify(jsonReq("/api/auth/verify", { token }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ success: true, email: u.email });
    expect(userDoc(u.oid).emailVerified).toBeInstanceOf(Date);

    const again = await verify(jsonReq("/api/auth/verify", { token }));
    expect(again.status).toBe(400);
  });

  it("gives distinct, helpful errors for expired and invalid links", async () => {
    const u = addUser();
    const token = await issueVerificationToken(u.id, u.email);
    (db.email_verifications.docs[0].expiresAt as Date) = new Date(0);
    const expired = await (await verify(jsonReq("/api/auth/verify", { token }))).json();
    expect(expired.reason).toBe("expired");
    const invalid = await (await verify(jsonReq("/api/auth/verify", { token: "nope" }))).json();
    expect(invalid.reason).toBe("invalid");
  });

  it("rejects bad bodies and is rate limited", async () => {
    expect((await verify(jsonReq("/api/auth/verify", {}))).status).toBe(400);
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfter: 30 });
    const limited = await verify(jsonReq("/api/auth/verify", { token: "x".repeat(64) }));
    expect(limited.status).toBe(429);
  });
});

describe("POST /api/auth/verify/resend", () => {
  it("needs a signed-in user and an enabled provider", async () => {
    expect((await resend(jsonReq("/api/auth/verify/resend"))).status).toBe(401);
    const u = addUser();
    mockSession({ id: u.id, email: u.email });
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await resend(jsonReq("/api/auth/verify/resend"))).status).toBe(400);
  });

  it("sends a fresh link to an unverified user and invalidates the old one", async () => {
    const u = addUser();
    mockSession({ id: u.id, email: u.email });
    const old = await issueVerificationToken(u.id, u.email);

    const res = await resend(jsonReq("/api/auth/verify/resend"));
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((await consumeVerificationToken(old)).ok).toBe(false);
    expect(db.email_verifications.docs).toHaveLength(1);
  });

  it("does not send anything to an already-verified user", async () => {
    const u = addUser({ emailVerified: new Date() });
    mockSession({ id: u.id, email: u.email });
    const body = await (await resend(jsonReq("/api/auth/verify/resend"))).json();
    expect(body.alreadyVerified).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports a failed send and respects the rate limit", async () => {
    const u = addUser();
    mockSession({ id: u.id, email: u.email });
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    expect((await resend(jsonReq("/api/auth/verify/resend"))).status).toBe(502);

    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfter: 60 });
    expect((await resend(jsonReq("/api/auth/verify/resend"))).status).toBe(429);
  });
});

describe("what an unverified email can and cannot do (the point of all this)", () => {
  const adminReq = () => new NextRequest(`http://localhost/api/forms/${FORM_ID}/admin`);
  const ctx = { params: Promise.resolve({ formId: FORM_ID }) };
  const VICTIM = "victim@school.org";

  beforeEach(() => {
    db.forms.docs.push({
      _id: FORM_ID,
      adminToken: "tok",
      title: "Class",
      fields: [{ id: "n", label: "Name", type: "text", isPrimary: true }],
      userId: "owner-1",
      confirmedAdmins: [VICTIM],
      createdAt: new Date(),
    });
  });

  it("a squatter who signed up with the victim's address gets no collaborator access", async () => {
    const squatter = addUser({ email: VICTIM, emailVerified: null });
    mockSession({ id: squatter.id, email: VICTIM });
    const res = await getAdmin(adminReq(), ctx);
    expect(res.status).toBe(403);
  });

  it("the real owner of the address gets access once they verify it", async () => {
    const real = addUser({ email: VICTIM, emailVerified: null });
    mockSession({ id: real.id, email: VICTIM });
    expect((await getAdmin(adminReq(), ctx)).status).toBe(403);

    const token = await issueVerificationToken(real.id, VICTIM);
    await consumeVerificationToken(token);
    expect((await getAdmin(adminReq(), ctx)).status).toBe(200);
  });

  it("Google users keep their access", async () => {
    const g = addUser({ email: VICTIM, emailVerified: null });
    db.accounts.docs.push({ _id: new ObjectId(), userId: g.oid, provider: "google" });
    mockSession({ id: g.id, email: VICTIM });
    expect((await getAdmin(adminReq(), ctx)).status).toBe(200);
  });

  it("an unverified owner still reaches their own form (ownership is by account, not email)", async () => {
    const owner = addUser({ email: "owner@school.org", emailVerified: null });
    db.forms.docs[0].userId = owner.id;
    mockSession({ id: owner.id, email: "owner@school.org" });
    expect((await getAdmin(adminReq(), ctx)).status).toBe(200);
  });

  it("with verification switched off, behaviour is unchanged", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const u = addUser({ email: VICTIM, emailVerified: null });
    mockSession({ id: u.id, email: VICTIM });
    expect((await getAdmin(adminReq(), ctx)).status).toBe(200);
  });

  describe("accepting an invitation", () => {
    const accept = () =>
      acceptInvite(jsonReq("/api/invites/tok1/accept"), { params: Promise.resolve({ token: "tok1" }) });

    beforeEach(() => {
      db.forms.docs[0].confirmedAdmins = [];
      db.invites.docs.push({
        _id: "tok1",
        formId: FORM_ID,
        formTitle: "Class",
        invitedEmail: VICTIM,
        invitedBy: "The form owner",
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
      });
    });

    it("is refused for an unverified account, explaining why, and changes nothing", async () => {
      const squatter = addUser({ email: VICTIM, emailVerified: null });
      mockSession({ id: squatter.id, email: VICTIM });
      const res = await accept();
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe("email-unverified");
      expect(db.invites.docs[0].status).toBe("pending");
      expect(db.forms.docs[0].confirmedAdmins).toEqual([]);
    });

    it("works for a verified account", async () => {
      const real = addUser({ email: VICTIM, emailVerified: new Date() });
      mockSession({ id: real.id, email: VICTIM });
      expect((await accept()).status).toBe(200);
      expect(db.forms.docs[0].confirmedAdmins).toEqual([VICTIM]);
    });

    it("still says 401 to someone who isn't signed in at all", async () => {
      expect((await accept()).status).toBe(401);
    });
  });
});
