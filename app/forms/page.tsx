import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { FormCardActions } from "@/components/groupify/form-card-actions";
import Link from "next/link";
import { format } from "date-fns";
import { RiAddCircleLine, RiSettings4Line, RiTeamLine } from "@remixicon/react";

export const metadata = {
  title: "My Forms | Groupify",
  description: "View and manage your Groupify forms",
};

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const session = await getServerSession(authOptions);
  const filter = (await searchParams).filter || "all";

  if (!(session?.user as { id?: string })?.id) {
    redirect("/login?callbackUrl=/forms");
  }

  const userId = (session?.user as { id: string }).id;

  const userEmail = (session?.user as { email?: string }).email;

  const client = await clientPromise;
  const db = client.db("groupify");

  let query: Record<string, unknown> = {};
  if (filter === "owned") {
    query = { userId: userId };
  } else if (filter === "shared") {
    query = { confirmedAdmins: userEmail, userId: { $ne: userId } };
  } else {
    query = {
      $or: [
        { userId: userId },
        { confirmedAdmins: userEmail }
      ]
    };
  }

  // Fetch forms and submission counts in parallel.
  // Since formIds come from the forms result, we project only _id in the first pass,
  // then fire both the full forms fetch and the aggregation simultaneously.
  const formIdsCursor = db
    .collection("forms")
    .find(query)
    .project({ _id: 1 });
  const formIds = (await formIdsCursor.toArray()).map((f) => String(f._id));

  const [forms, submissionCountsRaw] = await Promise.all([
    db.collection("forms").find(query).sort({ createdAt: -1 }).toArray(),
    db
      .collection("submissions")
      .aggregate([
        { $match: { formId: { $in: formIds } } },
        { $group: { _id: "$formId", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const submissionCounts = submissionCountsRaw.reduce(
    (acc, curr) => {
      acc[String(curr._id)] = curr.count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mt-12 space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                My Forms
              </h1>
              <p className="text-muted-foreground">
                Manage your custom forms and view submissions.
              </p>
            </div>
            <Link
              href="/forms/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-primary/25 active:scale-[0.98]"
            >
              <RiAddCircleLine className="size-5" />
              Create New Form
            </Link>
          </div>

          <div className="flex gap-2 border-b border-border/50 pb-4 overflow-x-auto">
            <Link
              href="?filter=all"
              className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              All Forms
            </Link>
            <Link
              href="?filter=owned"
              className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                filter === "owned"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              Owned by me
            </Link>
            <Link
              href="?filter=shared"
              className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                filter === "shared"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              Shared with me
            </Link>
          </div>

          {forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/40 p-12 text-center backdrop-blur-sm">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <RiSettings4Line className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                No forms yet
              </h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Create a custom form to start collecting responses and
                organizing groups effortlessly.
              </p>
              <Link
                href="/forms/new"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <RiAddCircleLine className="size-5" />
                Create your first form
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => {
                const formIdStr = String(form._id);
                const subCount = submissionCounts[formIdStr] || 0;

                return (
                  <div
                    key={formIdStr}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3
                          className="font-semibold text-lg text-foreground line-clamp-2"
                          title={form.title}
                        >
                          {form.title}
                        </h3>
                        {form.userId !== userId && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground">
                            <RiTeamLine className="size-3" />
                            Shared
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div
                          className="flex items-center gap-1.5"
                          title="Total submissions"
                        >
                          <RiTeamLine className="size-4" />
                          <span>
                            {subCount} response{subCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {form.createdAt && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span>
                              {format(new Date(form.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <FormCardActions formId={formIdStr} adminToken={form.adminToken} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
