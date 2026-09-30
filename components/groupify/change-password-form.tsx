"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all";

export function ChangePasswordForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardClass = "rounded-2xl border border-border/50 bg-card/70 p-6 shadow-xl backdrop-blur-sm sm:p-8";

  if (!hasPassword) {
    return (
      <section className={cardClass}>
        <h2 className="text-lg font-bold text-foreground">Password</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This account signs in with Google and has no password. To add one, use{" "}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot password
          </Link>
          ; we&apos;ll email you a link.
        </p>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("The two new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // The change signs out every session, this one included, so sign straight back in.
      const again = await signIn("credentials", { redirect: false, email, password: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      if (again?.error) {
        toast.success("Password changed. Please log in again.");
        router.push("/login?callbackUrl=/account");
        return;
      }
      toast.success("Password changed. Any other devices have been signed out.");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-bold text-foreground">Change password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Changing it signs you out on every other device.{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot your current password?
        </Link>
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            type={show ? "text" : "password"}
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="new-password">
            New password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={show ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={`${inputClass} pr-10`}
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
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="confirm-new-password">
            Confirm new password
          </label>
          <input
            id="confirm-new-password"
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

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} variant={busy ? "shimmer" : "default"} size="lg" className="w-full">
          {busy ? "Saving..." : "Change password"}
        </Button>
      </form>
    </section>
  );
}
