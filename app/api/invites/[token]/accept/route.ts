import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");
    
    const invite = await db.collection("invites").findOne({ _id: token as unknown as import("mongodb").ObjectId });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    if (invite.invitedEmail !== session.user.email) {
      return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
    }

    // Mark invite as accepted
    await db.collection("invites").updateOne(
      { _id: token as unknown as import("mongodb").ObjectId },
      { $set: { status: "accepted", acceptedAt: new Date() } }
    );

    // Add user to confirmedAdmins
    await db.collection("forms").updateOne(
      { _id: invite.formId as unknown as import("mongodb").ObjectId },
      { $addToSet: { confirmedAdmins: session.user.email } as unknown as import("mongodb").UpdateFilter<Document> }
    );

    return NextResponse.json({ success: true, formId: invite.formId });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
