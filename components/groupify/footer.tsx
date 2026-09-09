"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RiHeartFill } from "@remixicon/react";
import appMeta from "@/data/metadata";
import dynamic from "next/dynamic";

const DonatePopup = dynamic(
  () => import("@/components/groupify/donate-popup").then((mod) => mod.DonatePopup),
  { ssr: false }
);

export function Footer() {
  const [showDonate, setShowDonate] = useState(false);

  return (
    <>
      <footer className="mt-16 w-full overflow-hidden rounded-3xl border border-border/40 bg-card/40 px-6 py-6 sm:px-8 sm:py-8 backdrop-blur-xl shadow-lg transition-all hover:border-border/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative rounded-xl border border-border/50 bg-card/80 p-1.5 backdrop-blur-sm shadow-sm">
                <Image
                  src="/logo.webp"
                  width={24}
                  height={24}
                  alt="Groupify"
                  className="size-5 sm:size-6 opacity-80 transition-opacity hover:opacity-100"
                  priority
                  unoptimized
                />
              </div>
              <span className="text-foreground font-syne font-bold text-xl">Groupify</span>
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowDonate(true)}
              className="group relative flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 px-5 py-2.5 text-sm font-bold text-rose-500 transition-all hover:bg-rose-500/20 hover:scale-[1.02] active:scale-95 shadow-sm"
            >
              <RiHeartFill className="size-4 transition-transform group-hover:scale-110 group-hover:fill-rose-500/20" />
              Support the project
            </button>
            
            <Link
              href="/documentation"
              className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-95 shadow-sm"
            >
              <svg
                className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              Documentation
            </Link>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-5">
          <p className="text-xs font-semibold text-muted-foreground/60 tracking-wide">
            Developed by{" "}
            <Link
              href={appMeta.author.url}
              target="_blank"
              className="font-bold text-foreground/80 transition-colors underline-offset-4 hover:text-primary hover:underline"
            >
              {appMeta.author.name}
            </Link>
          </p>
          <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground/40 tracking-wider">
            <span>v{appMeta.app.version}</span>
            <span className="h-1 w-1 rounded-full bg-border/80"></span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
      {showDonate && <DonatePopup onFinished={() => setShowDonate(false)} />}
    </>
  );
}
