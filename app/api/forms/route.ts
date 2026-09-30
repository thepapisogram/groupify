import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { formsCollection } from "@/lib/db";
import { readJson } from "@/lib/http";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { parseFormDefinition } from "@/lib/validation";
import type { FormDoc } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit("create-form", getClientIp(req.headers), RULES.createForm);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsedBody = await readJson(req, 64 * 1024);
    if (!parsedBody.ok) return parsedBody.response;

    const definition = parseFormDefinition(parsedBody.body);
    if (!definition.ok) {
      return NextResponse.json({ error: definition.error }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const formId = nanoid(6);
    const adminToken = nanoid(16);

    const newForm: FormDoc = {
      _id: formId,
      adminToken,
      ...definition.value,
      createdAt: new Date(),
      ...(userId ? { userId } : {}),
    };

    await (await formsCollection()).insertOne(newForm);

    return NextResponse.json(
      { formId, adminToken },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
