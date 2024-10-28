import type { Metadata } from "next";

import { inter } from "./ui/fonts";
import appmeta from '@/app/data/appmeta';

import "@/app/globals.css"

export const metadata: Metadata = {
  title: appmeta.title,
  description: appmeta.description,
  authors: [ appmeta.author ],
  keywords: appmeta.keywords,
  icons: "/favicon.ico"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-slate-100 dark:bg-slate-900 fixed top-0 left-0 h-full w-full antialiased overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
