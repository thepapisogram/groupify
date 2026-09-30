import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection } from "@/lib/db";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/validation";
import type { FormDoc } from "@/lib/models";

/**
 * Copy a form's setup (title, description, fields) into a brand-new form. Responses,
 * collaborators, published groups and open/closed state are deliberately not copied,
 * so it's a clean start, e.g. for the next class or term.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const limit = await checkRateLimit("create-form", getClientIp(req.headers), RULES.createForm);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const newFormId = nanoid(6);
    const adminToken = nanoid(16);
    const { title, description, fields } = auth.form;

    const copy: FormDoc = {
      _id: newFormId,
      adminToken,
      title: `${title} (copy)`.slice(0, LIMITS.titleMax),
      ...(description ? { description } : {}),
      fields: structuredClone(fields),
      createdAt: new Date(),
      ...(auth.identity.userId ? { userId: auth.identity.userId } : {}),
    };

    await (await formsCollection()).insertOne(copy);

    return NextResponse.json({ formId: newFormId, adminToken }, { status: 201 });
  } catch (error) {
    console.error("Error duplicating form:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
