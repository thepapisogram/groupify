"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RiAlertLine, RiCheckLine } from "@remixicon/react";

type State =
  | { status: "verifying" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

export function VerifyEmailResult({ token }: { token?: string }) {
  const { data: session, update } = useSession();
  const [state, setState] = useState<State>(
    token
      ? { status: "verifying" }
      : { status: "error", message: "This link is missing its code. Open the link from your email again." },
  );
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // the token is single-use, so never send it twice (React strict mode re-runs effects)

    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState({ status: "error", message: data.error || "We couldn't confirm your email address." });
          return;
        }
        setState({ status: "success", email: data.email });
        await update(); // refresh the signed-in session so the reminder banner goes away
      } catch {
        setState({ status: "error", message: "We couldn't reach the server. Check your connection and try again." });
      }
    })();
  }, [token, update]);

  const signedIn = Boolean(session?.user);

  return (
    <div
      role="status"
      className="mx-auto mt-12 max-w-lg rounded-2xl border border-border/50 bg-card/70 p-8 text-center shadow-xl backdrop-blur-sm"
    >
      {state.status === "verifying" && (
        <>
          <h1 className="text-xl font-bold text-foreground">Confirming your email...</h1>
          <p className="mt-2 text-muted-foreground">This only takes a moment.</p>
        </>
      )}

      {state.status === "success" && (
        <>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <RiCheckLine className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Email confirmed</h1>
          <p className="mt-2 text-muted-foreground">
            <strong className="text-foreground">{state.email}</strong> is verified. Invitations and forms shared with
            you will now work.
          </p>
          <Link
            href={signedIn ? "/forms" : "/login?callbackUrl=%2Fforms"}
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {signedIn ? "Go to My Forms" : "Sign in"}
          </Link>
        </>
      )}

      {state.status === "error" && (
        <>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <RiAlertLine className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-foreground">We couldn&apos;t confirm your email</h1>
          <p className="mt-2 text-muted-foreground">{state.message}</p>
          <Link
            href="/login?callbackUrl=%2Fforms"
            className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Sign in to request a new link
          </Link>
        </>
      )}
    </div>
  );
}
