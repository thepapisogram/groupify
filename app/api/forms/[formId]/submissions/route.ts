import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clientPromise from "@/lib/mongodb";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  fields: Record<string, unknown>[];
}

interface SubmissionDoc {
  _id: string;
  formId: string;
  data: Record<string, string>;
  submittedAt: Date;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");

    const form = await db.collection<FormDoc>("forms").findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Basic validation based on form fields
    for (const field of form.fields) {
      if (field.required && !body[field.id]) {
        return NextResponse.json(
          { error: `Field ${field.label} is required` },
          { status: 400 }
        );
      }
    }

    const submissionId = nanoid(12);

    const newSubmission = {
      _id: submissionId,
      formId,
      data: body,
      submittedAt: new Date(),
    };

    await db.collection<SubmissionDoc>("submissions").insertOne(newSubmission);

    return NextResponse.json({ success: true, submissionId }, { status: 201 });
  } catch (error) {
    console.error("Error submitting form response:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
