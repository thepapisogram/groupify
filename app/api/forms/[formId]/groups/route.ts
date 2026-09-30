import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection } from "@/lib/db";
import { invalidateFormCache, readJson } from "@/lib/http";
import { parsePublishedGroups } from "@/lib/validation";

type Params = { params: Promise<{ formId: string }> };

/** Publish (or replace) the groups respondents can see at /forms/:id/groups. */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const parsedBody = await readJson(req, 256 * 1024);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = parsePublishedGroups(parsedBody.body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const publishedAt = new Date();
    await (await formsCollection()).updateOne(
      { _id: formId },
      { $set: { publishedGroups: { publishedAt, groups: parsed.value.groups } } }
    );

    invalidateFormCache(formId);

    return NextResponse.json({ success: true, publishedAt }, { status: 200 });
  } catch (error) {
    console.error("Error publishing groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Take the published groups down. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    await (await formsCollection()).updateOne({ _id: formId }, { $unset: { publishedGroups: "" } });

    invalidateFormCache(formId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error unpublishing groups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
