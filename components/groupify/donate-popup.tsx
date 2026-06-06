"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

export function DonatePopup({ onFinished }: { onFinished?: () => void }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem("groupify_donate_seen", "true");
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setTimeout(() => onFinished?.(), 300);
    }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full sm:max-w-md sm:rounded-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Support Groupify</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Help us keep Groupify ad-free and awesome!
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-1 flex justify-center">
            <Image 
                src="/thiings/donate.webp"
                alt="Donate to Groupify"
                width={160}
                height={160}
                className="h-32 w-32 sm:h-36 sm:w-36 rounded-xl object-cover shadow-sm"
                priority
                unoptimized
            />
        </div>
        <div className="text-center text-sm text-muted-foreground px-2 pb-2">
          If Groupify has saved you time, consider buying us a coffee. Every donation helps cover server costs.
        </div>

        <div className="mt-1 flex flex-col sm:flex-row-reverse gap-2">
          <Button asChild className="w-full">
            <Link href="#" target="_blank">
                Donate Now
            </Link>
          </Button>
          <Button variant="outline" onClick={handleClose} className="w-full">
            Maybe Later
          </Button>
        </div>
        <div className="text-center">
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
