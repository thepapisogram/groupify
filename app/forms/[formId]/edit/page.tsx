import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { FormBuilder } from "@/components/groupify/form-builder";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";

export default async function EditFormPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { formId } = await params;
  const resolvedSearchParams = await searchParams;
  const adminToken = resolvedSearchParams.token || "";

  if (!adminToken) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Unauthorized</h2>
            <p className="mt-2 text-sm">Missing admin token</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

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
            <p className="mt-2 text-sm">Form not found</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <FormBuilder
      isEdit
      formId={formId}
      adminToken={adminToken}
      initialTitle={form.title}
      initialDescription={form.description}
      initialFields={form.fields}
    />
  );
}
