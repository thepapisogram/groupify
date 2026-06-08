import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { InviteAcceptedEmail } from "@/lib/emails/invite-accepted";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Only available in development" }, { status: 403 });
    }

    const { formId } = await params;
    const adminToken = req.nextUrl.searchParams.get("token");

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    const client = await clientPromise;
    const db = client.db("groupify");

    let form;
    try {
      form = await db.collection("forms").findOne({ _id: new ObjectId(formId) });
    } catch {
      form = await db.collection("forms").findOne({ _id: formId as unknown as ObjectId });
    }

    if (!form || form.adminToken !== adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const formUrl = `${appUrl}/forms/${formId}/admin?token=${form.adminToken}`;
      
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Groupify <noreply@groupify.app>",
        to: email,
        subject: `[TEST] ${email} accepted your invitation!`,
        react: InviteAcceptedEmail({
          collaboratorEmail: email,
          formTitle: form.title,
          formUrl,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending test accepted invite:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
