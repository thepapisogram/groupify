import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { unstable_cache } from "next/cache";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { FormFiller } from "@/components/groupify/form-filler";
import { FormField } from "@/components/groupify/form-builder";

export default async function FormFillerPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;

  const session = await getServerSession(authOptions);
  let userId = null;
  if (session?.user && (session.user as { id?: string }).id) {
    userId = (session.user as { id: string }).id;
  }
  const userEmail = session?.user?.email || null;

  const getForm = unstable_cache(
    async (id: string) => {
      const client = await clientPromise;
      const db = client.db("groupify");
      interface FormDoc {
        _id: ObjectId | string;
        userId?: string;
        confirmedAdmins?: string[];
        title: string;
        description?: string;
        fields: FormField[];
        adminToken?: string;
        isClosed?: boolean;
      }
      let form: FormDoc | null = null;
      try {
        form = await db.collection<FormDoc>("forms").findOne({ _id: new ObjectId(id) });
      } catch {
        form = await db.collection<FormDoc>("forms").findOne({ _id: id as unknown as ObjectId });
      }
      if (form) {
        return {
          ...form,
          _id: form._id.toString(),
        };
      }
      return null;
    },
    ["form", formId],
    { tags: [`form-${formId}`] }
  );

  const form = await getForm(formId);

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

  const isOwner = Boolean(userId === form.userId || (userEmail && form.confirmedAdmins?.includes(userEmail)));

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
