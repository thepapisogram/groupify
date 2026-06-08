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

import { FormsList } from "@/components/groupify/forms-list";

export const metadata = {
  title: "My Forms | Groupify",
  description: "View and manage your Groupify forms",
};

export default async function FormsPage() {
  const session = await getServerSession(authOptions);

  if (!(session?.user as { id?: string })?.id) {
    redirect("/login?callbackUrl=/forms");
  }

  const userId = (session?.user as { id: string }).id;
  const userEmail = (session?.user as { email?: string }).email;

  const client = await clientPromise;
  const db = client.db("groupify");

  const query = {
    $or: [
      { userId: userId },
      { confirmedAdmins: userEmail }
    ]
  };

  // Fetch forms first, then extract IDs for the submissions aggregation
  const forms = await db.collection("forms").find(query).sort({ createdAt: -1 }).toArray();
  const formIds = forms.map((f) => String(f._id));

  const submissionCountsRaw = await db
    .collection("submissions")
    .aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: "$formId", count: { $sum: 1 } } },
    ])
    .toArray();

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

          <FormsList 
            initialForms={forms.map(f => ({ ...f, _id: f._id.toString() }))}
            submissionCounts={submissionCounts}
            userId={userId}
          />
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
