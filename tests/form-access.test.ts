import { describe, expect, it, vi } from "vitest";

// form-access imports the auth config, which needs a database URL at import time.
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/db", () => ({ formsCollection: vi.fn() }));

import { resolveFormRole, roleAtLeast, tokenMatches } from "@/lib/form-access";

const form = {
  adminToken: "secret-token-1234",
  userId: "user-1",
  confirmedAdmins: ["collab@school.org"],
};

describe("tokenMatches", () => {
  it("accepts only the exact token", () => {
    expect(tokenMatches("abc", "abc")).toBe(true);
    expect(tokenMatches("abc", "abd")).toBe(false);
    expect(tokenMatches("abc", "abcd")).toBe(false);
    expect(tokenMatches("abc", "")).toBe(false);
    expect(tokenMatches("abc", null)).toBe(false);
    expect(tokenMatches("abc", undefined)).toBe(false);
  });

  it("never matches when the stored token is missing", () => {
    expect(tokenMatches(undefined, undefined)).toBe(false);
    expect(tokenMatches("", "")).toBe(false);
  });
});

describe("resolveFormRole", () => {
  it("gives a valid token owner rights", () => {
    expect(resolveFormRole(form, { token: form.adminToken })).toBe("owner");
  });

  it("gives the creating account owner rights without a token", () => {
    expect(resolveFormRole(form, { identity: { userId: "user-1" } })).toBe("owner");
  });

  it("makes accepted collaborators collaborators, matching email case-insensitively", () => {
    expect(resolveFormRole(form, { identity: { email: "Collab@School.org" } })).toBe("collaborator");
  });

  it("prefers owner when several credentials apply", () => {
    expect(
      resolveFormRole(form, {
        token: form.adminToken,
        identity: { email: "collab@school.org" },
      }),
    ).toBe("owner");
  });

  it("denies everyone else", () => {
    expect(resolveFormRole(form, {})).toBeNull();
    expect(resolveFormRole(form, { token: "wrong" })).toBeNull();
    expect(resolveFormRole(form, { identity: { userId: "user-2", email: "x@y.com" } })).toBeNull();
  });

  it("does not treat two anonymous parties as matching owners", () => {
    const anonymousForm = { adminToken: "t", confirmedAdmins: [] };
    expect(resolveFormRole(anonymousForm, { identity: {} })).toBeNull();
    expect(resolveFormRole(anonymousForm, { identity: { userId: undefined } })).toBeNull();
  });
});

describe("roleAtLeast", () => {
  it("orders owner above collaborator", () => {
    expect(roleAtLeast("owner", "owner")).toBe(true);
    expect(roleAtLeast("owner", "collaborator")).toBe(true);
    expect(roleAtLeast("collaborator", "collaborator")).toBe(true);
    expect(roleAtLeast("collaborator", "owner")).toBe(false);
  });
});
