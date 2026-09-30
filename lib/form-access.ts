import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ADMIN_TOKEN_HEADER } from "@/lib/admin-client";
import { formsCollection } from "@/lib/db";
import { normalizeEmail } from "@/lib/validation";
import { isUserVerified } from "@/lib/verification";
import type { FormDoc } from "@/lib/models";

/**
 * owner        – created the form (signed in) or holds its admin token. Can do everything.
 * collaborator – accepted an invite. Can work with responses and edit the form,
 *                but cannot delete it, rotate its link or manage other collaborators.
 */
export type FormRole = "owner" | "collaborator";

export interface Identity {
  userId?: string;
  /** The account's email, but only once it is verified. Everything email-based (collaborator access, invites) uses this. */
  email?: string;
  /** The account's email while it is still unverified. Never grants access. */
  pendingEmail?: string;
}

/** Constant-time comparison that also hides length differences. */
export function tokenMatches(expected: string | undefined, provided: string | null | undefined): boolean {
  if (!expected || !provided) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}

export function resolveFormRole(
  form: Pick<FormDoc, "adminToken" | "userId" | "confirmedAdmins">,
  { token, identity }: { token?: string | null; identity?: Identity },
): FormRole | null {
  if (tokenMatches(form.adminToken, token)) return "owner";
  if (form.userId && identity?.userId && form.userId === identity.userId) return "owner";

  const email = normalizeEmail(identity?.email);
  if (email && form.confirmedAdmins?.some((a) => normalizeEmail(a) === email)) {
    return "collaborator";
  }
  return null;
}

export function roleAtLeast(role: FormRole, minimum: FormRole): boolean {
  return role === "owner" || minimum === "collaborator";
}

export async function getIdentity(): Promise<Identity> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email ?? undefined;
  if (!userId && !email) return {};

  // Anyone can type any address into the signup form, so an email only counts once it's proven.
  const verified = await isUserVerified(userId);
  return verified ? { userId, email } : { userId, pendingEmail: email };
}

/** Read the admin token from the header (preferred) or the legacy `?token=` query parameter. */
export function readAdminToken(req: Request): string | null {
  const header = req.headers.get(ADMIN_TOKEN_HEADER);
  if (header) return header;
  try {
    return new URL(req.url).searchParams.get("token");
  } catch {
    return null;
  }
}

export type FormAuthResult =
  | { ok: true; form: FormDoc; role: FormRole; identity: Identity }
  | { ok: false; response: NextResponse };

/**
 * Authorise an API request against a form. Returns the form and the caller's
 * role, or a ready-to-return error response (404 unknown form, 401 no
 * credentials, 403 credentials that aren't enough).
 */
export async function authorizeForm(
  req: Request,
  formId: string,
  minimum: FormRole = "collaborator",
): Promise<FormAuthResult> {
  const forms = await formsCollection();
  const form = await forms.findOne({ _id: formId });
  if (!form) {
    return { ok: false, response: NextResponse.json({ error: "Form not found" }, { status: 404 }) };
  }

  const token = readAdminToken(req);
  const identity = await getIdentity();
  const role = resolveFormRole(form, { token, identity });

  if (!role) {
    const hasCredentials = Boolean(token || identity.userId || identity.email || identity.pendingEmail);
    return {
      ok: false,
      response: NextResponse.json(
        { error: hasCredentials ? "Forbidden" : "Unauthorized" },
        { status: hasCredentials ? 403 : 401 },
      ),
    };
  }

  if (!roleAtLeast(role, minimum)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Only the form owner can do this" }, { status: 403 }),
    };
  }

  return { ok: true, form, role, identity };
}
