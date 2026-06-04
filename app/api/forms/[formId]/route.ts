import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  fields: Record<string, unknown>[];
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const client = await clientPromise;
    const db = client.db("groupify");

    const form = await db.collection<FormDoc>("forms").findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Omit adminToken for public view
    const { adminToken, ...publicForm } = form;

    return NextResponse.json(publicForm, { status: 200 });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await req.json();
    const { title, fields } = body;

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await db.collection<FormDoc>("forms").updateOne(
      { _id: formId },
      {
        $set: {
          title,
          fields,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete form and its submissions
    await db.collection<FormDoc>("forms").deleteOne({ _id: formId });
    await db.collection<{ formId: string }>("submissions").deleteMany({ formId });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
