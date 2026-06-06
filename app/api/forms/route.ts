import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  fields: Record<string, unknown>[];
  createdAt: Date;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { title, fields } = body;

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");

    const formId = nanoid(6);
    const adminToken = nanoid(16);

    const newForm: FormDoc = {
      _id: formId,
      adminToken,
      title,
      fields,
      createdAt: new Date(),
      ...((session?.user as any)?.id ? { userId: (session?.user as any).id } : {}),
    };

    await db.collection<FormDoc>("forms").insertOne(newForm);

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
