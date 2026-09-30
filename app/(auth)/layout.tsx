import type { Metadata } from "next";

// Sign-in and sign-up pages are useful to people, not to search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
