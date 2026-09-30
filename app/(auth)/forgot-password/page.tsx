"use client";

import { useState } from "react";
import Link from "next/link";
import { RiArrowLeftSLine, RiMailSendLine } from "@remixicon/react";
import { PageHeader } from "@/components/groupify/page-header";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSentTo(email.trim());
      else setError(data.error || data.message || "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-md px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <div className="mt-10 space-y-6 rounded-2xl border border-border/50 bg-card/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl animate-slide-up">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <RiArrowLeftSLine className="size-4" />
            Back to log in
          </Link>

          {sentTo ? (
            <div role="status" className="space-y-3">
              <RiMailSendLine className="size-8 text-primary" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong className="text-foreground">{sentTo}</strong>, we&apos;ve sent a link to
                choose a new password. It works once and expires in an hour.
              </p>
              <p className="text-sm text-muted-foreground">
                Nothing after a few minutes? Check your spam folder, or{" "}
                <button type="button" onClick={() => setSentTo(null)} className="font-semibold text-primary hover:underline">
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset your password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a link to choose a new password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="forgot-email">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="name@example.com"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  variant={isLoading ? "shimmer" : "default"}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
