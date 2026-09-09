import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  userId?: string;
  confirmedAdmins?: string[];
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

    const client = await clientPromise;
    const db = client.db("groupify");

    const form = await db.collection<FormDoc>("forms").findOne({ _id: formId as any });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const userEmail = session?.user?.email;

    const isOwner = !!(form.userId && userId === form.userId);
    const isSharedAdmin = !!(userEmail && form.confirmedAdmins && form.confirmedAdmins.includes(userEmail));
    
    // Auth check: either the provided token is correct, OR they are authenticated as owner/collaborator
    const hasValidToken = adminToken && form.adminToken === adminToken;
    const hasSessionAccess = isOwner || isSharedAdmin;

    if (!hasValidToken && !hasSessionAccess) {
      return NextResponse.json({ error: "Unauthorized or Forbidden" }, { status: 403 });
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
