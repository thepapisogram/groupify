import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection, invitesCollection, submissionsCollection } from "@/lib/db";
import { invalidateFormCache } from "@/lib/http";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "owner");
    if (!auth.ok) return auth.response;

    const forms = await formsCollection();

    // Copy first, move dependants, delete last: a failure part-way never loses data.
    const newFormId = nanoid(6);
    const newAdminToken = crypto.randomBytes(32).toString("hex");
    await forms.insertOne({
      ...auth.form,
      _id: newFormId,
      adminToken: newAdminToken,
      updatedAt: new Date(),
    });

    await (await submissionsCollection()).updateMany({ formId }, { $set: { formId: newFormId } });
    await (await invitesCollection()).updateMany({ formId }, { $set: { formId: newFormId } });
    await forms.deleteOne({ _id: formId });

    // The old public page is cached; without this the "old" link would keep rendering.
    invalidateFormCache(formId);

    return NextResponse.json({ newFormId, newAdminToken }, { status: 200 });
  } catch (error) {
    console.error("Error regenerating form link:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
