import { PageHeader } from "@/components/groupify/page-header";
import { ResetPasswordForm } from "@/components/groupify/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-md px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />
        <ResetPasswordForm token={typeof token === "string" ? token : undefined} />
      </div>
    </div>
  );
}
