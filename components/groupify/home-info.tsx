import Link from "next/link";
import { RiFileList3Line, RiScales3Line, RiShareForwardLine } from "@remixicon/react";

const STEPS = [
  {
    icon: RiFileList3Line,
    title: "Paste a list, or collect one",
    text: "Drop in names from a spreadsheet, or create a form and share the link so people add themselves. No account needed.",
  },
  {
    icon: RiScales3Line,
    title: "Set the rules",
    text: "Choose a group size or number of groups. Keep certain people together or apart, and spread skill levels evenly.",
  },
  {
    icon: RiShareForwardLine,
    title: "Share the result",
    text: "Adjust groups by hand, download Excel or Word, print them, or publish so everyone can find their group.",
  },
];

const FAQ = [
  {
    q: "Is Groupify free?",
    a: "Yes. Making groups and building forms is free. If it saves you time, you can support the project from the footer.",
  },
  {
    q: "Do I need an account?",
    a: "No. You only need one to keep your forms in one place, get them back on any device, or invite collaborators.",
  },
  {
    q: "Where does my list go?",
    a: "Names you paste into the quick tool are grouped in your browser and never sent to our servers. Forms you create are stored so people can respond to them.",
  },
  {
    q: "Can I get a different result?",
    a: "Press Reshuffle for a new arrangement, or Undo to go back. Your rules apply every time.",
  },
];

/** Plain, server-rendered explanation below the tool: helpful to new visitors and crawlable. */
export function HomeInfo() {
  return (
    <div className="mt-16 space-y-14 print:hidden">
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-2xl font-bold tracking-tight text-foreground">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          Need people to sign up first?{" "}
          <Link href="/forms/new" className="font-medium text-primary underline-offset-4 hover:underline">
            Create a form
          </Link>{" "}
          or read the{" "}
          <Link href="/documentation" className="font-medium text-primary underline-offset-4 hover:underline">
            documentation
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold tracking-tight text-foreground">
          Questions
        </h2>
        <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-base font-semibold text-foreground">{q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
