"use client";

import Image from "next/image";
import Link from "next/link";
import appMeta from "@/data/metadata";
import { ModeToggle } from "@/components/theme-switcher";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export function PageHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="mb-10 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="relative rounded-2xl border border-border/50 bg-card/80 p-3 backdrop-blur-sm">
              <Image
                src="/logo.webp"
                width={36}
                height={36}
                alt="Groupify"
                className="size-9"
                priority
                unoptimized
              />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Groupify
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Sort names into balanced groups instantly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "loading" ? null : session ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-2 py-1 backdrop-blur-sm sm:px-3 sm:py-1.5">
              <span className="hidden text-xs font-medium text-foreground sm:block">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur-sm transition-colors hover:bg-primary/20"
            >
              <User className="size-3.5" />
              Sign in
            </Link>
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
