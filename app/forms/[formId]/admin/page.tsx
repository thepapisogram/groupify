import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/groupify/admin-dashboard";
import { formsCollection, submissionsCollection } from "@/lib/db";
import { getIdentity, resolveFormRole, tokenMatches } from "@/lib/form-access";

export default async function AdminDashboardServerPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { formId } = await params;
  const { token: adminTokenFromUrl } = await searchParams;

  const form = await (await formsCollection()).findOne({ _id: formId });

  if (!form) {
    redirect("/");
  }

  const role = resolveFormRole(form, {
    token: adminTokenFromUrl,
    identity: await getIdentity(),
  });

  if (!role) {
    redirect(`/forms/${formId}`);
  }

  const submissions = await (await submissionsCollection())
    .find({ formId })
    .sort({ submittedAt: -1 })
    .toArray();

  const formConfig = {
    title: form.title,
    fields: form.fields || [],
    isClosed: form.isClosed || false,
    description: form.description || "",
  };

  const serializedSubmissions = submissions.map((s) => ({
    _id: s._id.toString(),
    submittedAt: s.submittedAt.toISOString(),
    data: s.data,
  }));

  return (
    <AdminDashboard
      formId={formId}
      initialFormConfig={formConfig}
      initialSubmissions={serializedSubmissions}
      initialPublishedAt={form.publishedGroups ? new Date(form.publishedGroups.publishedAt).toISOString() : null}
      // Only echo a token back if the visitor actually arrived with a valid one.
      adminToken={tokenMatches(form.adminToken, adminTokenFromUrl) ? adminTokenFromUrl : undefined}
      isOwner={role === "owner"}
    />
  );
}
