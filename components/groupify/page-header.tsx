"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ModeToggle } from "@/components/theme-switcher";
import { useSession, signOut } from "next-auth/react";
import {
  RiBookOpenLine,
  RiFileTextLine,
  RiGroupLine,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiUserLine,
  RiUserSettingsLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function SignOutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign out</DialogTitle>
          <DialogDescription>Are you sure you want to sign out of your account?</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2 sm:mt-0 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              signOut();
            }}
          >
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignOutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Sign out"
        aria-label="Sign out"
      >
        <RiLogoutBoxRLine className="size-4" />
      </button>
      <SignOutDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

const navLink =
  "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function PageHeader() {
  const { data: session, status } = useSession();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const formsHref = session ? "/forms" : "/forms/new";

  return (
    <header className="mb-6 flex items-center justify-between gap-3 animate-fade-in sm:mb-10 print:hidden">
      <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl pr-2" aria-label="Groupify home">
        <span className="shrink-0 rounded-xl border border-border bg-card p-1.5 shadow-sm">
          <Image src="/logo.webp" width={32} height={32} alt="" className="size-7 sm:size-8" priority unoptimized />
        </span>
        <span className="font-syne text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Groupify</span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <Link href={formsHref} className={navLink}>
            <RiFileTextLine className="size-4" />
            {session ? "My forms" : "Create a form"}
          </Link>
          <Link href="/documentation" className={navLink}>
            <RiBookOpenLine className="size-4" />
            Guide
          </Link>
        </nav>

        {status === "loading" ? (
          <div className="hidden sm:block"><HeaderAuthSkeleton /></div>
        ) : session ? (
          <div className="hidden items-center gap-1 rounded-xl border border-border bg-card px-1 shadow-sm md:flex">
            <Link href="/account" className={`${navLink} max-w-[12rem]`} title="Account">
              <RiUserSettingsLine className="size-4 shrink-0" />
              <span className="truncate">{session.user?.name || session.user?.email}</span>
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-3.5 sm:inline-flex text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <RiUserLine className="size-4" />
            Sign in
          </Link>
        )}

        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
              <RiMenuLine />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {session && (
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                {session.user?.email}
              </DropdownMenuLabel>
            )}
            <DropdownMenuItem asChild>
              <Link href="/" className="cursor-pointer">
                <RiGroupLine /> Make groups
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={formsHref} className="cursor-pointer">
                <RiFileTextLine /> {session ? "My forms" : "Create a form"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/documentation" className="cursor-pointer">
                <RiBookOpenLine /> Guide
              </Link>
            </DropdownMenuItem>
            {status !== "loading" && !session && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login" className="cursor-pointer font-medium text-primary">
                    <RiUserLine /> Sign in
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            {session && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer">
                    <RiUserSettingsLine /> Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSignOutOpen(true)} className="cursor-pointer text-destructive focus:text-destructive">
                  <RiLogoutBoxRLine /> Sign out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      </div>
    </header>
  );
}
