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
        <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm shadow-md overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
            <div className="h-5 w-32 animate-pulse rounded-lg bg-muted/40" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted/30" />
          </div>
          <div className="p-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 bg-muted/10 px-6 py-3 border-b border-border/50">
              <div className="h-4 w-4 animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="divide-y divide-border/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="h-4 w-4 animate-pulse rounded bg-muted/20" />
                  <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted/20" />
                  <div className="h-4 w-5/6 animate-pulse rounded-lg bg-muted/20" />
                  <div className="h-4 w-24 animate-pulse rounded-lg bg-muted/20" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted/20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
