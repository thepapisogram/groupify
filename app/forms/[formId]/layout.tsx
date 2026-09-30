import type { Metadata } from "next";
import { formsCollection } from "@/lib/db";

// Forms belong to whoever made them; they are shared by link and shouldn't appear in search results.
const NO_INDEX = { index: false, follow: false } as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ formId: string }>;
}): Promise<Metadata> {
  const { formId } = await params;
  try {
    const form = await (await formsCollection()).findOne(
      { _id: formId },
      { projection: { title: 1, description: 1 } },
    );

    if (form) {
      return {
        title: form.title,
        description: form.description || "Fill this form.",
        robots: NO_INDEX,
      };
    }
  } catch (error) {
    console.error("Error fetching form metadata:", error);
  }

  return {
    title: "Groupify Form",
    description: "Fill this form.",
    robots: NO_INDEX,
  };
}

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
