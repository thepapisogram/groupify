"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { RiMailLine } from "@remixicon/react";

/**
 * Shown to signed-in users whose email isn't confirmed yet. Until it is, shared forms and
 * invitations addressed to that email can't be used, and this says so plainly.
 */
export function VerifyEmailBanner() {
  const { data: session } = useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!session?.user || session.user.emailVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send the email");
      if (data.alreadyVerified) {
        toast.success("Your email is already confirmed. Refresh the page.");
      } else {
        setSent(true);
        toast.success("Confirmation email sent");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Confirm your email"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-foreground print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <RiMailLine className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Confirm your email address</strong> to use invitations and forms shared
            with <span className="break-all">{session.user.email}</span>.
          </span>
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={sending || sent}
          className="shrink-0 self-start rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-amber-500/20 disabled:opacity-60 sm:self-auto"
        >
          {sent ? "Email sent" : sending ? "Sending..." : "Resend email"}
        </button>
      </div>
    </div>
  );
}
