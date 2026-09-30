import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/groupify/admin-dashboard";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { adminPagePath } from "@/lib/admin-client";
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
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border/50 bg-card/70 p-8 text-center shadow-xl backdrop-blur-sm">
            <h1 className="text-xl font-bold text-foreground">Form not found</h1>
            <p className="mt-2 text-muted-foreground">
              This form may have been deleted, or its link was regenerated. If you own it, check My Forms for the
              current link.
            </p>
            <Link href="/forms" className="mt-6 inline-flex text-sm font-medium text-primary hover:underline">
              Go to My Forms
            </Link>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  const identity = await getIdentity();
  const role = resolveFormRole(form, { token: adminTokenFromUrl, identity });

  if (!role) {
    if (!identity.userId && !identity.email) {
      // Signed out: let owners and collaborators sign in and come straight back.
      const back = adminPagePath(formId, "admin", adminTokenFromUrl);
      redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
    }
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
      hasAccountOwner={Boolean(form.userId)}
    />
  );
}
