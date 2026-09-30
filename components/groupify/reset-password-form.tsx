"use client";

import { useState } from "react";
import Link from "next/link";
import { RiAlertLine, RiCheckLine, RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all";

type State =
  | { status: "form"; error?: string }
  | { status: "done" }
  | { status: "dead"; message: string };

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<State>(
    token
      ? { status: "form" }
      : { status: "dead", message: "This link is missing its code. Open the link from your email again." },
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setState({ status: "form", error: "The two passwords don't match." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setState({ status: "done" });
      else if (data.reason) setState({ status: "dead", message: data.error }); // the link itself is spent or expired
      else setState({ status: "form", error: data.error || "Something went wrong. Please try again." });
    } catch {
      setState({ status: "form", error: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 space-y-6 rounded-2xl border border-border/50 bg-card/70 p-6 sm:p-8 backdrop-blur-sm shadow-xl animate-slide-up">
      {state.status === "done" && (
        <div role="status" className="space-y-3 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <RiCheckLine className="size-6" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-foreground">Password changed</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been signed out everywhere. Log in with your new password.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      )}

      {state.status === "dead" && (
        <div role="alert" className="space-y-3 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <RiAlertLine className="size-6" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-foreground">We couldn&apos;t use this link</h1>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Button asChild size="lg" className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}

      {state.status === "form" && (
        <>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Choose a new password</h1>
            <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reset-password">
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide passwords" : "Show passwords"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {show ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="reset-confirm">
                Confirm new password
              </label>
              <input
                id="reset-confirm"
                type={show ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={busy} variant={busy ? "shimmer" : "default"} size="lg" className="w-full">
              {busy ? "Saving..." : "Change password"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
