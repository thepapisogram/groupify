"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiCheckLine, RiFileCopyLine, RiShareForwardLine } from "@remixicon/react";

interface PublishGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupCount: number;
  memberCount: number;
  /** What respondents will see for each person, e.g. the primary field's label. */
  identifierLabel: string;
  publishedAt: string | null;
  url: string;
  onPublish: () => Promise<boolean>;
  onUnpublish: () => Promise<boolean>;
}

export function PublishGroupsDialog({
  open,
  onOpenChange,
  groupCount,
  memberCount,
  identifierLabel,
  publishedAt,
  url,
  onPublish,
  onUnpublish,
}: PublishGroupsDialogProps) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border/50 bg-card/95 backdrop-blur-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RiShareForwardLine className="size-5 text-primary" />
            {publishedAt ? "Groups are published" : "Publish groups"}
          </DialogTitle>
          <DialogDescription>
            {publishedAt
              ? "Respondents can look up their group on this page."
              : `Let respondents see which group they're in. ${groupCount} groups with ${memberCount} people will be shown.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300">
            Anyone with the form link can see each group&apos;s name and every person&apos;s{" "}
            <strong>{identifierLabel}</strong>. No other answers are shared. Only publish if that&apos;s OK for
            everyone listed.
          </div>

          {publishedAt && (
            <div className="space-y-2">
              <label htmlFor="published-url" className="text-xs font-semibold text-muted-foreground">
                Groups page
              </label>
              <div className="flex gap-2">
                <input
                  id="published-url"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground"
                />
                <Button type="button" variant="secondary" onClick={copy} aria-label="Copy link">
                  <RiFileCopyLine />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is a snapshot. If you change the groups, use &quot;Update published groups&quot;.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          {publishedAt ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => run(onUnpublish)}
                className="text-destructive hover:text-destructive"
              >
                Unpublish
              </Button>
              <Button type="button" disabled={busy} onClick={() => run(onPublish)}>
                <RiCheckLine />
                Update published groups
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={busy} onClick={() => run(onPublish)}>
                Publish groups
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
