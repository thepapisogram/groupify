"use client";

import { useState } from "react";
import Link from "next/link";
import { RiShareLine, RiEdit2Line, RiEyeLine } from "@remixicon/react";
import { ShareDialog } from "@/components/groupify/share-dialog";

interface FormCardActionsProps {
  formId: string;
  adminToken: string;
}

export function FormCardActions({ formId, adminToken }: FormCardActionsProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl] = useState(() => 
    typeof window !== "undefined" ? `${window.location.origin}/forms/${formId}` : ""
  );

  return (
    <>
      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-border/30">
        <Link
          href={`/forms/${formId}/admin?token=${adminToken}`}
          prefetch={true}
          className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <RiEyeLine className="size-4" />
          View
        </Link>
        <Link
          href={`/forms/${formId}/edit?token=${adminToken}`}
          className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg border border-border/50 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RiEdit2Line className="size-4" />
          Edit
        </Link>
        <button
          onClick={() => setShareOpen(true)}
          className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg border border-border/50 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RiShareLine className="size-4" />
          Share
        </button>
      </div>

      <ShareDialog
        isOpen={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
      />
    </>
  );
}
