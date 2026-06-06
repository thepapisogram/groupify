"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePaystackPayment } from "react-paystack";
import { toast } from "sonner";

export function DonatePopup({ onFinished }: { onFinished?: () => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const { data: session } = useSession();
  
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("10");

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (userEmail) {
      const timer = setTimeout(() => setEmail(userEmail), 0);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem("groupify_donate_seen", "true");
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  const config = {
    reference: new Date().getTime().toString(),
    email: email || "anonymous@groupify.com",
    amount: (parseFloat(amount) || 10) * 100, // Amount in pesewas
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    currency: "GHS",
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = () => {
    toast.success("Thank you for your generous donation!");
    setIsOpen(false);
    setTimeout(() => onFinished?.(), 300);
  };

  const onPaystackClose = () => {
    // User closed the payment modal without paying
  };

  const handleDonate = () => {
    if (!email) {
        toast.error("Please enter an email address");
        return;
    }
    initializePayment({ onSuccess, onClose: onPaystackClose });
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
                width={120}
                height={120}
                className="h-24 w-24 sm:h-20 sm:w-20 rounded-xl object-cover shadow-sm"
                priority
                unoptimized
            />
        </div>
        <div className="text-center text-sm text-muted-foreground px-2">
          If Groupify has saved you time, consider buying us a coffee.
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 px-1 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="donate-email" className="text-xs">Email</Label>
            <Input 
              id="donate-email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="donate-amount" className="text-xs">Amount (GHS)</Label>
            <Input 
              id="donate-amount" 
              type="number" 
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="mt-1 flex flex-col sm:flex-row-reverse gap-2">
          <Button onClick={handleDonate} className="w-full">
            Donate {amount ? `GHS ${amount}` : "Now"}
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
