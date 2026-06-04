import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
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

    const submissions = await db
      .collection<SubmissionDoc>("submissions")
      .find({ formId })
      .sort({ submittedAt: -1 })
      .toArray();

    return NextResponse.json(
      {
        form,
        submissions,
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
