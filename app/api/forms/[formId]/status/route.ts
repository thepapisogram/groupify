import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const adminToken = req.nextUrl.searchParams.get("token");

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");

    const form = await db.collection<{ _id: string; adminToken: string; isClosed?: boolean }>("forms").findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.adminToken !== adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { isClosed } = body;

    if (typeof isClosed !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await db.collection<{ _id: string; adminToken: string; isClosed?: boolean; updatedAt?: Date }>("forms").updateOne(
      { _id: formId },
      {
        $set: {
          isClosed,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, isClosed }, { status: 200 });
  } catch (error) {
    console.error("Error updating form status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
