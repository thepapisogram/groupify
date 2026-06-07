"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";

export default function InvitePage() {
  const { token } = useParams() as { token: string };
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    fetch(`/api/invites/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invite not found");
        return res.json();
      })
      .then((data) => {
        setInvite(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, sessionStatus]);

  useEffect(() => {
    if (!loading && invite && invite.status === "pending" && sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/invites/${token}`);
    }
  }, [loading, invite, sessionStatus, router, token]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invite");
      toast.success("Invite accepted!");
      router.push(`/forms/${data.formId}/admin`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/invites/${token}/decline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decline invite");
      toast.success("Invite declined");
      setInvite((prev: any) => ({ ...prev, status: "declined" }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="mesh-bg relative min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading invite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-12 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-2">Invite Not Found</h2>
            <p className="text-sm">This invite link is invalid or has been revoked.</p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (new Date(invite.expiresAt) < new Date() && invite.status === "pending") {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-12 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm max-w-lg mx-auto shadow-xl">
            <h2 className="text-xl font-bold mb-2 text-foreground">Invite Expired</h2>
            <p className="text-muted-foreground">
              This invitation expired on {new Date(invite.expiresAt).toLocaleDateString()}. Please ask {invite.invitedBy} to send you a new invite.
            </p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-12 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm max-w-lg mx-auto shadow-xl">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
              <RiCheckLine className="size-6" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-foreground">Already Accepted</h2>
            <p className="text-muted-foreground mb-6">
              You already have access to <strong>{invite.formTitle}</strong>.
            </p>
            <Button onClick={() => router.push(`/forms`)}>Go to My Forms</Button>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (invite.status === "declined") {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-12 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm max-w-lg mx-auto shadow-xl">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <RiCloseLine className="size-6" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-foreground">Invite Declined</h2>
            <p className="text-muted-foreground">
              You declined the invitation to collaborate on <strong>{invite.formTitle}</strong>.
            </p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // Pending status
  if (session?.user?.email && session.user.email !== invite.invitedEmail) {
    return (
      <div className="mesh-bg relative min-h-dvh">
        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
          <PageHeader />
          <div className="mt-12 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive backdrop-blur-sm max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-2">Wrong Account</h2>
            <p className="text-sm">
              This invite was sent to <strong>{invite.invitedEmail}</strong>, but you are logged in as <strong>{session.user.email}</strong>.
              Please sign out and sign in with the correct account.
            </p>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />
        
        <div className="mt-12 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm max-w-lg mx-auto shadow-xl animate-slide-up">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Collaboration Invite
          </h1>
          <p className="text-muted-foreground mb-8">
            <strong>{invite.invitedBy}</strong> has invited you to collaborate on their form:{" "}
            <strong className="text-foreground">{invite.formTitle}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="default"
              size="lg"
              disabled={isProcessing}
              className={isProcessing ? "btn-shimmer pointer-events-none" : ""}
              onClick={handleAccept}
            >
              Accept Invitation
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isProcessing}
              onClick={handleDecline}
            >
              Decline
            </Button>
          </div>
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
