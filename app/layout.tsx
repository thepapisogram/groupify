import type { Metadata } from "next";

import { inter } from "./ui/fonts";
import appmeta from '@/app/data/appmeta';

import "./globals.css";

export const metadata: Metadata = {
  title: appmeta.title,
  description: appmeta.description,
  authors: [ appmeta.author ],
  keywords: appmeta.keywords
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased h-screen w-screen`}
      >
        {children}
      </body>
    </html>
  );
}
