import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { accountsCollection, usersCollection } from "@/lib/db";
import { toObjectId } from "@/lib/verification";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { ChangePasswordForm } from "@/components/groupify/change-password-form";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const oid = toObjectId(session?.user?.id);
  if (!oid) redirect("/login?callbackUrl=/account");

  const user = await (await usersCollection()).findOne(
    { _id: oid },
    { projection: { email: 1, name: 1, password: 1 } },
  );
  if (!user) redirect("/login?callbackUrl=/account");

  const google = await (await accountsCollection()).findOne({ userId: oid, provider: "google" });

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mx-auto max-w-lg space-y-6">
          <section className="rounded-2xl border border-border/50 bg-card/70 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Account</h1>
            <dl className="mt-4 space-y-3 text-sm">
              {user.name && (
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium text-foreground">{user.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all font-medium text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sign in with</dt>
                <dd className="font-medium text-foreground">
                  {[user.password ? "Email and password" : null, google ? "Google" : null].filter(Boolean).join(" and ") ||
                    "Email and password"}
                </dd>
              </div>
            </dl>
          </section>

          <ChangePasswordForm email={user.email} hasPassword={Boolean(user.password)} />
        </div>

        <Footer />
      </div>
    </div>
  );
}
