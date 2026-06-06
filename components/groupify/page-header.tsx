"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ModeToggle } from "@/components/theme-switcher";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PageHeader() {
  const { data: session, status } = useSession();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  return (
    <header className="mb-6 sm:mb-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="relative rounded-xl border border-border/50 bg-card/80 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-3">
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
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Groupify
            </h1>
            <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
              Sort names into balanced groups instantly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {status === "loading" ? null : session ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-2 py-1 backdrop-blur-sm sm:px-3 sm:py-1.5">
              <span className="hidden text-xs font-medium text-foreground sm:block">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => setIsLogoutDialogOpen(true)}
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
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary backdrop-blur-sm transition-colors hover:bg-primary/20 sm:gap-2 sm:px-3"
            >
              <User className="size-3.5" />
              Sign in
            </Link>
          )}

          <ModeToggle />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground sm:hidden">
        Sort names into balanced groups instantly
      </p>

      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full sm:max-w-md sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-4 sm:mt-0">
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setIsLogoutDialogOpen(false); signOut(); }}>Sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
