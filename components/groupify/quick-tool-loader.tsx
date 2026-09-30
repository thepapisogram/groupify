"use client";

import { useSyncExternalStore } from "react";
import { QuickTool } from "@/components/groupify/quick-tool";

const subscribe = () => () => {};

/** False while rendering on the server and during hydration, true afterwards. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function QuickToolSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
        <div className="h-[22rem] animate-pulse rounded-2xl border border-border/40 bg-card/40" />
      </div>
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-card/40" />
        <div className="h-64 animate-pulse rounded-2xl border border-border/40 bg-card/40" />
      </div>
    </div>
  );
}

/**
 * The tool keeps its draft in localStorage, which the server can't see. Mounting
 * it only after hydration lets it read that draft when it first renders, with no
 * mismatch between server and client HTML and no extra "load then re-render" pass.
 */
export function QuickToolLoader() {
  const isClient = useIsClient();
  return isClient ? <QuickTool /> : <QuickToolSkeleton />;
}
