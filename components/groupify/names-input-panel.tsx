import type { RefObject } from "react";
import { RiTeamLine } from "@remixicon/react";

interface NamesInputPanelProps {
  names: string;
  onNamesChange: (value: string) => void;
  onClear: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function NamesInputPanel({
  names,
  onNamesChange,
  onClear,
  textareaRef,
}: NamesInputPanelProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Names - one per line
        </label>
        {names && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground/60 transition-colors hover:text-destructive"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={names}
          onChange={(event) => onNamesChange(event.target.value)}
          placeholder=""
          rows={14}
          className="w-full resize-none rounded-2xl border border-border/60 bg-card/60 px-5 py-4 font-dm text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 backdrop-blur-sm shadow-md"
        />
        
        {!names && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40">
            <RiTeamLine className="mb-4 size-12 opacity-50" strokeWidth={1.5} />
            <p className="text-sm font-medium">No names yet</p>
            <p className="mt-1 text-xs text-center max-w-[200px]">
              Type here or paste a column directly from Excel
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/50">
        Tip: paste a column from Excel - each cell becomes a name automatically.
      </p>
    </div>
  );
}
