import type { RefObject } from "react";
import { RiMagicLine } from "@remixicon/react";

interface NamesInputPanelProps {
  names: string;
  onNamesChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** People found in the box, and how many of them repeat an earlier name. */
  count: number;
  duplicates: number;
  onRemoveDuplicates?: () => void;
  /** Fill the box with sample names so a first-time visitor can see the result straight away. */
  onExample?: () => void;
}

export function NamesInputPanel({
  names,
  onNamesChange,
  textareaRef,
  count,
  duplicates,
  onRemoveDuplicates,
  onExample,
}: NamesInputPanelProps) {
  return (
    <div className="space-y-3">
      <label htmlFor="names-input" className="sr-only">
        Names, one per line
      </label>
      <div className="relative">
        <textarea
          id="names-input"
          ref={textareaRef}
          value={names}
          onChange={(event) => onNamesChange(event.target.value)}
          rows={12}
          spellCheck={false}
          className="block min-h-72 w-full resize-y rounded-2xl border border-input bg-card px-4 py-3.5 text-base leading-relaxed text-foreground outline-none transition-all focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm"
        />

        {!names && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">Paste or type names, one per line</p>
            <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground/50">
              <span>Ama Mensah</span>
              <span>Kofi Boateng</span>
              <span>Esi Owusu | Advanced</span>
            </div>
            {onExample && <span className="h-11" aria-hidden="true" />}
          </div>
        )}

        {!names && onExample && (
          <button
            type="button"
            onClick={onExample}
            className="absolute bottom-[22%] left-1/2 inline-flex min-h-10 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-accent"
          >
            <RiMagicLine className="size-4" />
            Try an example
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p aria-live="polite">
          <span className="font-semibold text-foreground">{count}</span> {count === 1 ? "person" : "people"}
          {duplicates > 0 && (
            <span className="text-amber-700 dark:text-amber-300">
              {" "}
              · {duplicates} repeated name{duplicates === 1 ? "" : "s"}
              {onRemoveDuplicates && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onRemoveDuplicates}
                    className="-my-2 inline-flex min-h-8 items-center rounded-md px-1.5 font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </>
              )}
            </span>
          )}
        </p>
        <p>
          Add <code className="rounded bg-muted px-1 py-0.5">| tag</code> after a name to spread tags evenly.
        </p>
      </div>
    </div>
  );
}
