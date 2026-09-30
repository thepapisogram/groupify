import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { submissionsCollection } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> }
) {
  try {
    const { formId, submissionId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const result = await (await submissionsCollection()).deleteOne({
      _id: submissionId,
      formId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
