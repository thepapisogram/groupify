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

    const form = await db.collection<{ _id: string; adminToken: string; adminEmails?: string[] }>("forms").findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.adminToken !== adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { adminEmails } = body;

    if (!Array.isArray(adminEmails)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await db.collection<{ _id: string; adminToken: string; adminEmails?: string[]; updatedAt?: Date }>("forms").updateOne(
      { _id: formId },
      {
        $set: {
          adminEmails,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, adminEmails }, { status: 200 });
  } catch (error) {
    console.error("Error updating form admins:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
