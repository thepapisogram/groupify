import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", async () => await import("./helpers/fake-db"));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => true) }));
vi.mock("@/lib/emails/invite", () => ({ InviteEmail: () => null }));
vi.mock("@/lib/emails/invite-accepted", () => ({ InviteAcceptedEmail: () => null }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(async () => ({ ok: true, retryAfter: 1 })),
}));

import { getServerSession } from "next-auth/next";
import { revalidateTag } from "next/cache";
import { sendEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { db, resetDb } from "./helpers/fake-db";

import { GET as getForm, PUT as putForm, DELETE as deleteForm } from "@/app/api/forms/[formId]/route";
import { POST as postSubmission } from "@/app/api/forms/[formId]/submissions/route";
import { DELETE as deleteSubmission } from "@/app/api/forms/[formId]/submissions/[submissionId]/route";
import { GET as getAdmin } from "@/app/api/forms/[formId]/admin/route";
import { PATCH as patchStatus } from "@/app/api/forms/[formId]/status/route";
import { POST as regenerate } from "@/app/api/forms/[formId]/regenerate/route";
import { GET as getInvites, POST as postInvite } from "@/app/api/forms/[formId]/invites/route";
import { POST as acceptInvite } from "@/app/api/invites/[token]/accept/route";
import { PUT as publishGroups, DELETE as unpublishGroups } from "@/app/api/forms/[formId]/groups/route";

const FORM_ID = "form01";
const TOKEN = "owner-token-abc123";
const fields = [
  { id: "name", label: "Name", type: "text", isPrimary: true, required: true },
  { id: "team", label: "Team", type: "select", options: ["Red", "Blue"] },
];

const mockSession = (user: { id?: string; email?: string } | null) =>
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);

function req(url: string, init: { method?: string; body?: string; token?: string } = {}) {
  const headers = new Headers();
  if (init.token) headers.set("x-admin-token", init.token);
  if (init.body) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${url}`, { method: init.method, body: init.body, headers });
}

const ctx = <T extends Record<string, string>>(extra?: T) => ({
  params: Promise.resolve({ formId: FORM_ID, ...extra } as { formId: string } & T),
});
const json = (body: unknown) => JSON.stringify(body);

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue({ ok: true, retryAfter: 1 });
  mockSession(null);
  db.forms.docs.push({
    _id: FORM_ID,
    adminToken: TOKEN,
    title: "Groups",
    description: "d",
    fields,
    userId: "owner-1",
    confirmedAdmins: ["collab@school.org"],
    isClosed: false,
    createdAt: new Date(),
  });
});

describe("public form read", () => {
  it("never exposes the admin token, owner id or collaborators", async () => {
    const res = await getForm(req(`/api/forms/${FORM_ID}`), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ _id: FORM_ID, title: "Groups", description: "d", fields, isClosed: false });
    expect(JSON.stringify(body)).not.toContain(TOKEN);
    expect(JSON.stringify(body)).not.toContain("owner-1");
    expect(JSON.stringify(body)).not.toContain("collab@school.org");
  });

  it("404s for unknown forms", async () => {
    const res = await getForm(req("/api/forms/nope"), { params: Promise.resolve({ formId: "nope" }) });
    expect(res.status).toBe(404);
  });
});

describe("submissions (public)", () => {
  const post = (body: unknown, raw?: string) =>
    postSubmission(req(`/api/forms/${FORM_ID}/submissions`, { method: "POST", body: raw ?? json(body) }), ctx());

  it("stores only the declared fields", async () => {
    const res = await post({ name: "Ama", team: "Red", admin: true, $where: "1" });
    expect(res.status).toBe(201);
    expect(db.submissions.docs).toHaveLength(1);
    expect(db.submissions.docs[0].data).toEqual({ name: "Ama", team: "Red" });
  });

  it("rejects invalid answers and stores nothing", async () => {
    expect((await post({ team: "Red" })).status).toBe(400);
    expect((await post({ name: "Ama", team: "Green" })).status).toBe(400);
    expect(db.submissions.docs).toHaveLength(0);
  });

  it("rejects malformed and oversized payloads", async () => {
    expect((await post(null, "{not json")).status).toBe(400);
    expect((await post(null, json({ name: "x".repeat(40_000) }))).status).toBe(413);
  });

  it("refuses responses when the form is closed", async () => {
    db.forms.docs[0].isClosed = true;
    const res = await post({ name: "Ama" });
    expect(res.status).toBe(403);
    expect(db.submissions.docs).toHaveLength(0);
  });

  it("stops accepting once the per-form cap is reached", async () => {
    const original = db.submissions.countDocuments.bind(db.submissions);
    db.submissions.countDocuments = async () => 10_000;
    const res = await post({ name: "Ama" });
    db.submissions.countDocuments = original;
    expect(res.status).toBe(403);
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ ok: false, retryAfter: 42 });
    const res = await post({ name: "Ama" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(db.submissions.docs).toHaveLength(0);
  });
});

describe("authorisation matrix", () => {
  it("rejects requests with no credentials (401) or wrong ones (403)", async () => {
    const anon = await getAdmin(req(`/api/forms/${FORM_ID}/admin`), ctx());
    expect(anon.status).toBe(401);

    const wrong = await getAdmin(req(`/api/forms/${FORM_ID}/admin`, { token: "guess" }), ctx());
    expect(wrong.status).toBe(403);

    mockSession({ id: "someone-else", email: "x@y.com" });
    const stranger = await getAdmin(req(`/api/forms/${FORM_ID}/admin`), ctx());
    expect(stranger.status).toBe(403);
  });

  it("accepts the token via header or legacy query string", async () => {
    expect((await getAdmin(req(`/api/forms/${FORM_ID}/admin`, { token: TOKEN }), ctx())).status).toBe(200);
    expect((await getAdmin(req(`/api/forms/${FORM_ID}/admin?token=${TOKEN}`), ctx())).status).toBe(200);
  });

  it("lets a signed-in owner in without any token", async () => {
    mockSession({ id: "owner-1", email: "owner@school.org" });
    expect((await getAdmin(req(`/api/forms/${FORM_ID}/admin`), ctx())).status).toBe(200);
  });

  it("never returns the admin token from the admin endpoint", async () => {
    mockSession({ email: "collab@school.org" });
    const res = await getAdmin(req(`/api/forms/${FORM_ID}/admin`), ctx());
    expect(res.status).toBe(200);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain("adminToken");
  });

  describe("collaborator", () => {
    beforeEach(() => mockSession({ id: "collab-9", email: "Collab@School.org" }));

    it("can edit the form, toggle its status and delete responses", async () => {
      db.submissions.docs.push({ _id: "s1", formId: FORM_ID, data: {}, submittedAt: new Date() });

      const put = await putForm(
        req(`/api/forms/${FORM_ID}`, { method: "PUT", body: json({ title: "New", fields }) }),
        ctx(),
      );
      expect(put.status).toBe(200);
      expect(db.forms.docs[0].title).toBe("New");

      const status = await patchStatus(
        req(`/api/forms/${FORM_ID}/status`, { method: "PATCH", body: json({ isClosed: true }) }),
        ctx(),
      );
      expect(status.status).toBe(200);
      expect(db.forms.docs[0].isClosed).toBe(true);

      const del = await deleteSubmission(
        req(`/api/forms/${FORM_ID}/submissions/s1`, { method: "DELETE" }),
        ctx({ submissionId: "s1" }),
      );
      expect(del.status).toBe(200);
      expect(db.submissions.docs).toHaveLength(0);
    });

    it("cannot delete the form, rotate its link or manage collaborators", async () => {
      const del = await deleteForm(req(`/api/forms/${FORM_ID}`, { method: "DELETE" }), ctx());
      expect(del.status).toBe(403);
      expect(db.forms.docs).toHaveLength(1);

      const regen = await regenerate(req(`/api/forms/${FORM_ID}/regenerate`, { method: "POST" }), ctx());
      expect(regen.status).toBe(403);
      expect(db.forms.docs[0]._id).toBe(FORM_ID);

      db.users.docs.push({ _id: "u", email: "new@school.org" });
      const invite = await postInvite(
        req(`/api/forms/${FORM_ID}/invites`, { method: "POST", body: json({ email: "new@school.org" }) }),
        ctx(),
      );
      expect(invite.status).toBe(403);
      expect(db.invites.docs).toHaveLength(0);
    });

    it("can see who the collaborators are", async () => {
      const res = await getInvites(req(`/api/forms/${FORM_ID}/invites`), ctx());
      expect(res.status).toBe(200);
      expect((await res.json()).active[0].email).toBe("collab@school.org");
    });
  });

  describe("owner", () => {
    it("can delete the form, which also removes its responses and invites", async () => {
      db.submissions.docs.push({ _id: "s1", formId: FORM_ID, data: {}, submittedAt: new Date() });
      db.invites.docs.push({ _id: "i1", formId: FORM_ID, invitedEmail: "a@b.co", status: "pending" });

      const res = await deleteForm(req(`/api/forms/${FORM_ID}`, { method: "DELETE", token: TOKEN }), ctx());
      expect(res.status).toBe(200);
      expect(db.forms.docs).toHaveLength(0);
      expect(db.submissions.docs).toHaveLength(0);
      expect(db.invites.docs).toHaveLength(0);
      expect(revalidateTag).toHaveBeenCalledWith(`form-${FORM_ID}`, { expire: 0 });
    });

    it("rejects invalid form definitions on edit", async () => {
      const res = await putForm(
        req(`/api/forms/${FORM_ID}`, { method: "PUT", token: TOKEN, body: json({ title: "", fields: [] }) }),
        ctx(),
      );
      expect(res.status).toBe(400);
      expect(db.forms.docs[0].title).toBe("Groups");
    });

    it("rotating the link moves responses and invites to the new form and drops the old one", async () => {
      db.submissions.docs.push({ _id: "s1", formId: FORM_ID, data: {}, submittedAt: new Date() });
      db.invites.docs.push({ _id: "i1", formId: FORM_ID, invitedEmail: "a@b.co", status: "pending" });

      const res = await regenerate(req(`/api/forms/${FORM_ID}/regenerate`, { method: "POST", token: TOKEN }), ctx());
      expect(res.status).toBe(200);
      const { newFormId, newAdminToken } = await res.json();

      expect(newFormId).not.toBe(FORM_ID);
      expect(newAdminToken).not.toBe(TOKEN);
      expect(db.forms.docs.map((d) => d._id)).toEqual([newFormId]);
      expect(db.forms.docs[0].adminToken).toBe(newAdminToken);
      expect(db.submissions.docs[0].formId).toBe(newFormId);
      expect(db.invites.docs[0].formId).toBe(newFormId);
      expect(revalidateTag).toHaveBeenCalledWith(`form-${FORM_ID}`, { expire: 0 });
    });
  });
});

describe("invites", () => {
  beforeEach(() => {
    mockSession({ id: "owner-1", email: "Owner@School.org" });
    db.users.docs.push({ _id: "u1", email: "new@school.org" });
  });

  const invite = (email: unknown) =>
    postInvite(req(`/api/forms/${FORM_ID}/invites`, { method: "POST", body: json({ email }) }), ctx());

  it("creates a normalised invite and emails it", async () => {
    const res = await invite("  New@School.org ");
    expect(res.status).toBe(200);
    expect(db.invites.docs[0]).toMatchObject({
      formId: FORM_ID,
      invitedEmail: "new@school.org",
      invitedBy: "owner@school.org",
      status: "pending",
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((await res.json()).emailSent).toBe(true);
  });

  it("still succeeds and hands back the link when the email can't be sent", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(false);
    const body = await (await invite("new@school.org")).json();
    expect(body.emailSent).toBe(false);
    expect(body.inviteLink).toContain(`/invites/${body.inviteId}`);
  });

  it("rejects invalid, self, unknown and duplicate invitees", async () => {
    expect((await invite("nope")).status).toBe(400);
    expect((await invite("owner@school.org")).status).toBe(400);
    expect((await invite("ghost@school.org")).status).toBe(404);
    db.users.docs.push({ _id: "u2", email: "collab@school.org" });
    expect((await invite("collab@school.org")).status).toBe(400); // already a collaborator
    expect((await invite("COLLAB@school.org")).status).toBe(400);

    expect((await invite("new@school.org")).status).toBe(200);
    expect((await invite("NEW@school.org")).status).toBe(400); // pending already
  });

  describe("accepting", () => {
    const accept = (token: string) =>
      acceptInvite(req(`/api/invites/${token}/accept`, { method: "POST" }), {
        params: Promise.resolve({ token }),
      });

    beforeEach(() => {
      db.invites.docs.push({
        _id: "tok1",
        formId: FORM_ID,
        formTitle: "Groups",
        invitedEmail: "new@school.org",
        invitedBy: "owner@school.org",
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
      });
    });

    it("grants collaborator access to the matching account, case-insensitively", async () => {
      mockSession({ id: "u1", email: "New@School.org" });
      const res = await accept("tok1");
      expect(res.status).toBe(200);
      expect(db.forms.docs[0].confirmedAdmins).toContain("new@school.org");
      expect(db.invites.docs[0].status).toBe("accepted");
    });

    it("refuses a different account and leaves the invite pending", async () => {
      mockSession({ id: "u9", email: "other@school.org" });
      expect((await accept("tok1")).status).toBe(403);
      expect(db.invites.docs[0].status).toBe("pending");
      expect(db.forms.docs[0].confirmedAdmins).not.toContain("other@school.org");
    });

    it("requires sign-in and rejects expired invites", async () => {
      mockSession(null);
      expect((await accept("tok1")).status).toBe(401);
      mockSession({ id: "u1", email: "new@school.org" });
      db.invites.docs[0].expiresAt = new Date(Date.now() - 1000);
      expect((await accept("tok1")).status).toBe(400);
    });

    it("succeeds even when the inviter was anonymous (the old placeholder inviter broke this)", async () => {
      db.invites.docs[0].invitedBy = "The form owner";
      mockSession({ id: "u1", email: "new@school.org" });
      const res = await accept("tok1");
      expect(res.status).toBe(200);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("succeeds even if the notification email fails", async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce(false);
      mockSession({ id: "u1", email: "new@school.org" });
      expect((await accept("tok1")).status).toBe(200);
      expect(db.invites.docs[0].status).toBe("accepted");
    });
  });
});

describe("publishing groups", () => {
  const payload = { groups: [{ label: "Red", members: ["Ama", "Kofi"] }, { label: "Blue", members: ["Esi"] }] };
  const publish = (body: unknown, token?: string) =>
    publishGroups(req(`/api/forms/${FORM_ID}/groups`, { method: "PUT", body: json(body), token }), ctx());
  const unpublish = (token?: string) =>
    unpublishGroups(req(`/api/forms/${FORM_ID}/groups`, { method: "DELETE", token }), ctx());

  it("requires credentials", async () => {
    expect((await publish(payload)).status).toBe(401);
    expect((await publish(payload, "wrong")).status).toBe(403);
    expect(db.forms.docs[0].publishedGroups).toBeUndefined();
  });

  it("lets the owner (by token) and a collaborator (by session) publish and unpublish", async () => {
    expect((await publish(payload, TOKEN)).status).toBe(200);
    expect(db.forms.docs[0].publishedGroups).toMatchObject({ groups: payload.groups });
    expect(revalidateTag).toHaveBeenCalledWith(`form-${FORM_ID}`, { expire: 0 });

    mockSession({ id: "c1", email: "collab@school.org" });
    expect((await unpublish()).status).toBe(200);
    expect(db.forms.docs[0].publishedGroups).toBeUndefined();

    expect((await publish({ groups: [{ label: "Only", members: ["Ama"] }] })).status).toBe(200);
    expect(db.forms.docs[0].publishedGroups).toMatchObject({ groups: [{ label: "Only", members: ["Ama"] }] });
  });

  it("stores only names, never other answers, and rejects bad payloads", async () => {
    const res = await publish(
      { groups: [{ label: "Red", members: ["Ama"], rawMembers: [{ email: "ama@x.com" }] }] },
      TOKEN,
    );
    expect(res.status).toBe(200);
    expect(JSON.stringify(db.forms.docs[0].publishedGroups)).not.toContain("ama@x.com");

    expect((await publish({ groups: [] }, TOKEN)).status).toBe(400);
    expect((await publish("nope", TOKEN)).status).toBe(400);
  });

  it("is carried over when the form link is regenerated", async () => {
    await publish(payload, TOKEN);
    const res = await regenerate(req(`/api/forms/${FORM_ID}/regenerate`, { method: "POST", token: TOKEN }), ctx());
    expect(res.status).toBe(200);
    expect(db.forms.docs[0].publishedGroups).toMatchObject({ groups: payload.groups });
  });

  it("does not leak published groups through the public form endpoint", async () => {
    await publish(payload, TOKEN);
    const body = await (await getForm(req(`/api/forms/${FORM_ID}`), ctx())).json();
    expect(JSON.stringify(body)).not.toContain("Ama");
  });
});
