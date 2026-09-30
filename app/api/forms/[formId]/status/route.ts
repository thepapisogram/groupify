import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection } from "@/lib/db";
import { invalidateFormCache, readJson } from "@/lib/http";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const parsedBody = await readJson(req, 1024);
    if (!parsedBody.ok) return parsedBody.response;
    const { isClosed } = (parsedBody.body ?? {}) as { isClosed?: unknown };

    if (typeof isClosed !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await (await formsCollection()).updateOne(
      { _id: formId },
      { $set: { isClosed, updatedAt: new Date() } }
    );

    invalidateFormCache(formId);

    return NextResponse.json({ success: true, isClosed }, { status: 200 });
  } catch (error) {
    console.error("Error updating form status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
