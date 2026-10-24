import { RiCheckLine } from "@remixicon/react";

export type Step = "people" | "setup" | "results";

export const STEPS: { id: Step; label: string }[] = [
  { id: "people", label: "People" },
  { id: "setup", label: "Settings" },
  { id: "results", label: "Groups" },
];

interface StepperProps {
  current: Step;
  /** Steps that can be opened right now. */
  enabled: Record<Step, boolean>;
  /** Steps already finished, shown with a tick. */
  done: Record<Step, boolean>;
  onChange: (step: Step) => void;
  className?: string;
}

/** Three-step progress bar for small screens, where only one step shows at a time. */
export function Stepper({ current, enabled, done, onChange, className = "" }: StepperProps) {
  return (
    <nav aria-label="Steps" className={className}>
      <ol className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {STEPS.map((step, i) => {
          const active = current === step.id;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!enabled[step.id]}
                aria-current={active ? "step" : undefined}
                onClick={() => onChange(step.id)}
                className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-1 text-sm font-medium transition-all disabled:opacity-40 ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active ? "bg-primary-foreground/20" : done[step.id] ? "bg-primary/15 text-primary" : "bg-muted"
                  }`}
                >
                  {done[step.id] && !active ? <RiCheckLine className="size-3.5" /> : i + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
