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

export function PopupManager() {
  const { status } = useSession();
  const [queue, setQueue] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (status === "loading" || isInitialized) return;

    const timer = setTimeout(() => {
      const initialQueue: string[] = [];
      if (!localStorage.getItem(`groupify_v${appMeta.app.version}_seen`)) {
        initialQueue.push("welcome");
      }
      if (!localStorage.getItem("groupify_donate_seen")) {
        initialQueue.push("donate");
      }

      setQueue(initialQueue);
      setIsInitialized(true);
    }, 0);

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
