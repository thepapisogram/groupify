"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreateAccountPopup({ onFinished }: { onFinished?: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem("groupify_create_account_seen", "true");
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };
  
  const handleCreate = () => {
    setIsOpen(false);
    setTimeout(() => {
        onFinished?.();
        router.push("/signup");
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setTimeout(() => onFinished?.(), 300);
    }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full sm:max-w-md sm:rounded-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Create a Free Account</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Unlock the full potential of Groupify!
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2 text-center text-sm text-muted-foreground">
          <p>By creating an account, you can save your customized groups, create your own forms, and access them from anywhere.</p>
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <Button onClick={handleCreate} className="w-full">
            Sign Up Now
          </Button>
          <Button variant="outline" onClick={handleClose} className="w-full">
            Maybe Later
          </Button>
          <button 
            onClick={handleDontShowAgain}
            className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Don&apos;t show this again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
