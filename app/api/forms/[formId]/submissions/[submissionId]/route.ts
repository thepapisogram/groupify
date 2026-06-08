import { NextRequest, NextResponse } from "next/server";
import clientPromise, { safeObjectId } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string; submissionId: string }> }
) {
  try {
    const { formId, submissionId } = await params;
    
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");

    const form = await db.collection("forms").findOne({ _id: safeObjectId(formId) as unknown as ObjectId });
    
    if (!form || form.adminToken !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.collection("submissions").deleteOne({
      _id: safeObjectId(submissionId) as unknown as ObjectId,
      formId: formId,
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
