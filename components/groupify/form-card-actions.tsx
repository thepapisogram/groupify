"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RiShareLine, RiEdit2Line, RiEyeLine, RiFileCopyLine } from "@remixicon/react";
import { ShareDialog } from "@/components/groupify/share-dialog";
import { adminPagePath } from "@/lib/admin-client";

interface FormCardActionsProps {
  formId: string;
}

export function FormCardActions({ formId }: FormCardActionsProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/forms/${formId}`);
  }, [formId]);

  const duplicate = async () => {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't duplicate the form");
      toast.success("Form duplicated");
      router.push(adminPagePath(data.formId, "admin"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't duplicate the form");
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <div className="mt-6 flex items-center gap-2 pt-4 border-t border-border/30">
        <Link
          href={adminPagePath(formId, "admin")}
          prefetch={true}
          className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <RiEyeLine className="size-4" />
          View
        </Link>
        <Link
          href={adminPagePath(formId, "edit")}
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
        <button
          type="button"
          onClick={duplicate}
          disabled={isDuplicating}
          aria-label="Duplicate form"
          title="Duplicate form"
          className="inline-flex items-center justify-center rounded-lg border border-border/50 bg-transparent p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RiFileCopyLine className="size-4" />
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
