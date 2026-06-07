import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { FormCardSkeleton } from "@/components/groupify/skeletons";

export default function Loading() {
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
            <div className="h-11 w-44 animate-pulse rounded-xl bg-muted/30" />
          </div>

          <div className="flex gap-2 border-b border-border/50 pb-4 overflow-x-auto">
            <div className="h-9 w-24 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-9 w-28 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-9 w-32 animate-pulse rounded-xl bg-muted/30" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FormCardSkeleton key={i} />
            ))}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
