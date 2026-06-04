import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import clientPromise from "@/lib/mongodb";

interface FormDoc {
  _id: string;
  adminToken: string;
  title: string;
  fields: Record<string, unknown>[];
  createdAt: Date;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, fields } = body;

    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");

    const formId = nanoid(6);
    const adminToken = nanoid(16);

    const newForm = {
      _id: formId,
      adminToken,
      title,
      fields,
      createdAt: new Date(),
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
