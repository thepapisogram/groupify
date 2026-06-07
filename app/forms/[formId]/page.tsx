import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { FormFiller } from "@/components/groupify/form-filler";

export default async function FormFillerPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;

  const session = await getServerSession(authOptions);
  let userId = null;
  if (session?.user && (session.user as { id?: string }).id) {
    userId = (session.user as { id: string }).id;
  }
  const userEmail = session?.user?.email || null;

  const client = await clientPromise;
  const db = client.db("groupify");

  let form;
  try {
    form = await db.collection("forms").findOne({ _id: new ObjectId(formId) });
  } catch {
    form = await db.collection("forms").findOne({ _id: formId as unknown as ObjectId });
  }

  if (!form) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="mt-2 text-sm">Form not found or is no longer active</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  const isOwner = Boolean(userId === form.userId || (userEmail && form.adminEmails?.includes(userEmail)));

  const formConfig = {
    title: form.title,
    description: form.description,
    fields: form.fields,
    isOwner,
    adminToken: isOwner ? form.adminToken : undefined,
    isClosed: form.isClosed,
  };

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />
        <FormFiller formId={formId} formConfig={formConfig} />
        <Footer />
      </div>
    </div>
  );
}
