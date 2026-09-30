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
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-8">
        <PageHeader />

        <section className="mb-8 space-y-2 text-center sm:text-left print:hidden">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {appMeta.app.tagline}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Paste a list, pick a group size and go. Keep friends together, keep others apart, mix skill levels evenly,
            then download the result or share it with everyone.
          </p>
        </section>

        <QuickToolLoader />
        <HomeInfo />
        <Footer />
      </div>
    </div>
  );
}
