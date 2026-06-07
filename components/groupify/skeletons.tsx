import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";

export function HeaderAuthSkeleton() {
  return (
    <div className="h-8 w-24 animate-pulse rounded-xl bg-muted/30" />
  );
}

export function FormCardSkeleton() {
  return (
    <div className="group relative flex h-48 flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="h-6 w-3/4 animate-pulse rounded-xl bg-muted/40" />
        <div className="flex gap-4">
          <div className="h-4 w-24 animate-pulse rounded-xl bg-muted/30" />
          <div className="h-4 w-24 animate-pulse rounded-xl bg-muted/30" />
        </div>
      </div>
      <div className="mt-6 flex gap-2 pt-4 border-t border-border/30">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted/30" />
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted/30" />
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mt-8 space-y-4 text-center">
          <div className="mx-auto h-9 w-3/4 max-w-md animate-pulse rounded-xl bg-muted/40" />
          <div className="mx-auto h-4 w-1/2 max-w-sm animate-pulse rounded-xl bg-muted/30" />
        </div>

        <div className="mt-8 space-y-8 animate-slide-up">
          <div className="mx-auto max-w-5xl space-y-6 rounded-2xl border border-border/50 bg-card/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 w-32 animate-pulse rounded-xl bg-muted/40" />
                <div className="h-12 w-full animate-pulse rounded-xl bg-muted/20" />
              </div>
            ))}
          </div>
          <div className="mx-auto h-14 w-full max-w-xs md:max-w-md animate-pulse rounded-2xl bg-muted/40" />
        </div>

        <Footer />
      </div>
    </div>
  );
}

export function EditFormSkeleton() {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-xl bg-muted/40" />
            <div className="h-4 w-96 animate-pulse rounded-xl bg-muted/30" />
          </div>

          <div className="space-y-4 rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm shadow-md">
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-muted/20" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-muted/20" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-7 w-32 animate-pulse rounded-xl bg-muted/40" />
              <div className="h-9 w-28 animate-pulse rounded-xl bg-muted/40" />
            </div>

            <div className="ml-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-4 rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="h-4 w-20 animate-pulse rounded-xl bg-muted/40" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-20 animate-pulse rounded-xl bg-muted/40" />
                      <div className="h-9 w-full animate-pulse rounded-xl bg-muted/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
