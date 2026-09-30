"use client";

import { useState } from "react";
import { RiCloseLine, RiSparklingLine } from "@remixicon/react";
import appMeta from "@/data/metadata";

const VERSION_KEY = `groupify_v${appMeta.app.version}_seen`;

/** Any earlier Groupify data means this isn't a first visit. */
function isReturningVisitor(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i)?.startsWith("groupify")) return true;
    }
  } catch {
    /* storage unavailable: treat as a first visit and stay quiet */
  }
  return false;
}

function shouldShow(): boolean {
  try {
    if (window.localStorage.getItem(VERSION_KEY)) return false;
    if (!isReturningVisitor()) {
      // First visit: nothing is "new" to them, so record it silently.
      window.localStorage.setItem(VERSION_KEY, "true");
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * A quiet, dismissible note for returning visitors after an update. Never a modal,
 * so it can't get in the way of the task they came to do.
 */
export function WhatsNewBanner() {
  const [visible, setVisible] = useState(shouldShow);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(VERSION_KEY, "true");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label={`What's new in Groupify ${appMeta.app.version}`}
      className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm animate-fade-in print:hidden"
    >
      <RiSparklingLine className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="flex-1 text-foreground/90">
        <strong className="font-semibold">New in {appMeta.app.version}:</strong> keep people together or apart, spread
        skill levels evenly, edit groups after generating them, and publish groups so everyone can find theirs.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <RiCloseLine className="size-4" />
      </button>
    </div>
  );
}
