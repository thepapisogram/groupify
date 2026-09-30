import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "@/components/groupify/footer";
import { PageHeader } from "@/components/groupify/page-header";
import {
  RiFileTextLine,
  RiTeamLine,
  RiScales3Line,
  RiEditLine,
  RiShareLine,
  RiDownloadLine,
  RiDatabase2Line,
  RiUserAddLine,
  RiShieldCheckLine,
} from "@remixicon/react";

export const metadata = {
  title: "Documentation",
  description:
    "How to use Groupify: make balanced groups, set rules, build sign-up forms, publish groups and share the results.",
  alternates: { canonical: "/documentation" },
};

const SECTIONS = [
  { id: "generating", label: "Making groups" },
  { id: "rules", label: "Rules and balancing" },
  { id: "editing", label: "Editing and saving" },
  { id: "forms", label: "Forms" },
  { id: "access", label: "Accounts and access" },
  { id: "exporting", label: "Exporting and printing" },
  { id: "privacy", label: "Privacy" },
  { id: "faq", label: "Questions" },
];

function Section({
  id,
  icon,
  tint,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  tint: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-lg ${tint}`}>{icon}</div>
        <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
      <h3 className="mb-2 font-medium text-foreground">{title}</h3>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs text-foreground">{children}</code>
);

export default function DocumentationPage() {
  return (
    <div className="mesh-bg relative min-h-dvh bg-background text-foreground">
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 sm:py-12">
        <PageHeader />

        <header className="mb-12 space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <RiFileTextLine className="size-3.5" aria-hidden="true" />
            Guide
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Groupify <span className="text-primary">Documentation</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Make balanced groups, collect names with a form, and share the result.
          </p>
        </header>

        <nav aria-label="On this page" className="mb-14 rounded-2xl border border-border/50 bg-card/40 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">On this page</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-16">
          <Section
            id="generating"
            title="Making groups"
            tint="bg-primary/10 text-primary"
            icon={<RiTeamLine className="size-5" aria-hidden="true" />}
          >
            <p className="text-muted-foreground">
              Take any list of names and split it into groups in a few seconds. Everything happens in your browser, so
              nothing you paste is sent anywhere.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="1. Enter names">
                <p>
                  Paste one name per line. Pasting a column from Excel or Google Sheets works too. No list handy? Use{" "}
                  <strong>Try an example</strong>.
                </p>
              </Card>
              <Card title="2. Choose the size">
                <p>
                  Set <strong>Members per group</strong> (for example 4) or switch with the arrows to{" "}
                  <strong>Number of groups</strong> (for example exactly 5). The other value updates for you.
                </p>
              </Card>
              <Card title="3. Decide what to do with extras">
                <p>
                  If the list doesn&apos;t divide evenly, <strong>Distribute evenly</strong> spreads the extra people
                  across the groups (10 people in groups of 3 gives 4, 3 and 3). <strong>New smaller group</strong> puts
                  them in a group of their own (3, 3, 3 and 1). Nobody is ever left out.
                </p>
              </Card>
              <Card title="4. Generate and reshuffle">
                <p>
                  Press <strong>Generate Groups</strong>. Don&apos;t like the arrangement? <strong>Reshuffle</strong>{" "}
                  makes a new one, and <strong>Undo</strong> brings the previous one back.
                </p>
              </Card>
            </div>
          </Section>

          <Section
            id="rules"
            title="Rules and balancing"
            tint="bg-emerald-500/10 text-emerald-500"
            icon={<RiScales3Line className="size-5" aria-hidden="true" />}
          >
            <p className="text-muted-foreground">
              Purely random groups aren&apos;t always fair. Rules let you shape the result, and they are applied every
              time you generate or reshuffle.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Keep together">
                <p>
                  Pick two or more people who must end up in the same group, such as a student who needs to sit with a
                  helper.
                </p>
              </Card>
              <Card title="Keep apart">
                <p>Pick people who must land in different groups, such as two who distract each other.</p>
              </Card>
              <Card title="Spread evenly by a tag">
                <p>
                  Add a tag after a bar, for example <Code>Ama Mensah | Advanced</Code>. Then choose{" "}
                  <strong>Spread evenly by</strong> so each group gets a fair share of Advanced, Beginner and so on. Use
                  it for skill level, class, year group or anything else.
                </p>
              </Card>
              <Card title="If a rule can&apos;t be met">
                <p>
                  Groupify still makes the groups and tells you which rule it couldn&apos;t satisfy, for example when
                  you ask to keep four people apart but only make three groups. Try fewer rules or more groups.
                </p>
              </Card>
            </div>
          </Section>

          <Section
            id="editing"
            title="Editing and saving"
            tint="bg-blue-500/10 text-blue-500"
            icon={<RiEditLine className="size-5" aria-hidden="true" />}
          >
            <ul className="ml-6 list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Rename a group</strong> by clicking its name.
              </li>
              <li>
                <strong className="text-foreground">Move someone</strong> with the arrows beside their name and pick the
                group they should go to.
              </li>
              <li>
                <strong className="text-foreground">Undo</strong> reverses your last changes, including a reshuffle.
              </li>
              <li>
                <strong className="text-foreground">Remembered on this device.</strong> Your list and settings are kept
                so you can pick up where you left off, and <strong>Recent</strong> lists your last eight groupings.
                Clear them any time from the Recent menu.
              </li>
            </ul>
          </Section>

          <Section
            id="forms"
            title="Forms"
            tint="bg-purple-500/10 text-purple-500"
            icon={<RiDatabase2Line className="size-5" aria-hidden="true" />}
          >
            <p className="text-muted-foreground">
              Need people to give you their details first? Create a form, share the link, and turn the responses into
              groups. Anyone can respond without an account.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Building a form">
                <p>
                  Choose <Link href="/forms/new" className="font-medium text-primary hover:underline">Create a form</Link>{" "}
                  in the header. Start from a template (class project, hackathon, sports teams, breakout sessions) or
                  from scratch, then add short answers, numbers, dropdowns, single choice or checkboxes.
                </p>
              </Card>
              <Card title="The primary identifier">
                <p>
                  The starred field, usually the name, is what appears in your group lists. Choice fields such as skill
                  level can be used to spread people evenly.
                </p>
              </Card>
              <Card title="Collecting responses">
                <p>
                  Share the public link. Responses appear in the dashboard, where you can search, sort by any column,
                  export, delete, and close the form when you have enough.
                </p>
              </Card>
              <Card title="Publishing groups">
                <p>
                  After generating groups, choose <strong>Publish</strong> so respondents can look up their group on a
                  page you share. It shows group names and each person&apos;s primary field only, and you can update or
                  unpublish it whenever you like.
                </p>
              </Card>
              <Card title="Reusing a form">
                <p>
                  <strong>Duplicate</strong> copies a form&apos;s questions into a fresh form, without responses, so
                  you can run it again next term.
                </p>
              </Card>
              <Card title="Editing later">
                <p>
                  You can change questions after people have responded. Existing answers are kept, so removing an
                  option won&apos;t delete anyone&apos;s response.
                </p>
              </Card>
            </div>
          </Section>

          <Section
            id="access"
            title="Accounts and access"
            tint="bg-amber-500/10 text-amber-500"
            icon={<RiUserAddLine className="size-5" aria-hidden="true" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Without an account">
                <p>
                  A form you create while signed out is managed through its <strong>admin link</strong>. Anyone who has
                  that link can manage the form, and it can&apos;t be recovered if you lose it, so keep it safe.
                </p>
              </Card>
              <Card title="Save it to an account">
                <p>
                  Open the admin link while signed in and choose <strong>Save to my account</strong>. The form then
                  lives under <strong>My Forms</strong> on any device and no longer depends on the link.
                </p>
              </Card>
              <Card title="Inviting collaborators">
                <p>
                  Owners can invite people from <strong>Form Options &gt; Manage Collaborators</strong>. The invitee must
                  already have a Groupify account and accepts by email. Invitations expire after 7 days.
                </p>
              </Card>
              <Card title="Confirming your email">
                <p>
                  If you sign up with an email and password, we email you a link to confirm the address. Until you do,
                  invitations and forms shared with you won&apos;t work, because anyone could otherwise sign up with your
                  address. Forms you own are unaffected, and Google sign-in counts as confirmed. Use{" "}
                  <strong>Resend email</strong> in the banner if the link expired (they last 24 hours).
                </p>
              </Card>
              <Card title="What collaborators can do">
                <p>
                  Collaborators can view and delete responses, generate and publish groups, export, edit the form and
                  open or close it. Only the owner can delete the form, replace its link, or invite and remove
                  collaborators.
                </p>
              </Card>
            </div>
          </Section>

          <Section
            id="exporting"
            title="Exporting and printing"
            tint="bg-teal-500/10 text-teal-500"
            icon={<RiDownloadLine className="size-5" aria-hidden="true" />}
          >
            <ul className="ml-6 list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Copy as text</strong> puts a numbered list on your clipboard, ready
                for an email or chat.
              </li>
              <li>
                <strong className="text-foreground">Excel (.xlsx)</strong> gives you each group with its members. For
                forms it includes the answers you collected.
              </li>
              <li>
                <strong className="text-foreground">Word (.docx)</strong> makes a clean, printable document.
              </li>
              <li>
                <strong className="text-foreground">Print</strong> prints just the groups, in black on white, with each
                group kept in one piece.
              </li>
              <li>
                <strong className="text-foreground">Responses</strong> can be exported separately from the form
                dashboard, choosing which columns to include and filtering rows by choice answers.
              </li>
            </ul>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RiShareLine className="size-4" aria-hidden="true" />
              To let everyone see their group without sending files, publish it from a form.
            </p>
          </Section>

          <Section
            id="privacy"
            title="Privacy"
            tint="bg-rose-500/10 text-rose-500"
            icon={<RiShieldCheckLine className="size-5" aria-hidden="true" />}
          >
            <ul className="ml-6 list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">The quick tool stays on your device.</strong> Names you paste are
                grouped in your browser and are never sent to our servers.
              </li>
              <li>
                <strong className="text-foreground">Form responses are private to you.</strong> Only the owner (or
                whoever holds the admin link) and invited collaborators can see them.
              </li>
              <li>
                <strong className="text-foreground">Published groups are public to anyone with the link.</strong> They
                show names only. Publish only when that is fine for everyone listed.
              </li>
              <li>
                <strong className="text-foreground">Deleting a form removes its responses</strong> and any published
                groups.
              </li>
            </ul>
          </Section>

          <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-8 space-y-6">
            <h2 id="faq-heading" className="border-b border-border/50 pb-4 text-2xl font-semibold tracking-tight">
              Questions
            </h2>
            <dl className="space-y-6">
              <div>
                <dt className="text-lg font-medium text-foreground">How many names can I group?</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  Thousands work instantly. Rules and balancing take a little longer on very large lists, and grouping
                  runs in the background so the page stays responsive.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-medium text-foreground">Why did two people I wanted apart end up together?</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  Usually the rules can&apos;t all be satisfied at once, for example too many people to separate for the
                  number of groups. Groupify shows a note above the results when that happens.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-medium text-foreground">Is there a limit on form responses?</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  Each form accepts up to 10,000 responses. Public forms also limit how quickly one network can submit,
                  which is generous enough for a whole class on one Wi-Fi connection.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-medium text-foreground">I lost my admin link. Can I get it back?</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  Not for a form made without an account, which is why we suggest saving forms to an account. If you
                  were signed in when you created it, open <strong>My Forms</strong>.
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <Footer />
      </div>
    </div>
  );
}
