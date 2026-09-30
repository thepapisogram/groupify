import { FormBuilder } from "@/components/groupify/form-builder";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { formsCollection } from "@/lib/db";
import { getIdentity, resolveFormRole, tokenMatches } from "@/lib/form-access";

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />
        <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm">{message}</p>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default async function EditFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { formId } = await params;
  const { token } = await searchParams;

  const form = await (await formsCollection()).findOne({ _id: formId });

  if (!form) {
    return <Notice title="Error" message="Form not found" />;
  }

  const role = resolveFormRole(form, { token, identity: await getIdentity() });

  if (!role) {
    return (
      <Notice
        title="Unauthorized"
        message="You need to be signed in as this form's owner or a collaborator, or use its admin link."
      />
    );
  }

  return (
    <FormBuilder
      isEdit
      formId={formId}
      adminToken={tokenMatches(form.adminToken, token) ? token : undefined}
      initialTitle={form.title}
      initialDescription={form.description}
      initialFields={form.fields}
    />
  );
}
