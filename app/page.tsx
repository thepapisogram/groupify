import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { QuickToolLoader } from "@/components/groupify/quick-tool-loader";

export default function Page() {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-8">
        <PageHeader />
        <QuickToolLoader />
        <Footer />
      </div>
    </div>
  );
}
