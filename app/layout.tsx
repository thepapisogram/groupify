import type { Metadata } from "next";
import { Roboto } from 'next/font/google'

import "./globals.css";
import appMeta from "../data/metadata";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({ weight: "400", subsets: ['latin'] });

export const metadata: Metadata = {
  ...appMeta.main
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.className} antialiased fixed flex flex-col md:space-y-6 items-center justify-center top-0 left-0 w-full h-full p-2 md:p-0 bg-slate-900 dark:bg-stone-950`}
      >
        {/* <Header /> */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
