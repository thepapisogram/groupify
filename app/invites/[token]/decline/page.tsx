"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { RiCloseLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

export default function DeclineInvitePage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch(`/api/invites/${token}/decline`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to decline invite");
        }
        setStatus("success");
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />
        
        <div className="mt-12 rounded-2xl border border-border/50 bg-card/70 p-8 text-center backdrop-blur-sm max-w-lg mx-auto shadow-xl">
          {status === "processing" && (
            <p className="text-muted-foreground animate-pulse">Declining invite...</p>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                <RiCloseLine className="size-6" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-foreground">Invite Declined</h2>
              <p className="text-muted-foreground mb-6">
                You have successfully declined the invitation.
              </p>
              <Button onClick={() => router.push("/")}>Return to Home</Button>
            </>
          )}

          {status === "error" && (
            <div className="text-destructive">
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p className="text-sm mb-6">{errorMessage}</p>
              <Button variant="outline" onClick={() => router.push("/")}>Return to Home</Button>
            </div>
          )}
        </div>
        
        <Footer />
      </div>
    </div>
  );
}
