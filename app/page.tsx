import { PageHeader } from "@/components/groupify/page-header";
import { Footer } from "@/components/groupify/footer";
import { QuickToolLoader } from "@/components/groupify/quick-tool-loader";

export default function Page() {
  return (
    <div className="mesh-bg relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-8">
        <PageHeader />

        <section className="mb-8 space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Make fair groups in seconds
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Paste a list, pick a group size and go. Keep friends together, keep others apart, mix skill levels evenly,
            then download the result or share it with everyone.
          </p>
        </section>

        <QuickToolLoader />
        <Footer />
      </div>
    </div>
  );
}
