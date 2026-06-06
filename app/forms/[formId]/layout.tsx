import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";

interface FormDoc {
  _id: string;
  title: string;
  description?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ formId: string }>;
}): Promise<Metadata> {
  const { formId } = await params;
  try {
    const client = await clientPromise;
    const db = client.db("groupify");
    const form = await db.collection<FormDoc>("forms").findOne({ _id: formId });

    if (form) {
      return {
        title: form.title,
        description: form.description || "Fill this form.",
      };
    }
  } catch (error) {
    console.error("Error fetching form metadata:", error);
  }

  return {
    title: "Groupify Form",
    description: "Fill this form.",
  };
}

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
