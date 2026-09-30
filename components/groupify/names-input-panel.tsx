import type { ReactNode, RefObject } from "react";
import { RiTeamLine } from "@remixicon/react";

interface NamesInputPanelProps {
  names: string;
  onNamesChange: (value: string) => void;
  onClear: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Extra controls in the header, e.g. recent groupings. */
  headerExtra?: ReactNode;
  /** Fill the box with sample names so a first-time visitor can see the result straight away. */
  onExample?: () => void;
}

export function NamesInputPanel({
  names,
  onNamesChange,
  onClear,
  textareaRef,
  headerExtra,
  onExample,
}: NamesInputPanelProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <label
          htmlFor="names-input"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Names - one per line
        </label>
        <div className="flex items-center gap-2">
          {headerExtra}
          {names && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground/80 transition-colors hover:text-destructive"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          id="names-input"
          ref={textareaRef}
          value={names}
          onChange={(event) => onNamesChange(event.target.value)}
          placeholder=""
          rows={14}
          className="w-full resize-none rounded-2xl border border-border/60 bg-card/60 px-5 py-4 font-dm text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 backdrop-blur-sm shadow-md"
        />
        
        {!names && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60">
            <RiTeamLine className="mb-4 size-12 opacity-50" strokeWidth={1.5} />
            <p className="text-sm font-medium mb-3">Paste your list</p>
            <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground/50 font-dm">
              <span className="animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>Michael Scott</span>
              <span className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>Jim Halpert</span>
              <span className="animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>Pam Beesly</span>
              <span className="animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>Dwight Schrute</span>
            </div>
          </div>
        )}
      </div>

      {!names && onExample && (
        <button
          type="button"
          onClick={onExample}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          No list handy? Try an example
        </button>
      )}

      <p className="text-xs text-muted-foreground/70">
        Tip: paste a column from Excel - each cell becomes a name automatically. Add{" "}
        <code className="rounded bg-muted/50 px-1 py-0.5">| tag</code> after a name (e.g.{" "}
        <code className="rounded bg-muted/50 px-1 py-0.5">Ama | Advanced</code>) to spread a
        group of people evenly.
      </p>
    </div>
  );
}
