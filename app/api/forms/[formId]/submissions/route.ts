import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { formsCollection, submissionsCollection } from "@/lib/db";
import { readJson } from "@/lib/http";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { LIMITS, validateSubmission } from "@/lib/validation";
import type { SubmissionDoc } from "@/lib/models";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;

    const limit = await checkRateLimit("submit", `${getClientIp(req.headers)}:${formId}`, RULES.submit);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsedBody = await readJson(req, 32 * 1024);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;

    const form = await (await formsCollection()).findOne({ _id: formId });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.isClosed) {
      return NextResponse.json({ error: "This form is no longer accepting responses" }, { status: 403 });
    }

    const result = validateSubmission(form.fields, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const submissions = await submissionsCollection();

    const existing = await submissions.countDocuments({ formId });
    if (existing >= LIMITS.submissionsPerForm) {
      return NextResponse.json(
        { error: "This form has reached its response limit" },
        { status: 403 }
      );
    }

    const submissionId = nanoid(12);

    const newSubmission: SubmissionDoc = {
      _id: submissionId,
      formId,
      data: result.value,
      submittedAt: new Date(),
    };

    await submissions.insertOne(newSubmission);

    return NextResponse.json({ success: true, submissionId }, { status: 201 });
  } catch (error) {
    console.error("Error submitting form response:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
