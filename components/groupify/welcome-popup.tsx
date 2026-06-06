"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, ShieldCheck, MailQuestion } from "lucide-react";
import appMeta from "@/data/metadata";

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user explicitly dismissed the popup permanently
    const hasSeenWelcome = localStorage.getItem(`groupify_v${appMeta.app.version}_seen`);
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Does NOT set localStorage, so it will show again next time
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(`groupify_v${appMeta.app.version}_seen`, "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">What&apos;s New in Groupify 2.1</DialogTitle>
          <DialogDescription className="text-center text-base">
            We&apos;ve added some powerful new features to make your grouping experience even better!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <ShieldCheck className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">User Accounts & Authentication</h3>
              <p className="text-sm text-muted-foreground">Sign up with email or Google to securely save all your groups and lists in the cloud.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Form Builder</h3>
              <p className="text-sm text-muted-foreground">Create custom forms to collect details directly from people before generating groups.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <MailQuestion className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Feedback System</h3>
              <p className="text-sm text-muted-foreground">Found a bug or have a suggestion? Use our new built-in feedback tool to reach out instantly.</p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-3">
          <Button onClick={handleClose} className="w-full">
            Awesome, let&apos;s go!
          </Button>
          <button 
            onClick={handleDontShowAgain}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Don&apos;t show this again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
