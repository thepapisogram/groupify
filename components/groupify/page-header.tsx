"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ModeToggle } from "@/components/theme-switcher";
import { useSession, signOut } from "next-auth/react";
import { RiLogoutBoxRLine, RiUserLine, RiFileTextLine } from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HeaderAuthSkeleton } from "@/components/groupify/skeletons";

function SignOutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Sign out"
      >
        <RiLogoutBoxRLine className="size-3.5" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full sm:max-w-md sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PageHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="mb-6 sm:mb-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <Link href="/">
              <div className="relative rounded-xl border border-border/50 bg-card/80 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-3 hover:border-primary/50 transition-colors cursor-pointer">
                <Image
                  src="/logo.webp"
                  width={36}
                  height={36}
                  alt="Groupify"
                  className="size-7 sm:size-9"
                  priority
                  unoptimized
                />
              </div>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              <Link href="/">Groupify</Link>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {status === "loading" ? (
            <HeaderAuthSkeleton />
          ) : session ? (
            <div className="flex items-center gap-1 sm:gap-2 rounded-xl border border-border/50 bg-card/60 px-2 py-1 backdrop-blur-sm sm:px-3 sm:py-1.5">
              <Link
                href="/forms"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <RiFileTextLine className="size-3.5" />
                <span className="hidden sm:inline">My Forms</span>
              </Link>

              <div className="h-4 w-px bg-border/50"></div>

              <span
                className="hidden max-w-[100px] truncate text-xs font-medium text-foreground sm:block"
                title={session.user?.name || session.user?.email || ""}
              >
                {session.user?.name || session.user?.email}
              </span>

              <SignOutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary backdrop-blur-sm transition-colors hover:bg-primary/20 sm:gap-2 sm:px-3"
            >
              <RiUserLine className="size-3.5" />
              Sign in
            </Link>
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
