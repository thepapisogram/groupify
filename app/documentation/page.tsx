import Link from "next/link";
import { Footer } from "@/components/groupify/footer";
import { PageHeader } from "@/components/groupify/page-header";
import {
  ChevronLeft,
  FileText,
  Users,
  Share2,
  Download,
  Settings,
  Database,
} from "lucide-react";

export const metadata = {
  title: "Documentation | Groupify",
  description:
    "Learn how to use Groupify to create groups, build custom forms, and manage your data.",
};

export default function DocumentationPage() {
  return (
    <div className="mesh-bg relative min-h-dvh bg-background text-foreground">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        {/* Navigation */}
        <PageHeader />

        {/* Header */}
        <header className="mb-16 space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <FileText className="size-3.5" />
            Official Guide
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Groupify <span className="text-primary">Documentation</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Everything you need to know about setting up groups, creating custom
            forms, and managing your data efficiently.
          </p>
        </header>

        {/* Content */}
        <div className="space-y-16">
          {/* Section: Quick Start */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Generating Groups
              </h2>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
              <p className="text-muted-foreground">
                The core feature of Groupify allows you to take a list of names
                and instantly organize them into balanced, randomized groups.
                Here&apos;s how it works:
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80">
                  <h3 className="mb-2 font-medium text-foreground">
                    1. Enter Names
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Paste your list of names into the input panel. Ensure each
                    name is separated by a new line. You can clear or update the
                    list at any time.
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80">
                  <h3 className="mb-2 font-medium text-foreground">
                    2. Configure Settings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use the sidebar to choose whether you want to group by{" "}
                    <strong>Group Size</strong> (e.g., 4 people per group) or{" "}
                    <strong>Group Count</strong> (e.g., exactly 5 groups).
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80">
                  <h3 className="mb-2 font-medium text-foreground">
                    3. Distribution Mode
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select between <strong>Best Fit</strong> (keeps groups
                    balanced) or <strong>Strict Mode</strong> (forces exact
                    sizes even if some names are left out).
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm transition-all hover:bg-card/80">
                  <h3 className="mb-2 font-medium text-foreground">
                    4. Generate & Shuffle
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Generate Groups&quot; to view results instantly.
                    Don&apos;t like the arrangement? Hit &quot;Reshuffle&quot;
                    to randomize them again.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Custom Forms */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Database className="size-5" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Custom Forms
              </h2>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
              <p className="text-muted-foreground">
                Need to collect names directly from participants? Create a
                custom form to gather submissions securely, and convert those
                submissions into groups.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
                  <h3 className="mb-3 flex items-center gap-2 font-medium text-foreground">
                    <Settings className="size-4 text-muted-foreground" />
                    Building a Form
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Navigate to{" "}
                    <strong>&quot;Create a custom form&quot;</strong> from the
                    footer. You can define a custom title, description, and
                    configure settings like limiting submissions per person.
                    Your form gets a unique shareable link.
                  </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
                  <h3 className="mb-3 flex items-center gap-2 font-medium text-foreground">
                    <Share2 className="size-4 text-muted-foreground" />
                    Sharing & Collecting
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Share your form URL with participants. They will see a
                    sleek, mobile-friendly interface to submit their
                    information. All responses are saved to your account in
                    real-time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Exporting */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Download className="size-5" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Exporting Data
              </h2>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
              <p className="text-muted-foreground">
                Once your groups are generated or form submissions are complete,
                you have several ways to extract your data:
              </p>
              <ul className="ml-6 list-disc space-y-2 text-sm text-muted-foreground marker:text-muted-foreground/50">
                <li>
                  <strong className="text-foreground">
                    Copy to Clipboard:
                  </strong>{" "}
                  Instantly copy a formatted text version of all groups to paste
                  into emails or messages.
                </li>
                <li>
                  <strong className="text-foreground">
                    Export to Excel (.xlsx):
                  </strong>{" "}
                  Download a structured spreadsheet with distinct columns for
                  each group, making offline management easy.
                </li>
                <li>
                  <strong className="text-foreground">
                    Export to Word (.docx):
                  </strong>{" "}
                  Generate a clean, printable document containing all your
                  groups beautifully formatted.
                </li>
              </ul>
            </div>
          </section>

          {/* Section: FAQ */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight border-b border-border/50 pb-4">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Is there a limit to how many names I can group?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The client-side grouping algorithm can easily handle thousands
                  of names instantly. However, for extreme datasets (10,000+),
                  you may notice a slight delay during grouping.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Are my form submissions private?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yes. Form submissions are tied strictly to your admin account.
                  Only you can view, export, or convert the collected names into
                  groups.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  What happens if the math doesn&apos;t add up?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  If you have 10 people and want groups of 3, the &quot;Best
                  Fit&quot; algorithm will create three groups of 3, and add the
                  10th person to one of those groups (making it a group of 4).
                  If strict sizes are required, you&apos;ll be notified of
                  remaining individuals.
                </p>
              </div>
            </div>
          </section>
        </div>


        <Footer />
      </div>
    </div>
  );
}
