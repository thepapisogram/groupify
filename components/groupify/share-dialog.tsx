"use client";

import { useState } from "react";
import { Copy, MessageCircle, Send, Check } from "lucide-react";
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

export function ShareDialog({ isOpen, onOpenChange, shareUrl, onRegenerate }: ShareDialogProps) {
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
      <DialogContent className="sm:max-w-md border-border/50 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl">Share Form</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex justify-between">
              <span>Form Link</span>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="text-xs text-destructive hover:underline"
                >
                  Regenerate link
                </button>
              )}
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 truncate rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm text-foreground">
                {shareUrl}
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 shadow-sm"
                title="Copy link"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Share via</label>
            <div className="flex gap-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-[#25D366]/20 bg-[#25D366]/10 py-3 text-[#25D366] transition-colors hover:bg-[#25D366]/20"
              >
                <MessageCircle className="size-6" />
                <span className="text-xs font-semibold">WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-[#0088cc]/20 bg-[#0088cc]/10 py-3 text-[#0088cc] transition-colors hover:bg-[#0088cc]/20"
              >
                <Send className="size-6" />
                <span className="text-xs font-semibold">Telegram</span>
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
