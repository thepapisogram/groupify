"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import appMeta from "@/data/metadata";
import { WelcomePopup } from "./welcome-popup";
import dynamic from "next/dynamic";

const DonatePopup = dynamic(
  () => import("./donate-popup").then((mod) => mod.DonatePopup),
  { ssr: false }
);

/**
 * Popup sequencing rules:
 *  1. Welcome is shown if the current version hasn't been seen yet.
 *  2. Donate is shown only if the *welcome was already seen in a previous session*
 *     (i.e. the donate key was NOT set AND the welcome key IS already set before
 *     this session starts). This prevents both modals appearing back-to-back on
 *     a first visit.
 */
export function PopupManager() {
  const { status } = useSession();
  const [queue, setQueue] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (status === "loading" || isInitialized) return;

    const timer = setTimeout(() => {
      const welcomeKey = `groupify_v${appMeta.app.version}_seen`;
      const donateKey = "groupify_donate_seen";

      const welcomeAlreadySeen = !!localStorage.getItem(welcomeKey);
      const donateAlreadySeen = !!localStorage.getItem(donateKey);

      const initialQueue: string[] = [];

      // Show welcome if this version hasn't been seen
      if (!welcomeAlreadySeen) {
        initialQueue.push("welcome");
      }

      // Show donate ONLY if welcome was seen in a *previous* session
      // (not queued above, meaning welcomeAlreadySeen must be true before this run)
      if (!donateAlreadySeen && welcomeAlreadySeen) {
        initialQueue.push("donate");
      }

      setQueue(initialQueue);
      setIsInitialized(true);
    }, 800); // small delay so the page renders first

    return () => clearTimeout(timer);
  }, [status, isInitialized]);

  const advance = () => {
    setQueue((prev) => prev.slice(1));
  };

  if (!isInitialized || queue.length === 0) return null;

  const currentPopup = queue[0];

  if (currentPopup === "welcome") {
    return <WelcomePopup onFinished={advance} />;
  }
  if (currentPopup === "donate") {
    return <DonatePopup onFinished={advance} />;
  }

  return null;
}
