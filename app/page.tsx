import type { Metadata } from "next";
import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { HomeInfo } from "@/components/groupify/home-info";
import { QuickToolLoader } from "@/components/groupify/quick-tool-loader";
import appMeta from "@/data/metadata";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Static, first-party content, so it is safe to inline.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: appMeta.app.name,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  description: appMeta.app.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: appMeta.author.name, url: appMeta.author.url },
};

export default function Page() {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-4 pb-action-bar sm:px-6 sm:pt-8 lg:pb-12">
        <PageHeader />

        <section className="mb-6 max-w-3xl space-y-2 sm:mb-8 print:hidden">
          <h1 className="font-syne text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {appMeta.app.tagline}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-lg">
            Paste a list or upload a spreadsheet, choose a group size, and download tidy groups with the columns you
            need. Keep people together or apart and mix skill levels evenly.
          </p>
        </section>

        <QuickToolLoader />
        <HomeInfo />
        <Footer />
      </div>
    </div>
  );
}
