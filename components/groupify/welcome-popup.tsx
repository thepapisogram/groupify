"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiMagicLine, RiTeamLine, RiShieldCheckLine, RiQuestionAnswerLine } from "@remixicon/react";
import appMeta from "@/data/metadata";

export function WelcomePopup({ onFinished }: { onFinished?: () => void }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    localStorage.setItem(`groupify_v${appMeta.app.version}_seen`, "true");
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          localStorage.setItem(`groupify_v${appMeta.app.version}_seen`, "true");
          setTimeout(() => onFinished?.(), 300);
        }
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full sm:max-w-md sm:rounded-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <RiMagicLine className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            What&apos;s New in Groupify 2.1
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Powerful new features to make grouping even better!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform"><RiShieldCheckLine className="size-5" /></div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Accounts & Auth
              </h3>
              <p className="text-xs text-muted-foreground">
                Save your groups and lists securely in the cloud.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform"><RiTeamLine className="size-5" /></div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Form Builder
              </h3>
              <p className="text-xs text-muted-foreground">
                Create custom forms to collect details before grouping. Only
                available with accounts.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform"><RiQuestionAnswerLine className="size-5" /></div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                Feedback System
              </h3>
              <p className="text-xs text-muted-foreground">
                Found a bug or have a suggestion? Reach out instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <Button onClick={handleClose} className="w-full">
            Awesome, let&apos;s go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
