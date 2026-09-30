import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection, invitesCollection, submissionsCollection } from "@/lib/db";
import { invalidateFormCache, readJson } from "@/lib/http";
import { parseFormDefinition } from "@/lib/validation";

type Params = { params: Promise<{ formId: string }> };

/** Public: what a respondent needs to fill the form in. Never exposes secrets or ownership. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { formId } = await params;
    const form = await (await formsCollection()).findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        _id: form._id,
        title: form.title,
        description: form.description ?? "",
        fields: form.fields,
        isClosed: form.isClosed ?? false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const parsedBody = await readJson(req, 64 * 1024);
    if (!parsedBody.ok) return parsedBody.response;

    const definition = parseFormDefinition(parsedBody.body);
    if (!definition.ok) {
      return NextResponse.json({ error: definition.error }, { status: 400 });
    }

    await (await formsCollection()).updateOne(
      { _id: formId },
      { $set: { ...definition.value, updatedAt: new Date() } }
    );

    invalidateFormCache(formId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "owner");
    if (!auth.ok) return auth.response;

    await (await formsCollection()).deleteOne({ _id: formId });
    await (await submissionsCollection()).deleteMany({ formId });
    await (await invitesCollection()).deleteMany({ formId });

    invalidateFormCache(formId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
