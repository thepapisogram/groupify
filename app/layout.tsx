import type { Metadata } from "next";
import { Roboto } from 'next/font/google'

import "./globals.css";
import appMeta from "../data/metadata";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({ weight: "400", subsets: ['latin'] });
export const metadata: Metadata = appMeta.main;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.className} antialiased fixed flex flex-col space-y-6 items-center justify-center top-0 w-svw h-svh bg-slate-900`}
      >
        {/* <Header /> */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
