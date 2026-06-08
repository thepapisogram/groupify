import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
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

    let form;
    try {
      form = await db.collection("forms").findOne({ _id: new ObjectId(formId) });
    } catch {
      form = await db.collection("forms").findOne({ _id: formId as unknown as ObjectId });
    }
    
    if (!form || form.adminToken !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let subIdQuery;
    try {
      subIdQuery = new ObjectId(submissionId);
    } catch {
      subIdQuery = submissionId;
    }

    const result = await db.collection("submissions").deleteOne({
      _id: subIdQuery as unknown as ObjectId,
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
