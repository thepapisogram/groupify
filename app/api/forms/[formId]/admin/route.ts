import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { submissionsCollection } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const submissions = await (await submissionsCollection())
      .find({ formId })
      .sort({ submittedAt: -1 })
      .toArray();

    // Secrets (adminToken) and the collaborator list stay server-side.
    const { title, description, fields, isClosed } = auth.form;

    return NextResponse.json(
      {
        form: { title, description: description ?? "", fields, isClosed: isClosed ?? false },
        submissions,
        role: auth.role,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
