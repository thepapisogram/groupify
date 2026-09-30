import { unstable_cache } from "next/cache";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { FormFiller } from "@/components/groupify/form-filler";
import { formsCollection } from "@/lib/db";
import { getIdentity, resolveFormRole } from "@/lib/form-access";
import type { FormField } from "@/lib/models";

export default async function FormFillerPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;

  // The cached copy holds only what respondents may see; no secrets or ownership data.
  const getForm = unstable_cache(
    async (id: string) => {
      const form = await (await formsCollection()).findOne({ _id: id });
      if (!form) return null;
      return {
        title: form.title,
        description: form.description,
        fields: form.fields as FormField[],
        isClosed: form.isClosed,
      };
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

  // Only signed-in visitors trigger this lookup; anonymous respondents stay on the cached path.
  const identity = await getIdentity();
  let canManage = false;
  if (identity.userId || identity.email) {
    const live = await (await formsCollection()).findOne({ _id: formId });
    canManage = Boolean(live && resolveFormRole(live, { identity }));
  }

  const formConfig = {
    title: form.title,
    description: form.description,
    fields: form.fields,
    canManage,
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
