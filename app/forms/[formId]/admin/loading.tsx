import { PageHeader } from "@/components/groupify/page-header";

export default function AdminDashboardLoading() {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        {/* Header skeleton */}
        <div className="mt-8 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded-xl bg-muted/40" />
            <div className="h-4 w-36 animate-pulse rounded-xl bg-muted/30" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-36 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-9 w-24 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-9 w-16 animate-pulse rounded-xl bg-muted/30" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-5 w-40 animate-pulse rounded-xl bg-muted/40" />
            <div className="h-8 w-28 animate-pulse rounded-xl bg-muted/30" />
          </div>
          <div className="space-y-3">
            {/* Table header */}
            <div className="h-9 w-full animate-pulse rounded-xl bg-muted/30" />
            {/* Skeleton rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded-xl bg-muted/20"
                style={{ animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
