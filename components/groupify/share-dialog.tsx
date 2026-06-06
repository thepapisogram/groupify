"use client";

import { useState } from "react";
import {
  RiFileCopyLine,
  RiWhatsappLine,
  RiTelegramLine,
  RiCheckLine,
} from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  onRegenerate?: () => void;
}

export function ShareDialog({
  isOpen,
  onOpenChange,
  shareUrl,
  onRegenerate,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareText = "Fill out my form on Groupify!";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full rounded-2xl sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">
            Share Form
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>Form Link</span>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="hidden sm:block text-xs font-medium text-destructive hover:underline"
                >
                  Regenerate link
                </button>
              )}
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <div className="flex-1 truncate rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground">
                {shareUrl}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="flex-1 sm:hidden flex h-[42px] items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20"
                  >
                    Regenerate Link
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none flex h-[42px] sm:w-[42px] items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 shadow-sm"
                  title="Copy link"
                >
                  {copied ? (
                    <RiCheckLine className="size-4 shrink-0" />
                  ) : (
                    <RiFileCopyLine className="size-4 shrink-0" />
                  )}
                  <span className="sm:hidden text-sm font-semibold">
                    {copied ? "Copied!" : "Copy"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Share via
            </label>
            <div className="flex gap-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-[#25D366]/20 bg-[#25D366]/10 py-3 text-[#25D366] transition-colors hover:bg-[#25D366]/20"
              >
                <RiWhatsappLine className="size-6" />
                <span className="text-xs font-semibold">WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-[#0088cc]/20 bg-[#0088cc]/10 py-3 text-[#0088cc] transition-colors hover:bg-[#0088cc]/20"
              >
                <RiTelegramLine className="size-6" />
                <span className="text-xs font-semibold">Telegram</span>
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
