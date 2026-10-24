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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6" aria-busy="true" aria-label="Loading">
      <div className="surface h-[30rem] animate-pulse" />
      <div className="hidden space-y-4 lg:block">
        <div className="surface h-72 animate-pulse" />
        <div className="surface h-40 animate-pulse" />
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
