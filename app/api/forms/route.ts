import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  description?: string;
  fields: Record<string, unknown>[];
  createdAt: Date;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { title, description, fields } = body;

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");

    const formId = nanoid(6);
    const adminToken = nanoid(16);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const newForm: FormDoc = {
      _id: formId,
      adminToken,
      title,
      description,
      fields,
      createdAt: new Date(),
      ...(userId ? { userId } : {}),
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
