import { Syne, DM_Sans } from "next/font/google"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/auth/session-provider"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import "./globals.css"
import appMeta from "../data/metadata"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  preload: true,
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  ...appMeta.main,
  // Makes relative Open Graph / canonical URLs absolute.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || appMeta.app.defaultUrl),
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07090f" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${syne.variable} ${dmSans.variable} font-dm antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <main id="main-content" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}