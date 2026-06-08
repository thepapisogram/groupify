import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { nanoid } from "nanoid";
import crypto from "crypto";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  fields: Record<string, unknown>[];
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export async function POST(
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

    const form = await db.collection<FormDoc>("forms").findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.adminToken !== adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate a new formId and adminToken
    const newFormId = nanoid(6);
    const newAdminToken = crypto.randomBytes(32).toString("hex");
    const newForm: FormDoc = { ...form, _id: newFormId, adminToken: newAdminToken, updatedAt: new Date() };

    await db.collection<FormDoc>("forms").insertOne(newForm);
    await db.collection<FormDoc>("forms").deleteOne({ _id: formId });
    
    // Update all submissions to reference the new formId
    await db.collection<{ formId: string }>("submissions").updateMany(
      { formId: formId },
      { $set: { formId: newFormId } }
    );

    return NextResponse.json({ newFormId, newAdminToken }, { status: 200 });
  } catch (error) {
    console.error("Error regenerating form link:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
