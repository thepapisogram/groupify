import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { PublishedGroups } from "@/components/groupify/published-groups";
import { formsCollection } from "@/lib/db";

export const metadata = {
  title: "Groups",
  robots: { index: false, follow: false },
};

// Read straight from the database (never cached) so publishing and unpublishing show up immediately.
export const dynamic = "force-dynamic";

export default async function PublishedGroupsPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const form = await (await formsCollection()).findOne({ _id: formId });
  const published = form?.publishedGroups;

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        {form && published ? (
          <div className="mt-8 space-y-6">
            <div className="space-y-1 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{form.title}</h1>
              <p className="text-muted-foreground">
                Groups published {format(new Date(published.publishedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <PublishedGroups groups={published.groups} />
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border/50 bg-card/70 p-8 text-center shadow-xl backdrop-blur-sm">
            <h1 className="text-xl font-bold text-foreground">
              {form ? "Groups aren't published yet" : "Form not found"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {form
                ? "Check back soon. The organiser hasn't shared the groups yet."
                : "This link may be wrong or the form may have been removed."}
            </p>
            {form && (
              <Link
                href={`/forms/${formId}`}
                className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Back to the form
              </Link>
            )}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
