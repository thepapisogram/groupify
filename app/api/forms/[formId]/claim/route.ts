import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection } from "@/lib/db";

/**
 * Attach an anonymously-created form to the signed-in user's account, so it shows
 * up in My Forms and no longer depends on holding the admin link.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "owner");
    if (!auth.ok) return auth.response;

    const userId = auth.identity.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sign in to save this form to your account" }, { status: 401 });
    }

    if (auth.form.userId) {
      if (auth.form.userId === userId) {
        return NextResponse.json({ success: true, alreadyYours: true }, { status: 200 });
      }
      return NextResponse.json({ error: "This form already belongs to another account" }, { status: 409 });
    }

    // Only claim while nobody owns it, so two simultaneous claims can't both win.
    const result = await (await formsCollection()).updateOne(
      { _id: formId, userId: { $exists: false } },
      { $set: { userId, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "This form already belongs to another account" }, { status: 409 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error claiming form:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
